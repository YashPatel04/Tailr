import hashlib
import os
import re
import subprocess
import tempfile

from app.config import settings


class CompileError(Exception):
    def __init__(self, message: str, line: int | None = None, context: str | None = None):
        self.message = message
        self.line = line
        self.context = context
        super().__init__(message)


class LatexCompiler:
    def __init__(self, container_name: str = "resume_builder-latex-1"):
        self.container_name = container_name
        self.work_dir = settings.LATEX_WORK_DIR

    def compile(self, tex_source: str, document_id: str) -> bytes:
        doc_dir = os.path.join(self.work_dir, document_id)
        os.makedirs(doc_dir, exist_ok=True)

        tex_path = os.path.join(doc_dir, "resume.tex")
        with open(tex_path, "w") as f:
            f.write(tex_source)

        cmd = [
            "docker", "exec", self.container_name,
            "latexmk", "-pdf",
            "-interaction=nonstopmode",
            "-halt-on-error",
            f"-outdir=/work/{document_id}",
            f"/work/{document_id}/resume.tex",
        ]

        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)

            pdf_path = os.path.join(doc_dir, "resume.pdf")
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    return f.read()

            error = self._parse_error(result.stdout + result.stderr)
            raise CompileError(
                message=error.get("message", "Compilation failed"),
                line=error.get("line"),
                context=error.get("context"),
            )

        except subprocess.TimeoutExpired:
            raise CompileError(message="Compilation timed out after 30 seconds")

    def _parse_error(self, output: str) -> dict:
        match = re.search(r"!(.*?)\n", output)
        message = match.group(1).strip() if match else "Unknown error"

        line_match = re.search(r"l\.(\d+)", output)
        line = int(line_match.group(1)) if line_match else None

        return {"message": message, "line": line, "context": output[-500:]}
