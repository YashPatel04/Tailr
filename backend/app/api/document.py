"""PATCH /api/sessions/{session_id}/document — user-initiated document edits.

Accepts typed ops, applies via the content ops applier,
persists a new SessionDocument version with source="user".
"""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db import get_db
from app.models.models import Patch, Session, SessionDocument
from app.models.resume_schema import CoverLetterContent, ResumeContent
from app.services.editing.content_ops import ContentApplier, ops_from_list

router = APIRouter(prefix="/api/sessions", tags=["document-editing"])


class UserEditRequest(BaseModel):
    operations: list[dict]
    doc_type: str = "resume"


class UserEditResponse(BaseModel):
    document_id: str
    version: int
    warnings: list[dict]


@router.patch("/{session_id}/document")
async def edit_document(
    session_id: str,
    body: UserEditRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == current_user.id)
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    doc_type = body.doc_type

    doc_result = await db.execute(
        select(SessionDocument)
        .where(SessionDocument.session_id == session.id, SessionDocument.doc_type == doc_type)
        .order_by(SessionDocument.version.desc())
        .limit(1)
    )
    current_doc = doc_result.scalar_one_or_none()
    if not current_doc:
        raise HTTPException(status_code=404, detail="No document found for this session")

    content_ops = ops_from_list(body.operations)
    applier = ContentApplier()
    warnings: list[dict] = []

    if doc_type == "cover_letter":
        content_dict = current_doc.content_json or {}
        if "paragraphs" not in content_dict:
            content = CoverLetterContent.from_legacy_text(content_dict.get("text", ""))
        else:
            content = CoverLetterContent.model_validate(content_dict)

        try:
            new_content = applier.apply_cover_letter(content, content_ops)
        except Exception as e:
            raise HTTPException(status_code=422, detail={"validation_errors": str(e)}) from e

        new_content_dict = new_content.model_dump(mode="json")
    else:
        content_dict = current_doc.content_json or {
            "basics": {"name": "Unknown"},
            "sections": [],
            "metadata": {},
        }
        content = ResumeContent.model_validate(content_dict)

        try:
            new_content = applier.apply(content, content_ops)
        except Exception as e:
            raise HTTPException(status_code=422, detail={"validation_errors": str(e)}) from e

        new_content_dict = new_content.model_dump(mode="json")

    new_doc = SessionDocument(
        id=uuid4(),
        session_id=session.id,
        doc_type=doc_type,
        version=(current_doc.version or 0) + 1,
        content_json=new_content_dict,
        parent_doc_id=current_doc.id,
    )
    db.add(new_doc)
    await db.flush()

    patch_record = Patch(
        id=uuid4(),
        session_id=session.id,
        source_doc_id=current_doc.id,
        target_doc_id=new_doc.id,
        operations_json=body.operations,
        raw_llm_response=None,
        user_message=None,
        applied=True,
    )
    db.add(patch_record)
    await db.commit()

    return {
        "document_id": str(new_doc.id),
        "version": new_doc.version,
        "warnings": warnings,
    }
