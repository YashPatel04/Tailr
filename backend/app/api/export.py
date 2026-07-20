from io import BytesIO
from typing import Iterator

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db import get_db
from app.models.models import Session, SessionDocument
from app.services.latex.compiler import CompileError, LatexCompiler

try:
    from app.models.resume_schema import ResumeContent
    from app.services.rendering.renderer import ResumeRenderer
    _CONTENT_OPS_AVAILABLE = True
except ImportError:
    _CONTENT_OPS_AVAILABLE = False

router = APIRouter(prefix="/api/sessions", tags=["export"])


def _resolve_text(node: dict) -> str:
    """Extract display text from a node, working with both v2 Region trees and legacy DocNodes."""
    if node.get("text"):
        return node["text"]
    if node.get("content"):
        return node["content"]
    return ""


def _resolve_entry_fields(node: dict) -> dict:
    """Extract entry-level fields. Works for v2 (fields dict) and legacy (title/dates attrs)."""
    result: dict = {"title": "", "dates": "", "organization": ""}
    fields = node.get("fields") or {}
    if isinstance(fields, dict) and fields:
        for f in fields.values():
            kind = f.get("kind", "")
            text = f.get("text", "")
            if kind == "title":
                result["title"] = text
            elif kind == "dates":
                result["dates"] = text
            elif kind in ("organization", "role"):
                if not result["organization"]:
                    result["organization"] = text
    else:
        result["title"] = node.get("title") or ""
        result["dates"] = node.get("dates") or ""
        result["organization"] = node.get("organization") or ""
    return result


def _walk_model(root: dict) -> Iterator[dict]:
    """Pre-order traversal of the document model tree."""
    stack = [root]
    while stack:
        node = stack.pop()
        yield node
        children = node.get("children") or []
        for child in reversed(children):
            stack.append(child)


def _docx_apply_spans(paragraph, spans: list, text: str):
    """Apply span formatting (bold/italic/underline) as docx run properties."""
    from docx.shared import Pt

    if not spans:
        paragraph.add_run(text)
        return

    cursor = 0
    for span in sorted(spans, key=lambda s: s["start"]):
        s_start = span["start"]
        s_end = span["end"]
        if cursor < s_start:
            paragraph.add_run(text[cursor:s_start])
        run = paragraph.add_run(text[s_start:s_end])
        formats = span.get("formats") or []
        if "bold" in formats:
            run.bold = True
        if "italic" in formats:
            run.italic = True
        if "underline" in formats:
            run.underline = True
        cursor = s_end
    if cursor < len(text):
        paragraph.add_run(text[cursor:])


@router.get("/{session_id}/export")
async def export_document(
    session_id: str,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    format: str = Query(pattern="^(tex|pdf|docx|txt|html)$"),
):
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
    doc = doc_result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="No document found")

    tex_source = doc.tex_source

    if format == "tex":
        if _CONTENT_OPS_AVAILABLE and doc.content_json:
            content = ResumeContent.model_validate(doc.content_json)
            renderer = ResumeRenderer()
            tex = renderer.render_tex(content)
            return Response(
                content=tex,
                media_type="text/plain",
                headers={"Content-Disposition": "attachment; filename=resume.tex"},
            )
        return Response(
            content=tex_source,
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=resume.tex"},
        )

    if format == "html":
        if _CONTENT_OPS_AVAILABLE and doc.content_json:
            content = ResumeContent.model_validate(doc.content_json)
            renderer = ResumeRenderer()
            html = renderer.render_html(content)
            return Response(
                content=html,
                media_type="text/html",
                headers={"Content-Disposition": "attachment; filename=resume.html"},
            )
        raise HTTPException(status_code=400, detail="HTML export requires structured content (content_json)")

    if format == "pdf":
        try:
            compiler = LatexCompiler()
            pdf_bytes = compiler.compile(tex_source, str(doc.id))
            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={"Content-Disposition": "attachment; filename=resume.pdf"},
            )
        except CompileError as e:
            raise HTTPException(status_code=400, detail=e.message)

    elif format == "docx":
        from docx import Document as DocxDocument
        from docx.enum.text import WD_PARAGRAPH_ALIGNMENT
        from docx.shared import Pt

        docx = DocxDocument()
        doc_model = doc.document_model_json
        if not doc_model:
            docx.add_heading("Resume", 0)
            docx.add_paragraph("No document content.")
        else:
            for node in _walk_model(doc_model):
                ntype = node.get("type", "")
                if ntype == "section":
                    label = node.get("label") or ""
                    docx.add_heading(label, level=1)
                elif ntype == "entry":
                    entry = _resolve_entry_fields(node)
                    p = docx.add_paragraph()
                    run = p.add_run(entry["title"])
                    run.bold = True
                    if entry["dates"]:
                        p.add_run(f"  —  {entry['dates']}")
                    if entry["organization"]:
                        docx.add_paragraph(entry["organization"])
                elif ntype == "bullet":
                    text = node.get("text") or ""
                    spans = node.get("spans") or []
                    p = docx.add_paragraph(style="List Bullet")
                    _docx_apply_spans(p, spans, text)
                elif ntype == "skill_row":
                    cat = node.get("category") or ""
                    items = node.get("items") or ""
                    p = docx.add_paragraph()
                    run = p.add_run(f"{cat} ")
                    run.bold = True
                    if items:
                        p.add_run(items)

        buffer = BytesIO()
        docx.save(buffer)
        buffer.seek(0)
        return Response(
            content=buffer.getvalue(),
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=resume.docx"},
        )

    elif format == "txt":
        lines: list[str] = []
        doc_model = doc.document_model_json
        if doc_model:
            for node in _walk_model(doc_model):
                ntype = node.get("type", "")
                if ntype == "section":
                    label = node.get("label") or ""
                    lines.append(f"\n{label.upper()}\n")
                elif ntype == "entry":
                    entry = _resolve_entry_fields(node)
                    title_line = entry["title"]
                    if entry["dates"]:
                        title_line += f"  --  {entry['dates']}"
                    lines.append(title_line)
                    if entry["organization"]:
                        lines.append(f"    {entry['organization']}")
                elif ntype == "bullet":
                    text = node.get("text") or ""
                    lines.append(f"  \u2022 {text}")
                elif ntype == "skill_row":
                    cat = node.get("category") or ""
                    items = node.get("items") or ""
                    lines.append(f"{cat} {items}")
        else:
            for line in (tex_source or "").split("\n"):
                cleaned = line.strip()
                if cleaned:
                    lines.append(cleaned)

        return Response(
            content="\n".join(lines),
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=resume.txt"},
        )

    raise HTTPException(status_code=400, detail="Invalid format")



