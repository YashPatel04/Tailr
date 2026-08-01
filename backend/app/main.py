from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from app.api.auth import router as auth_router
from app.api.auth import user_router
from app.api.document import router as document_router
from app.api.export import router as export_router
from app.api.providers import router as providers_router
from app.api.sessions import company_router, master_router, tag_router
from app.api.sessions import router as sessions_router
from app.api.tailor import router as tailor_router
from app.config import settings
from app.middleware.csrf import CsrfMiddleware

limiter = Limiter(key_func=get_remote_address)


class PayloadLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        max_size = 10 * 1024 * 1024
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > max_size:
            return JSONResponse(status_code=413, content={"detail": "Payload too large"})
        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Tailr", lifespan=lifespan)
app.state.limiter = limiter

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"],
)
app.add_middleware(PayloadLimitMiddleware)
app.add_middleware(CsrfMiddleware)

app.add_exception_handler(
    RateLimitExceeded,
    lambda req, exc: JSONResponse(
        status_code=429,
        content={"detail": "Too many requests"},
        headers={"Retry-After": "60"},
    ),
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(providers_router)
app.include_router(sessions_router)
app.include_router(tailor_router)
app.include_router(export_router)
app.include_router(document_router)
app.include_router(master_router)
app.include_router(company_router)
app.include_router(tag_router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
