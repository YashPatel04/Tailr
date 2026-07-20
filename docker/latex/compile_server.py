"""Tiny HTTP server for the latex container to compile .tex to .pdf."""
from http.server import HTTPServer, BaseHTTPRequestHandler
import subprocess, os, tempfile, shutil, json

WORK_DIR = "/work"

class CompileHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != "/compile":
            self.send_error(404); return
        try:
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length).decode("utf-8")
            data = json.loads(body)
            tex = data.get("tex_source", "")
            doc_id = data.get("document_id", "unknown")
            
            doc_dir = os.path.join(WORK_DIR, doc_id)
            os.makedirs(doc_dir, exist_ok=True)
            tex_path = os.path.join(doc_dir, "resume.tex")
            with open(tex_path, "w") as f:
                f.write(tex)
            
            result = subprocess.run(
                ["latexmk", "-pdf", "-interaction=nonstopmode", "-halt-on-error",
                 f"-outdir={doc_dir}", tex_path],
                capture_output=True, text=True, timeout=30, cwd=doc_dir
            )
            
            pdf_path = os.path.join(doc_dir, "resume.pdf")
            if os.path.exists(pdf_path):
                with open(pdf_path, "rb") as f:
                    pdf_bytes = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/pdf")
                self.send_header("Content-Length", str(len(pdf_bytes)))
                self.end_headers()
                self.wfile.write(pdf_bytes)
                return
            
            self.send_error(400, f"Compilation failed: {result.stdout[-500:]}")
        except subprocess.TimeoutExpired:
            self.send_error(408, "Compilation timed out")
        except Exception as e:
            self.send_error(500, str(e))

if __name__ == "__main__":
    HTTPServer(("0.0.0.0", 9777), CompileHandler).serve_forever()
