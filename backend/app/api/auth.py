import secrets
from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from urllib.parse import urlparse

from app.api.deps import CurrentUser
from app.config import settings
from app.db import get_db
from app.models.models import RefreshToken, User
from app.utils.tokens import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    hash_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

ACCESS_TOKEN_MAX_AGE = 900
REFRESH_TOKEN_MAX_AGE = 604800


def _cookie_domain() -> str | None:
    host = urlparse(settings.BACKEND_URL).hostname
    return host if host and host not in ("localhost", "127.0.0.1") else None


def set_auth_cookies(response: JSONResponse, access_token: str, refresh_token: str):
    domain = _cookie_domain()
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=ACCESS_TOKEN_MAX_AGE,
        domain=domain,
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/auth/refresh",
        max_age=REFRESH_TOKEN_MAX_AGE,
        domain=domain,
    )


def clear_auth_cookies(response: JSONResponse):
    domain = _cookie_domain()
    response.delete_cookie("access_token", path="/", domain=domain)
    response.delete_cookie("refresh_token", path="/api/auth/refresh", domain=domain)


# --- Refresh ---


@router.post("/refresh")
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    cookie_token = request.cookies.get("refresh_token")
    if not cookie_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        decode_refresh_token(cookie_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token") from None

    token_hash = hash_token(cookie_token)
    result = await db.execute(
        select(RefreshToken)
        .where(RefreshToken.token_hash == token_hash)
        .order_by(RefreshToken.created_at.desc())
    )
    token_row = result.scalars().first()

    if not token_row or token_row.expires_at < datetime.now(UTC):
        raise HTTPException(status_code=401, detail="Token expired")

    if token_row.revoked:
        tokens_to_revoke = (
            (
                await db.execute(
                    select(RefreshToken).where(
                        RefreshToken.user_id == token_row.user_id,
                        RefreshToken.revoked.is_(False),
                    )
                )
            )
            .scalars()
            .all()
        )
        for t in tokens_to_revoke:
            t.revoked = True
        await db.commit()
        raise HTTPException(status_code=401, detail="Token reuse detected")

    token_row.revoked = True

    access_token = create_access_token(token_row.user_id)
    refresh_token_str = create_refresh_token(token_row.user_id)

    new_refresh = RefreshToken(
        id=uuid4(),
        user_id=token_row.user_id,
        token_hash=hash_token(refresh_token_str),
        expires_at=datetime.now(UTC) + timedelta(days=7),
        replaced_by_token_hash=None,
    )
    token_row.replaced_by_token_hash = new_refresh.token_hash
    db.add(new_refresh)
    await db.commit()

    response = JSONResponse(content={"status": "ok"})
    set_auth_cookies(response, access_token, refresh_token_str)
    return response


# --- Logout ---


@router.post("/logout")
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    cookie_token = request.cookies.get("refresh_token")
    if cookie_token:
        token_hash = hash_token(cookie_token)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        token_row = result.scalar_one_or_none()
        if token_row:
            token_row.revoked = True
            await db.commit()

    response = JSONResponse(content={"status": "ok"})
    clear_auth_cookies(response)
    return response


# --- OAuth: GitHub ---


@router.get("/github/login")
async def github_login():
    state = secrets.token_urlsafe(32)
    url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.BACKEND_URL}/api/auth/github/callback"
        f"&state={state}"
        "&scope=user:email"
    )
    response = RedirectResponse(url)
    response.set_cookie("oauth_state", state, max_age=600, httponly=True, samesite="lax", domain=_cookie_domain())
    return response


@router.get("/github/callback")
async def github_callback(
    code: str, state: str, request: Request, db: AsyncSession = Depends(get_db)
):
    cookie_state = request.cookies.get("oauth_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=400, detail="Invalid state")

    import httpx

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="OAuth failed")

        user_res = await client.get(
            "https://api.github.com/user",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_data = user_res.json()
        github_id = str(user_data.get("id"))

        emails_res = await client.get(
            "https://api.github.com/user/emails",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        emails_data = emails_res.json()
        primary_email = next(
            (e["email"] for e in emails_data if e.get("primary")),
            emails_data[0]["email"] if emails_data else None,
        )

    result = await db.execute(
        select(User).where(User.oauth_provider == "github", User.oauth_id == github_id)
    )
    user = result.scalar_one_or_none()

    if not user and primary_email:
        result = await db.execute(select(User).where(User.email == primary_email))
        user = result.scalar_one_or_none()
        if user:
            user.oauth_provider = "github"
            user.oauth_id = github_id

    if not user:
        user = User(
            id=uuid4(),
            email=primary_email or f"github_{github_id}@placeholder.local",
            oauth_provider="github",
            oauth_id=github_id,
        )
        db.add(user)

    await db.commit()

    access_jwt = create_access_token(user.id)
    refresh_jwt = create_refresh_token(user.id)

    refresh_row = RefreshToken(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_jwt),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(refresh_row)
    await db.commit()

    response = RedirectResponse(settings.FRONTEND_ORIGIN)
    set_auth_cookies(response, access_jwt, refresh_jwt)
    response.delete_cookie("oauth_state")
    return response


# --- OAuth: Google ---


@router.get("/google/login")
async def google_login():
    state = secrets.token_urlsafe(32)
    url = (
        "https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={settings.GOOGLE_CLIENT_ID}"
        f"&redirect_uri={settings.BACKEND_URL}/api/auth/google/callback"
        f"&response_type=code"
        "&scope=openid+email+profile"
        f"&state={state}"
    )
    response = RedirectResponse(url)
    response.set_cookie("oauth_state", state, max_age=600, httponly=True, samesite="lax", domain=_cookie_domain())
    return response


@router.get("/google/callback")
async def google_callback(
    code: str, state: str, request: Request, db: AsyncSession = Depends(get_db)
):
    cookie_state = request.cookies.get("oauth_state")
    if not cookie_state or cookie_state != state:
        raise HTTPException(status_code=400, detail="Invalid state")

    import httpx

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": f"{settings.BACKEND_URL}/api/auth/google/callback",
            },
        )
        token_data = token_res.json()
        access_token = token_data.get("access_token")

        if not access_token:
            raise HTTPException(status_code=400, detail="OAuth failed")

        user_res = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_data = user_res.json()
        google_id = user_data.get("id")
        email = user_data.get("email")

    result = await db.execute(
        select(User).where(User.oauth_provider == "google", User.oauth_id == google_id)
    )
    user = result.scalar_one_or_none()

    if not user and email:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            user.oauth_provider = "google"
            user.oauth_id = google_id

    if not user:
        user = User(
            id=uuid4(),
            email=email or f"google_{google_id}@placeholder.local",
            oauth_provider="google",
            oauth_id=google_id,
        )
        db.add(user)

    await db.commit()

    access_jwt = create_access_token(user.id)
    refresh_jwt = create_refresh_token(user.id)

    refresh_row = RefreshToken(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_jwt),
        expires_at=datetime.now(UTC) + timedelta(days=7),
    )
    db.add(refresh_row)
    await db.commit()

    response = RedirectResponse(settings.FRONTEND_ORIGIN)
    set_auth_cookies(response, access_jwt, refresh_jwt)
    response.delete_cookie("oauth_state")
    return response


# --- User endpoints ---

user_router = APIRouter(prefix="/api/users", tags=["users"])


@user_router.get("/me")
async def get_me(current_user: CurrentUser):
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "oauth_provider": current_user.oauth_provider,
        "career_context": current_user.career_context,
        "default_temperature": current_user.default_temperature,
        "default_max_tokens": current_user.default_max_tokens,
        "default_top_p": current_user.default_top_p,
        "created_at": str(current_user.created_at),
        "updated_at": str(current_user.updated_at),
    }


class UserPreferencesUpdate(BaseModel):
    default_temperature: float | None = None
    default_max_tokens: int | None = None
    default_top_p: float | None = None


@user_router.get("/me/preferences")
async def get_preferences(current_user: CurrentUser):
    return {
        "default_temperature": current_user.default_temperature,
        "default_max_tokens": current_user.default_max_tokens,
        "default_top_p": current_user.default_top_p,
    }


@user_router.put("/me/preferences")
async def update_preferences(
    body: UserPreferencesUpdate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if body.default_temperature is not None:
        current_user.default_temperature = body.default_temperature
    if body.default_max_tokens is not None:
        current_user.default_max_tokens = body.default_max_tokens
    if body.default_top_p is not None:
        current_user.default_top_p = body.default_top_p
    await db.commit()
    await db.refresh(current_user)
    return {
        "default_temperature": current_user.default_temperature,
        "default_max_tokens": current_user.default_max_tokens,
        "default_top_p": current_user.default_top_p,
    }


class UserUpdateRequest(BaseModel):
    career_context: str | None = None


@user_router.patch("/me")
async def update_me(
    body: UserUpdateRequest, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    if body.career_context is not None:
        current_user.career_context = body.career_context
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "oauth_provider": current_user.oauth_provider,
        "career_context": current_user.career_context,
        "created_at": str(current_user.created_at),
        "updated_at": str(current_user.updated_at),
    }


@user_router.delete("/me")
async def delete_account(
    request: Request,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    await db.delete(current_user)
    await db.commit()

    response = JSONResponse(content={"status": "ok"})
    clear_auth_cookies(response)
    return response
