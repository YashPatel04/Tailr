import secrets

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

EXEMPT_PATHS = ["/api/auth/", "/api/health"]


class CsrfMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method in ("GET", "HEAD", "OPTIONS"):
            response = await call_next(request)
            csrf = request.cookies.get("csrf_token") or secrets.token_urlsafe(32)
            response.set_cookie("csrf_token", csrf, httponly=False, samesite="lax")
            response.headers["X-CSRF-Token"] = csrf
            return response

        if any(request.url.path.startswith(p) for p in EXEMPT_PATHS):
            return await call_next(request)

        header_token = request.headers.get("X-CSRF-Token")
        cookie_token = request.cookies.get("csrf_token")

        if not header_token or not cookie_token or header_token != cookie_token:
            return Response(
                status_code=403,
                content='{"detail":"CSRF token missing or invalid"}',
                media_type="application/json",
            )

        response = await call_next(request)
        return response
