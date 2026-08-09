import json
import urllib.request


class CompileError(Exception):
    def __init__(self, message: str, line: int | None = None, context: str | None = None):
        self.message = message
        self.line = line
        self.context = context
        super().__init__(message)


class LatexCompiler:
    def __init__(self, service_url: str = "http://latex:9777/compile"):
        self.service_url = service_url

    def compile(self, tex_source: str, document_id: str) -> bytes:
        data = json.dumps({"tex_source": tex_source, "document_id": document_id}).encode("utf-8")
        req = urllib.request.Request(
            self.service_url, data=data, method="POST", headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                if resp.status == 200:
                    return resp.read()
                error_body = resp.read().decode("utf-8", errors="replace")
                raise CompileError(message=f"Compilation failed: {error_body[:300]}")
        except urllib.error.HTTPError as e:
            error_body = e.read().decode("utf-8", errors="replace")
            raise CompileError(message=error_body[:300]) from e
        except Exception as e:
            raise CompileError(message=str(e)) from e
