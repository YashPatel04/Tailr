import json
import logging
import re
import time
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db import get_db
from app.models.models import ChatMessage, LLMProvider, Patch, Session, SessionDocument
from app.models.resume_schema import CoverLetterContent, ResumeContent
from app.services.editing.content_ops import ContentApplier, ops_from_list
from app.services.llm.factory import get_adapter
from app.services.llm.prompts import (
    build_cover_letter_edit_prompt,
    build_plan_mode_prompt,
    build_tailor_prompt_v3,
)
from app.services.research.summarizer import research_company

router = APIRouter(prefix="/api/sessions", tags=["tailor"])
logger = logging.getLogger(__name__)


class ChatMessageRequest(BaseModel):
    content: str
    role: str = "user"
    doc_type: str = "resume"
    mode: str = "edit"
    tailoring_mode: str | None = None
    proposal_context: str | None = None
    llm_provider_id: str | None = None
    model: str | None = None
    request_id: str | None = None


_recent_request_ids: dict[str, float] = {}
DEDUP_WINDOW_SECONDS = 60


def _is_duplicate(request_id: str | None) -> bool:
    if not request_id:
        return False
    now = time.time()
    expired = [k for k, v in _recent_request_ids.items() if now - v > DEDUP_WINDOW_SECONDS]
    for k in expired:
        del _recent_request_ids[k]
    if request_id in _recent_request_ids:
        return True
    _recent_request_ids[request_id] = now
    return False


async def _emit(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


class PatchParseError(Exception):
    pass


def _extract_content_ops(text: str) -> tuple[list[dict], str, str]:
    """Extract operations, explanation, and reasoning from LLM response.

    Returns (ops_list, explanation, reasoning).
    """
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise PatchParseError(f"Failed to parse JSON: {e}") from e
    if isinstance(data, list):
        return data, "", ""
    if isinstance(data, dict) and "operations" in data:
        explanation = data.get("explanation", "")
        reasoning = data.get("reasoning", "")
        return data["operations"], explanation, reasoning
    raise PatchParseError(
        "Response must be a JSON array of operations or object with 'operations' key"
    )


@router.post("/{session_id}/chat")
async def chat_stream(
    session_id: str,
    body: ChatMessageRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if _is_duplicate(body.request_id):
        raise HTTPException(status_code=409, detail="Duplicate request")

    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = ChatMessage(
        id=uuid4(),
        session_id=session.id,
        role="user",
        content=body.content,
        doc_type=body.doc_type,
        metadata_json={"mode": body.mode},
    )
    db.add(user_msg)
    await db.commit()
    logger.info("[chat] session=%s user_msg saved mode=%s", session_id, body.mode)

    is_plan_mode = body.mode == "plan"
    if body.tailoring_mode and body.tailoring_mode != session.tailoring_mode:
        session.tailoring_mode = body.tailoring_mode
        await db.commit()

    provider_id = body.llm_provider_id
    model_name = body.model

    if (
        (not provider_id or not model_name)
        and session.current_provider_id
        and session.current_model
    ):
        provider_id = provider_id or str(session.current_provider_id)
        model_name = model_name or session.current_model

    if not provider_id or not model_name:
        last_msg_result = await db.execute(
            select(ChatMessage)
            .where(
                ChatMessage.session_id == session.id,
                ChatMessage.role == "assistant",
                ChatMessage.llm_provider_id.isnot(None),
            )
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        last_msg = last_msg_result.scalar_one_or_none()
        if last_msg:
            provider_id = provider_id or str(last_msg.llm_provider_id)
            model_name = model_name or last_msg.model

    if not provider_id:
        p_result = await db.execute(
            select(LLMProvider).where(LLMProvider.user_id == current_user.id)
        )
        any_provider = p_result.scalars().first()
        if any_provider:
            provider_id = str(any_provider.id)

    if not provider_id or not model_name:
        logger.warning("[chat] session=%s no LLM provider or model specified", session_id)
        raise HTTPException(
            status_code=422, detail="Select a model from the dropdown before sending."
        )

    p_result = await db.execute(select(LLMProvider).where(LLMProvider.id == provider_id))
    provider = p_result.scalar_one_or_none()

    adapter = get_adapter(
        provider,
        model=model_name,
        temperature=current_user.default_temperature,
        max_tokens=current_user.default_max_tokens,
        top_p=current_user.default_top_p,
    )
    logger.info(
        "[chat] session=%s provider=%s model=%s",
        session_id,
        provider.provider_type,
        model_name,
    )

    doc_result = await db.execute(
        select(SessionDocument)
        .where(
            SessionDocument.session_id == session.id,
            SessionDocument.doc_type == body.doc_type,
        )
        .order_by(SessionDocument.version.desc())
        .limit(1)
    )
    current_doc = doc_result.scalar_one_or_none()

    is_cover_letter = body.doc_type == "cover_letter"

    if not current_doc and not is_cover_letter:
        logger.warning(
            "[chat] session=%s no document found for doc_type=%s", session_id, body.doc_type
        )
        raise HTTPException(status_code=422, detail="No document found")

    if not is_cover_letter:
        content_dict = current_doc.content_json or {"basics": {"name": ""}, "sections": []}
        content = ResumeContent.model_validate(content_dict)
        logger.info(
            "[chat] session=%s document loaded, sections=%d", session_id, len(content.sections)
        )

    async def event_stream():
        try:
            # Cover letter: no document exists — tell user to generate first
            if is_cover_letter and not current_doc:
                assistant_msg = ChatMessage(
                    id=uuid4(),
                    session_id=session.id,
                    role="assistant",
                    content=(
                        "Generate a cover letter first before editing. Click the button in the "
                        "canvas or say 'write a cover letter'."
                    ),
                    doc_type="cover_letter",
                    llm_provider_id=provider_id,
                    model=model_name,
                )
                db.add(assistant_msg)
                await db.commit()
                yield await _emit("done", {"message": "No cover letter yet"})
                return

            # Research (shared for resume and cover letter)
            yield await _emit("researching", {"message": f"Researching {session.company_name}..."})
            if not session.research_summary_json:
                logger.info(
                    "[chat] session=%s researching company %s", session_id, session.company_name
                )
                research = await research_company(session.company_name)
                session.research_summary_json = research
                await db.commit()
                logger.info("[chat] session=%s research done", session_id)
            else:
                research = session.research_summary_json
                logger.info("[chat] session=%s using cached research", session_id)

            yield await _emit("research_done", {"summary": research})

            yield await _emit("thinking", {"message": "Thinking..."})

            # Cover letter branch
            if is_cover_letter:
                cl_content_dict = current_doc.content_json
                if "paragraphs" not in cl_content_dict:
                    cl_content = CoverLetterContent.from_legacy_text(
                        cl_content_dict.get("text", "")
                    )
                else:
                    cl_content = CoverLetterContent.model_validate(cl_content_dict)

                if is_plan_mode:
                    plan_messages = [
                        {
                            "role": "system",
                            "content": (
                                "You are a cover letter advisor. "
                                "Help the user improve their cover letter. "
                                "Give conversational advice — do NOT return "
                                "structured JSON operations. "
                                "Always format your replies in markdown "
                                "for readability. Use: "
                                "**bold** for emphasis, "
                                "## headers for structure, "
                                "- bullet lists for suggestions, "
                                "and `inline code` for field names. "
                                "Do NOT wrap your entire response "
                                "in code blocks. "
                                f"Company: {session.company_name}. "
                                f"Role: {session.role_title}."
                            ),
                        }
                    ]
                    plan_messages.append({"role": "user", "content": body.content})
                    response = await adapter.chat(plan_messages, stream=False)
                    raw_content = response.content if hasattr(response, "content") else ""

                    assistant_msg = ChatMessage(
                        id=uuid4(),
                        session_id=session.id,
                        role="assistant",
                        content=raw_content,
                        doc_type="cover_letter",
                        metadata_json={"mode": "plan"},
                        llm_provider_id=provider_id,
                        model=model_name,
                    )
                    db.add(assistant_msg)
                    await db.commit()
                    yield await _emit(
                        "proposal",
                        {
                            "message": raw_content,
                            "operations": [],
                            "diff": None,
                            "patch_summary": "",
                            "mode": "plan",
                        },
                    )
                    return

                # Cover letter edit mode
                cl_messages = build_cover_letter_edit_prompt(cl_content, session, research)
                cl_messages.append({"role": "user", "content": body.content})
                if body.proposal_context:
                    cl_messages.append({"role": "user", "content": body.proposal_context})

                yield await _emit("writing", {"message": "Editing cover letter..."})

                response = await adapter.chat(cl_messages, stream=False)
                raw_content = response.content if hasattr(response, "content") else ""

                try:
                    ops_list, explanation, reasoning = _extract_content_ops(raw_content)
                except PatchParseError as e:
                    logger.error("[chat] session=%s cover letter parse error: %s", session_id, e)
                    yield await _emit("error", {"message": f"Invalid operations: {str(e)}"})
                    return

                try:
                    cl_ops = ops_from_list(ops_list)
                    applier = ContentApplier()
                    new_cl_content = applier.apply_cover_letter(cl_content, cl_ops)
                except Exception as e:
                    logger.warning(
                        "[chat] session=%s cover letter ops failed, retrying: %s", session_id, e
                    )
                    retry_response = await adapter.chat(
                        [
                            *cl_messages,
                            {"role": "assistant", "content": raw_content},
                            {
                                "role": "user",
                                "content": (
                                    f"Your operations had errors: {str(e)}. Please fix and return "
                                    "only valid JSON."
                                ),
                            },
                        ],
                        stream=False,
                    )
                    raw_content = (
                        retry_response.content if hasattr(retry_response, "content") else ""
                    )
                    try:
                        ops_list, explanation, reasoning = _extract_content_ops(raw_content)
                        cl_ops = ops_from_list(ops_list)
                        new_cl_content = applier.apply_cover_letter(cl_content, cl_ops)
                    except Exception as e2:
                        logger.error(
                            "[chat] session=%s cover letter retry failed: %s", session_id, e2
                        )
                        yield await _emit(
                            "error", {"message": f"Operations retry failed: {str(e2)}"}
                        )
                        return

                new_doc = SessionDocument(
                    id=uuid4(),
                    session_id=session.id,
                    doc_type="cover_letter",
                    version=(current_doc.version or 0) + 1,
                    content_json=new_cl_content.model_dump(mode="json"),
                    parent_doc_id=current_doc.id,
                )
                db.add(new_doc)
                await db.flush()

                explanation_text = (
                    explanation or f"Updated {len(ops_list)} section(s) of your cover letter."
                )
                assistant_msg = ChatMessage(
                    id=uuid4(),
                    session_id=session.id,
                    role="assistant",
                    content=explanation_text,
                    doc_type="cover_letter",
                    metadata_json={"operations_count": len(ops_list)},
                    llm_provider_id=provider_id,
                    model=model_name,
                )
                db.add(assistant_msg)
                await db.commit()

                yield await _emit("done", {"document_id": str(new_doc.id)})
                return

            # Resume branch (existing logic)
            if is_plan_mode:
                messages = build_plan_mode_prompt(
                    session, content, research, current_user.career_context or ""
                )
            else:
                messages = build_tailor_prompt_v3(
                    session, content, research, current_user.career_context or ""
                )

            messages.append({"role": "user", "content": body.content})

            if body.proposal_context:
                messages.append({"role": "user", "content": body.proposal_context})

            yield await _emit("writing", {"message": "Writing changes..."})

            logger.info("[chat] session=%s calling LLM mode=%s...", session_id, body.mode)
            response = await adapter.chat(messages, stream=False)
            raw_content = response.content if hasattr(response, "content") else ""
            logger.info("[chat] session=%s LLM response length=%d", session_id, len(raw_content))

            if is_plan_mode:
                assistant_msg = ChatMessage(
                    id=uuid4(),
                    session_id=session.id,
                    role="assistant",
                    content=raw_content,
                    doc_type=body.doc_type,
                    metadata_json={"mode": "plan"},
                    llm_provider_id=provider_id,
                    model=model_name,
                )
                db.add(assistant_msg)
                await db.commit()
                logger.info("[chat] session=%s plan mode response saved", session_id)
                yield await _emit(
                    "proposal",
                    {
                        "message": raw_content,
                        "operations": [],
                        "diff": None,
                        "patch_summary": "",
                        "mode": "plan",
                    },
                )
                return

            try:
                ops_list, explanation, reasoning = _extract_content_ops(raw_content)
                logger.info("[chat] session=%s extracted %d operations", session_id, len(ops_list))
            except PatchParseError as e:
                logger.error("[chat] session=%s patch parse error: %s", session_id, e)
                yield await _emit("error", {"message": f"Invalid operations: {str(e)}"})
                return

            try:
                content_ops = ops_from_list(ops_list)
                applier = ContentApplier()
                applier.apply(content, content_ops)
            except Exception as e:
                logger.warning("[chat] session=%s operations failed, retrying: %s", session_id, e)
                retry_response = await adapter.chat(
                    [
                        *messages,
                        {"role": "assistant", "content": raw_content},
                        {
                            "role": "user",
                            "content": (
                                f"Your operations had errors: {str(e)}. Please fix and return only "
                                "valid JSON."
                            ),
                        },
                    ],
                    stream=False,
                )
                raw_content = retry_response.content if hasattr(retry_response, "content") else ""
                try:
                    ops_list, explanation, reasoning = _extract_content_ops(raw_content)
                    content_ops = ops_from_list(ops_list)
                    logger.info(
                        "[chat] session=%s retry succeeded, %d operations",
                        session_id,
                        len(ops_list),
                    )
                except Exception as e:
                    logger.error("[chat] session=%s retry also failed: %s", session_id, e)
                    yield await _emit("error", {"message": f"Operations retry failed: {str(e)}"})
                    return

            ops_for_storage = [
                op if isinstance(op, dict) else op.model_dump() for op in content_ops
            ]

            session.pending_operations_json = {"ops": ops_list, "content_ops": ops_for_storage}
            await db.commit()

            op_count = len(ops_list)
            logger.info("[chat] session=%s proposal ready, %d operations", session_id, op_count)
            yield await _emit(
                "proposal",
                {
                    "message": explanation
                    or f"I'd like to make {op_count} changes to your resume. Review them below.",
                    "operations": ops_list,
                    "diff": None,
                    "patch_summary": f"{op_count} changes proposed",
                    "explanation": explanation,
                    "reasoning": reasoning,
                    "mode": "edit",
                },
            )

        except Exception as e:
            logger.error("[chat] session=%s unhandled error: %s", session_id, e, exc_info=True)
            yield await _emit("error", {"message": str(e)})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/{session_id}/proposal/accept")
async def accept_proposal(
    session_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    operations: list[dict] = Body(..., embed=False),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not operations:
        raise HTTPException(status_code=400, detail="No operations to apply")

    ops_list = operations

    doc_result = await db.execute(
        select(SessionDocument)
        .where(SessionDocument.session_id == session.id, SessionDocument.doc_type == "resume")
        .order_by(SessionDocument.version.desc())
        .limit(1)
    )
    current_doc = doc_result.scalar_one_or_none()
    if not current_doc:
        raise HTTPException(status_code=404, detail="No document found")

    content = ResumeContent.model_validate(
        current_doc.content_json or {"basics": {"name": ""}, "sections": []}
    )

    content_ops = ops_from_list(ops_list)
    applier = ContentApplier()
    new_content = applier.apply(content, content_ops)

    stored_model = new_content.model_dump(mode="json")

    new_doc = SessionDocument(
        id=uuid4(),
        session_id=session.id,
        doc_type="resume",
        version=(current_doc.version or 0) + 1,
        content_json=stored_model,
        parent_doc_id=current_doc.id,
    )
    db.add(new_doc)
    await db.flush()

    patch_record = Patch(
        id=uuid4(),
        session_id=session.id,
        source_doc_id=current_doc.id,
        target_doc_id=new_doc.id,
        operations_json=ops_list,
        user_message=f"[PROPOSAL ACCEPTED] {len(ops_list)} changes",
        applied=True,
    )
    db.add(patch_record)
    await db.flush()

    assistant_msg = ChatMessage(
        id=uuid4(),
        session_id=session.id,
        role="assistant",
        content=f"Changes applied ({len(ops_list)} operations)",
        doc_type="resume",
        metadata_json={"patch_id": str(patch_record.id)},
        patch_id=patch_record.id,
    )
    db.add(assistant_msg)

    await db.commit()

    return {
        "document_id": str(new_doc.id),
        "version": new_doc.version,
        "patch_id": str(patch_record.id),
        "changes_applied": len(ops_list),
    }


@router.post("/{session_id}/proposal/decline")
async def decline_proposal(
    session_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    assistant_msg = ChatMessage(
        id=uuid4(),
        session_id=session.id,
        role="assistant",
        content="Proposal declined. How can I help?",
        doc_type="resume",
    )
    db.add(assistant_msg)
    await db.commit()

    return {"status": "declined"}
