import json
import re
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db import get_db
from app.models.models import ChatMessage, LLMProvider, Patch, Session, SessionDocument
from app.models.resume_schema import ResumeContent
from app.services.editing.content_ops import ContentApplier, ContentDiffer, ops_from_list
from app.services.rendering.renderer import ResumeRenderer
from app.services.llm.factory import get_adapter
from app.services.llm.prompts import build_tailor_prompt_v3
from app.services.research.summarizer import research_company

router = APIRouter(prefix="/api/sessions", tags=["tailor"])


class ChatMessageRequest(BaseModel):
    content: str
    role: str = "user"
    doc_type: str = "resume"


async def _emit(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


class PatchParseError(Exception):
    pass


def _extract_content_ops(text: str) -> list[dict]:
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    try:
        data = json.loads(cleaned)
    except json.JSONDecodeError as e:
        raise PatchParseError(f"Failed to parse JSON: {e}")
    if isinstance(data, list):
        return data
    if isinstance(data, dict) and "operations" in data:
        return data["operations"]
    raise PatchParseError("Response must be a JSON array of operations or object with 'operations' key")


@router.post("/{session_id}/chat")
async def chat_stream(
    session_id: str,
    body: ChatMessageRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user_msg = ChatMessage(
        id=uuid4(), session_id=session.id, role="user", content=body.content
    )
    db.add(user_msg)
    await db.commit()

    async def event_stream():
        try:
            yield await _emit("researching", {"message": f"Researching {session.company_name}..."})
            if not session.research_summary_json:
                research = await research_company(session.company_name)
                session.research_summary_json = research
                await db.commit()
            else:
                research = session.research_summary_json

            yield await _emit("research_done", {"summary": research})

            yield await _emit("thinking", {"message": "Thinking..."})

            provider_id = session.llm_provider_id
            if not provider_id:
                p_result = await db.execute(
                    select(LLMProvider)
                    .where(LLMProvider.user_id == current_user.id, LLMProvider.is_default == True)
                )
                default_provider = p_result.scalar_one_or_none()
                if not default_provider:
                    p_result = await db.execute(
                        select(LLMProvider).where(LLMProvider.user_id == current_user.id)
                    )
                    default_provider = p_result.scalars().first()
                if default_provider:
                    provider_id = default_provider.id

            if not provider_id:
                yield await _emit("error", {"message": "No LLM provider configured"})
                return

            p_result = await db.execute(
                select(LLMProvider).where(LLMProvider.id == provider_id)
            )
            provider = p_result.scalar_one_or_none()

            doc_result = await db.execute(
                select(SessionDocument)
                .where(SessionDocument.session_id == session.id, SessionDocument.doc_type == body.doc_type)
                .order_by(SessionDocument.version.desc())
                .limit(1)
            )
            current_doc = doc_result.scalar_one_or_none()

            if not current_doc:
                yield await _emit("error", {"message": "No document found"})
                return

            content_dict = current_doc.content_json or {"basics": {"name": ""}, "sections": []}
            content = ResumeContent.model_validate(content_dict)

            messages = build_tailor_prompt_v3(session, content, research, current_user.career_context or "")
            adapter = get_adapter(provider)

            yield await _emit("writing", {"message": "Writing changes..."})

            response = await adapter.chat(messages, stream=False)
            raw_content = response.content if hasattr(response, "content") else ""

            try:
                ops_list = _extract_content_ops(raw_content)
            except PatchParseError as e:
                yield await _emit("error", {"message": f"Invalid operations: {str(e)}"})
                return

            try:
                content_ops = ops_from_list(ops_list)
                applier = ContentApplier()
                new_content = applier.apply(content, content_ops)
            except Exception as e:
                retry_response = await adapter.chat(
                    [
                        *messages,
                        {"role": "assistant", "content": raw_content},
                        {"role": "user", "content": f"Your operations had errors: {str(e)}. Please fix and return only valid JSON."},
                    ],
                    stream=False,
                )
                raw_content = retry_response.content if hasattr(retry_response, "content") else ""
                try:
                    ops_list = _extract_content_ops(raw_content)
                    content_ops = ops_from_list(ops_list)
                    new_content = applier.apply(content, content_ops)
                except Exception as e:
                    yield await _emit("error", {"message": f"Operations retry failed: {str(e)}"})
                    return

            differ = ContentDiffer()
            diff = differ.diff(content, new_content)

            ops_for_storage = [op if isinstance(op, dict) else op.model_dump() for op in content_ops]

            session.pending_operations_json = {"ops": ops_list, "content_ops": ops_for_storage}
            session.pending_diff_json = diff
            await db.commit()

            op_count = len(ops_list)
            yield await _emit("proposal", {
                "message": f"I'd like to make {op_count} changes to your resume. Review them below.",
                "operations": ops_list,
                "diff": diff,
                "patch_summary": f"{op_count} changes proposed",
            })

        except Exception as e:
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
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if not session.pending_operations_json:
        raise HTTPException(status_code=400, detail="No pending proposal to accept")

    pending = session.pending_operations_json
    ops_list = pending.get("ops", [])
    content_ops_data = pending.get("content_ops", [])

    doc_result = await db.execute(
        select(SessionDocument)
        .where(SessionDocument.session_id == session.id, SessionDocument.doc_type == "resume")
        .order_by(SessionDocument.version.desc())
        .limit(1)
    )
    current_doc = doc_result.scalar_one_or_none()
    if not current_doc:
        raise HTTPException(status_code=404, detail="No document found")

    content = ResumeContent.model_validate(current_doc.content_json or {"basics": {"name": ""}, "sections": []})

    content_ops = ops_from_list(ops_list)
    applier = ContentApplier()
    new_content = applier.apply(content, content_ops)

    renderer = ResumeRenderer()
    new_tex = renderer.render_tex(new_content)
    stored_model = new_content.model_dump(mode="json")
    legacy_model = current_doc.document_model_json

    new_doc = SessionDocument(
        id=uuid4(),
        session_id=session.id,
        doc_type="resume",
        version=(current_doc.version or 0) + 1,
        document_model_json=legacy_model,
        content_json=stored_model,
        tex_source=new_tex,
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
        metadata_json={"patch_id": str(patch_record.id)},
        patch_id=patch_record.id,
    )
    db.add(assistant_msg)

    session.pending_operations_json = None
    session.pending_diff_json = None
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

    op_count = len(session.pending_operations_json.get("ops", [])) if session.pending_operations_json else 0

    session.pending_operations_json = None
    session.pending_diff_json = None

    assistant_msg = ChatMessage(
        id=uuid4(),
        session_id=session.id,
        role="assistant",
        content=f"Proposal declined ({op_count} changes discarded). How can I help?",
    )
    db.add(assistant_msg)
    await db.commit()

    return {"status": "declined", "changes_discarded": op_count}
