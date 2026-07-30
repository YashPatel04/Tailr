import json
import logging
import re
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Body, Depends, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db import get_db
from app.models.models import ChatMessage, LLMProvider, MasterResume, Session, SessionDocument
from app.services.research.extractor import fetch_jd_text
from app.services.llm.factory import get_adapter
from app.services.llm.prompts import build_cover_letter_prompt

router = APIRouter(prefix="/api/sessions", tags=["sessions"])
master_router = APIRouter(prefix="/api/master-resume", tags=["master-resume"])
company_router = APIRouter(prefix="/api/companies", tags=["companies"])
tag_router = APIRouter(prefix="/api/tags", tags=["tags"])


class SessionCreate(BaseModel):
    company_name: str
    role_title: str
    job_description: str | None = None
    job_description_url: str | None = None
    tailoring_mode: str = "polish"
    llm_provider_id: str | None = None
    notes: str | None = None


class AnalyzeRequest(BaseModel):
    job_description: str | None = None
    job_description_url: str | None = None


EXTRACT_FIELDS_PROMPT = """\
Extract the company name and job title from this job description. \
Return ONLY a JSON object with keys "company_name" and "role_title". \
If you cannot determine either field, set its value to null.

Example response: {{"company_name": "Google", "role_title": "Product Manager"}}

Job Description:
{jd_text}"""


@router.post("/analyze")
async def analyze_jd(body: AnalyzeRequest, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if not body.job_description and not body.job_description_url:
        raise HTTPException(status_code=400, detail="Provide job_description or job_description_url")

    jd_text = body.job_description or ""
    source_url = body.job_description_url

    if body.job_description_url:
        try:
            jd_text = await fetch_jd_text(body.job_description_url)
        except Exception:
            return {
                "extracted": False,
                "question": "I couldn't access that URL. Could you paste the job description text instead?",
            }

    if not jd_text.strip():
        return {
            "extracted": False,
            "question": "The job description appears to be empty. Could you paste the text?",
        }

    p_result = await db.execute(
        select(LLMProvider).where(LLMProvider.user_id == current_user.id, LLMProvider.is_default == True)
    )
    provider = p_result.scalar_one_or_none()
    if not provider:
        p_result = await db.execute(select(LLMProvider).where(LLMProvider.user_id == current_user.id))
        provider = p_result.scalars().first()
    if not provider:
        raise HTTPException(status_code=400, detail="Configure an LLM provider first")

    adapter = get_adapter(provider)
    messages = [
        {"role": "system", "content": "You are a job description parser. Return only valid JSON."},
        {"role": "user", "content": EXTRACT_FIELDS_PROMPT.format(jd_text=jd_text[:5000])},
    ]
    response = await adapter.chat(messages, stream=False)
    raw = response.content if hasattr(response, "content") else ""

    import json as _json
    cleaned = raw.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)

    try:
        data = _json.loads(cleaned)
        company = data.get("company_name")
        role = data.get("role_title")
    except Exception:
        return {
            "extracted": False,
            "question": "I had trouble reading the job description. Could you tell me the company name and role title?",
        }

    if not company and not role:
        return {
            "extracted": False,
            "question": "I couldn't find the company name or role title in this posting. Could you provide them?",
        }

    return {
        "extracted": True,
        "company_name": company or "",
        "role_title": role or "",
        "source_url": source_url,
        "jd_text": jd_text[:500],
    }


class SessionUpdate(BaseModel):
    company_name: str | None = None
    role_title: str | None = None
    notes: str | None = None
    tags: list[str] | None = None
    llm_provider_id: str | None = None
    is_archived: bool | None = None


def _strip_latex(text: str) -> str:
    """Remove common LaTeX formatting commands from display text."""
    import re
    text = re.sub(r"^\\\\", "", text)
    text = re.sub(r"\\textbf\{([^{}]*)\}?", r"\1", text)
    text = re.sub(r"\\textit\{([^{}]*)\}?", r"\1", text)
    text = re.sub(r"\\underline\{([^{}]*)\}?", r"\1", text)
    text = re.sub(r"\\texttt\{([^{}]*)\}?", r"\1", text)
    text = re.sub(r"\\textsc\{([^{}]*)\}?", r"\1", text)
    text = re.sub(r"\\href\{[^{}]*\}\{([^{}]*)\}?", r"\1", text)
    text = re.sub(r"\\\$", "$", text)
    text = re.sub(r"\\&", "&", text)
    text = re.sub(r"\\%", "%", text)
    text = re.sub(r"\\#", "#", text)
    text = re.sub(r"\\_", "_", text)
    text = re.sub(r"\$\\sim\$", "~", text)
    text = re.sub(r"\\textellipsis|\\dots", "...", text)
    text = re.sub(r"\\hfill", "", text)
    text = re.sub(r"\\vspace\*?\{[^{}]*\}", "", text)
    text = re.sub(r"\\begin\{[^{}]*\}", "", text)
    text = re.sub(r"\\end\{[^{}]*\}?", "", text)
    text = re.sub(r"\\item", "", text)
    text = re.sub(r"\|\\\\", "", text)
    text = re.sub(r"\\\\\n?", " — ", text)
    text = text.strip().rstrip("}")
    text = text.strip().rstrip("—").strip()
    return text



def _session_to_dict(s: Session) -> dict:
    return {
        "id": str(s.id),
        "user_id": str(s.user_id),
        "master_resume_id": str(s.master_resume_id) if s.master_resume_id else None,
        "company_name": s.company_name,
        "role_title": s.role_title,
        "job_description": s.job_description,
        "tailoring_mode": s.tailoring_mode,
        "llm_provider_id": str(s.llm_provider_id) if s.llm_provider_id else None,
        "notes": s.notes,
        "research_summary_json": s.research_summary_json,
        "tags": s.tags or [],
        "is_archived": s.is_archived,
        "created_at": str(s.created_at),
        "updated_at": str(s.updated_at),
    }


@router.post("")
async def create_session(body: SessionCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MasterResume).where(MasterResume.user_id == current_user.id)
    )
    master = result.scalar_one_or_none()
    if not master:
        raise HTTPException(status_code=400, detail="Upload a master resume first")

    jd_text = body.job_description or ""
    if body.job_description_url:
        try:
            jd_text = await fetch_jd_text(body.job_description_url)
        except Exception:
            jd_text = body.job_description or ""

    if body.llm_provider_id:
        from app.models.models import LLMProvider
        prov_result = await db.execute(
            select(LLMProvider).where(
                LLMProvider.id == body.llm_provider_id,
                LLMProvider.user_id == current_user.id,
            )
        )
        if not prov_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Invalid LLM provider")

    session = Session(
        id=uuid4(),
        user_id=current_user.id,
        master_resume_id=master.id,
        company_name=body.company_name,
        role_title=body.role_title,
        job_description=jd_text,
        tailoring_mode=body.tailoring_mode,
        llm_provider_id=body.llm_provider_id,
        notes=body.notes,
    )
    db.add(session)
    await db.flush()

    initial_doc = SessionDocument(
        id=uuid4(),
        session_id=session.id,
        doc_type="resume",
        version=0,
        content_json=master.content_json,
        parent_doc_id=None,
    )
    db.add(initial_doc)
    await db.commit()
    await db.refresh(session)
    return _session_to_dict(session)


@router.get("")
async def list_sessions(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id)
        .order_by(Session.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_dict(s) for s in sessions]


@router.get("/grouped")
async def list_sessions_grouped(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id, Session.is_archived == False)
        .order_by(Session.updated_at.desc())
    )
    sessions = result.scalars().all()

    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday_start = today_start - timedelta(days=1)
    week_ago = today_start - timedelta(days=7)

    grouped = {"today": [], "yesterday": [], "previous_7_days": [], "older": []}

    for s in sessions:
        updated = s.updated_at or s.created_at
        if updated >= today_start:
            grouped["today"].append(_session_to_dict(s))
        elif updated >= yesterday_start:
            grouped["yesterday"].append(_session_to_dict(s))
        elif updated >= week_ago:
            grouped["previous_7_days"].append(_session_to_dict(s))
        else:
            grouped["older"].append(_session_to_dict(s))

    return grouped


@router.get("/{session_id}")
async def get_session(session_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    doc_result = await db.execute(
        select(SessionDocument)
        .where(SessionDocument.session_id == session.id)
        .order_by(SessionDocument.version.desc())
        .limit(1)
    )
    latest_doc = doc_result.scalar_one_or_none()

    cover_result = await db.execute(
        select(SessionDocument)
        .where(SessionDocument.session_id == session.id, SessionDocument.doc_type == "cover_letter")
        .order_by(SessionDocument.version.desc())
        .limit(1)
    )
    cover_doc = cover_result.scalar_one_or_none()

    return {
        **_session_to_dict(session),
        "latest_document": {
            "id": str(latest_doc.id) if latest_doc else None,
            "version": latest_doc.version if latest_doc else 0,
            "document_type": latest_doc.doc_type if latest_doc else "resume",
            "content": latest_doc.content_json if latest_doc and latest_doc.content_json else ({"basics": {"name": "Unknown"}, "sections": [], "metadata": {}} if latest_doc else None),
            "parent_doc_id": str(latest_doc.parent_doc_id) if latest_doc and latest_doc.parent_doc_id else None,
        } if latest_doc else None,
        "cover_letter_document": {
            "id": str(cover_doc.id) if cover_doc else None,
            "version": cover_doc.version if cover_doc else 0,
            "content": cover_doc.content_json if cover_doc and cover_doc.content_json else None,
        } if cover_doc else None,
        "has_cover_letter": cover_doc is not None,
    }


@router.patch("/{session_id}")
async def update_session(
    session_id: str, body: SessionUpdate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    for key, value in body.model_dump(exclude_unset=True).items():
        setattr(session, key, value)

    await db.commit()
    await db.refresh(session)
    return _session_to_dict(session)


@router.delete("/{session_id}")
async def delete_session(session_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()
    return {"status": "ok"}


@router.get("/{session_id}/messages")
async def get_messages(session_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    msg_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session.id)
        .order_by(ChatMessage.created_at)
    )
    messages = msg_result.scalars().all()
    return [
        {
            "id": str(m.id),
            "role": m.role,
            "content": m.content,
            "metadata_json": m.metadata_json,
            "created_at": str(m.created_at),
        }
        for m in messages
    ]


# --- Company endpoints ---


@company_router.get("")
async def list_companies(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(
            Session.company_name,
            func.count(Session.id).label("session_count"),
            func.max(Session.updated_at).label("last_active_at"),
        )
        .where(Session.user_id == current_user.id)
        .group_by(Session.company_name)
        .order_by(func.max(Session.updated_at).desc())
    )
    rows = result.all()
    return [
        {
            "company_name": row.company_name,
            "session_count": row.session_count,
            "last_active_at": str(row.last_active_at),
        }
        for row in rows
    ]


@company_router.get("/{company_name}/sessions")
async def company_sessions(
    company_name: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Session)
        .where(Session.user_id == current_user.id, Session.company_name == company_name)
        .order_by(Session.role_title, Session.updated_at.desc())
    )
    sessions = result.scalars().all()
    return [_session_to_dict(s) for s in sessions]


# --- Tag endpoints ---


@tag_router.get("")
async def list_tags(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Session.tags).where(Session.user_id == current_user.id)
    )
    tag_counts: dict[str, int] = {}
    for (tags,) in result.all():
        if tags:
            for tag in tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

    return [{"tag": k, "session_count": v} for k, v in sorted(tag_counts.items())]


# --- Master resume endpoints ---


async def _emit(event_type: str, data: dict) -> str:
    return f"event: {event_type}\ndata: {json.dumps(data)}\n\n"


@master_router.post("")
async def upload_master_resume(
    current_user: CurrentUser,
    file: UploadFile | None = None,
    tex_source: str | None = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
):
    if file:
        tex_source = (await file.read()).decode("utf-8")
    if not tex_source:
        raise HTTPException(status_code=400, detail="No tex_source provided")

    result = await db.execute(
        select(MasterResume).where(MasterResume.user_id == current_user.id)
    )
    master = result.scalar_one_or_none()

    from app.services.llm.factory import get_adapter
    from app.services.importers.tex_llm_importer import import_from_tex

    p_result = await db.execute(
        select(LLMProvider).where(LLMProvider.user_id == current_user.id, LLMProvider.is_default == True)
    )
    provider = p_result.scalar_one_or_none()
    if not provider:
        p_result = await db.execute(select(LLMProvider).where(LLMProvider.user_id == current_user.id))
        provider = p_result.scalars().first()

    if not provider:
        raise HTTPException(status_code=400, detail="Configure an LLM provider to import resume")

    try:
        adapter = get_adapter(provider)
        resume_content = await import_from_tex(tex_source, adapter)
        content_json = resume_content.model_dump(mode='json')
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to parse resume: {e}")

    if master:
        master.content_json = content_json
    else:
        master = MasterResume(
            id=uuid4(),
            user_id=current_user.id,
            filename="resume.tex",
            original_format="tex",
            content_json=content_json,
        )
        db.add(master)

    await db.commit()
    await db.refresh(master)

    return {
        "id": str(master.id),
        "content_json": content_json,
        "import_status": "imported",
    }


@master_router.post("/import")
async def import_master_resume_sse(
    current_user: CurrentUser,
    tex_source: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    async def event_stream():
        yield await _emit("importing", {"message": "Analyzing resume structure..."})

        try:
            from app.services.llm.factory import get_adapter
            from app.services.importers.tex_llm_importer import import_from_tex

            p_result = await db.execute(
                select(LLMProvider).where(LLMProvider.user_id == current_user.id, LLMProvider.is_default == True)
            )
            provider = p_result.scalar_one_or_none()
            if not provider:
                p_result = await db.execute(select(LLMProvider).where(LLMProvider.user_id == current_user.id))
                provider = p_result.scalars().first()

            if not provider:
                yield await _emit("error", {"message": "No LLM provider configured"})
                return

            adapter = get_adapter(provider)

            yield await _emit("extracting", {"message": "Extracting content with AI..."})

            content = await import_from_tex(tex_source, adapter)

            yield await _emit("import_done", {
                "content": content.model_dump(mode='json'),
            })

        except Exception as e:
            yield await _emit("error", {"message": f"Import failed: {str(e)}"})

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@master_router.get("")
async def get_master_resume(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MasterResume).where(MasterResume.user_id == current_user.id)
    )
    master = result.scalar_one_or_none()
    if not master:
        raise HTTPException(status_code=404, detail="No master resume found")

    return {
        "id": str(master.id),
        "filename": master.filename,
        "original_format": master.original_format,
        "content_json": master.content_json,
        "page_count": master.page_count,
        "created_at": str(master.created_at),
    }


@master_router.put("")
async def replace_master_resume(
    current_user: CurrentUser,
    tex_source: str = Body(..., embed=True),
    db: AsyncSession = Depends(get_db),
):
    return await upload_master_resume(current_user=current_user, tex_source=tex_source, db=db)


@master_router.delete("")
async def delete_master_resume(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MasterResume).where(MasterResume.user_id == current_user.id)
    )
    master = result.scalar_one_or_none()
    if not master:
        raise HTTPException(status_code=404, detail="No master resume found")
    await db.delete(master)
    await db.commit()
    return {"detail": "ok"}


class CoverLetterResponse(BaseModel):
    cover_letter: str


@router.post("/{session_id}/generate-cover-letter")
async def generate_cover_letter(
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

    master_result = await db.execute(
        select(MasterResume).where(MasterResume.user_id == current_user.id)
    )
    master = master_result.scalar_one_or_none()
    if not master:
        raise HTTPException(status_code=400, detail="Upload a master resume first")

    provider_id = session.llm_provider_id
    if not provider_id:
        p_result = await db.execute(
            select(LLMProvider).where(LLMProvider.user_id == current_user.id, LLMProvider.is_default == True)
        )
        default_provider = p_result.scalar_one_or_none()
        if not default_provider:
            p_result = await db.execute(
                select(LLMProvider).where(LLMProvider.user_id == current_user.id)
            )
            default_provider = p_result.scalars().first()
        if not default_provider:
            raise HTTPException(status_code=400, detail="Configure an LLM provider first")
        provider_id = default_provider.id

    p_result = await db.execute(select(LLMProvider).where(LLMProvider.id == provider_id))
    provider = p_result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=400, detail="LLM provider not found")

    job_desc = session.job_description or ""
    company = session.company_name or ""
    role = session.role_title or ""

    from app.models.resume_schema import ResumeContent
    from app.services.rendering.renderer import ResumeRenderer
    content = ResumeContent.model_validate(master.content_json)
    renderer = ResumeRenderer()
    master_tex = renderer.render_tex(content)

    messages = build_cover_letter_prompt(master_tex, job_desc, company, role)
    adapter = get_adapter(provider)
    response = await adapter.chat(messages, stream=False)
    raw_content = response.content if hasattr(response, "content") else ""

    cover_doc = SessionDocument(
        id=uuid4(),
        session_id=session.id,
        doc_type="cover_letter",
        version=1,
        content_json={"text": raw_content, "type": "cover_letter"},
        is_final=False,
    )
    db.add(cover_doc)
    await db.commit()

    return CoverLetterResponse(cover_letter=raw_content)
