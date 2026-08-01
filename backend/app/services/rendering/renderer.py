from __future__ import annotations

import os
import re
from collections.abc import Sequence
from typing import Any

from jinja2 import Environment, FileSystemLoader

from app.models.resume_schema import ResumeContent

FORMAT_OPEN = {
    "bold": "\\textbf{",
    "italic": "\\textit{",
    "underline": "\\underline{",
    "code": "\\texttt{",
}
FORMAT_CLOSE = "}"
FMT_ORDER = ["bold", "italic", "underline", "code"]

TEX_ESCAPE_PATTERN = re.compile(r"([\\{}&#$^_~%])")
TEX_ESCAPE_REPL: dict[str, str] = {
    "\\": "\\textbackslash{}",
    "{": "\\{",
    "}": "\\}",
    "$": "\\$",
    "&": "\\&",
    "#": "\\#",
    "^": "\\^{}",
    "_": "\\_",
    "~": "\\textasciitilde{}",
    "%": "\\%",
}


def tex_escape(text: str) -> str:
    if not text:
        return text
    return TEX_ESCAPE_PATTERN.sub(lambda m: TEX_ESCAPE_REPL[m.group()], text)


def _normalize_span(span: Any) -> dict[str, Any]:
    if isinstance(span, dict):
        return span
    if hasattr(span, "model_dump"):
        return span.model_dump(mode="json")
    if hasattr(span, "dict"):
        return span.dict()
    return {
        "start": getattr(span, "start", 0),
        "end": getattr(span, "end", 0),
        "formats": [str(f) for f in getattr(span, "formats", [])],
        "link_url": getattr(span, "link_url", None),
    }


def span_format_filter(text: str, spans: Sequence[Any]) -> str:
    if not text:
        return text
    if not spans:
        return tex_escape(text)

    spans_list = [_normalize_span(s) for s in spans]
    n = len(text)

    active_fmts: list[set[str]] = [set() for _ in range(n)]
    active_link: list[str | None] = [None for _ in range(n)]

    for span in spans_list:
        start = max(0, span["start"])
        end = min(n, span["end"])
        link = span.get("link_url")
        fmts = {str(f) for f in span.get("formats", [])}
        for i in range(start, end):
            active_fmts[i].update(fmts)
            if link:
                active_link[i] = link

    segments: list[tuple[int, int, frozenset[str], str | None]] = []
    i = 0
    while i < n:
        current_fmts = frozenset(active_fmts[i])
        current_link = active_link[i]
        j = i + 1
        while j < n:
            if frozenset(active_fmts[j]) != current_fmts or active_link[j] != current_link:
                break
            j += 1
        segments.append((i, j, current_fmts, current_link))
        i = j

    result_parts: list[str] = []
    for start, end, fmts, link in segments:
        seg_text = text[start:end]
        escaped = tex_escape(seg_text)
        wrapped = escaped

        if link:
            wrapped = f"\\href{{{link}}}{{{wrapped}}}"

        for fmt in FMT_ORDER:
            if fmt in fmts:
                wrapped = f"{FORMAT_OPEN[fmt]}{wrapped}{FORMAT_CLOSE}"

        result_parts.append(wrapped)

    return "".join(result_parts)


class ResumeRenderer:
    def __init__(self) -> None:
        template_dir = os.path.join(os.path.dirname(__file__), "templates")
        self.env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=False,
        )
        self.env.filters["span_format"] = span_format_filter
        self.env.filters["tex_escape"] = tex_escape

    def render_tex(self, content: ResumeContent) -> str:
        template = self.env.get_template("resume.tex.j2")
        return template.render(content=content)

    def render_html(self, content: ResumeContent) -> str:
        template = self.env.get_template("resume.html.j2")
        return template.render(content=content)
