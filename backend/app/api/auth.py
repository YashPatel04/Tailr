import secrets
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_current_user
from app.config import settings
from app.db import get_db
from app.models.models import EmailVerification, PasswordReset, RefreshToken, User
from app.services.email import send_email
from app.utils.password import hash_password, verify_password
from app.utils.tokens import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    generate_email_token,
    hash_token,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])

ACCESS_TOKEN_MAX_AGE = 900
REFRESH_TOKEN_MAX_AGE = 604800


def set_auth_cookies(response: JSONResponse, access_token: str, refresh_token: str):
    response.set_cookie(
        "access_token",
        access_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/",
        max_age=ACCESS_TOKEN_MAX_AGE,
    )
    response.set_cookie(
        "refresh_token",
        refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        path="/api/auth/refresh",
        max_age=REFRESH_TOKEN_MAX_AGE,
    )


def clear_auth_cookies(response: JSONResponse):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/api/auth/refresh")


# --- Schemas ---


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(min_length=10, max_length=128)


class UserUpdateRequest(BaseModel):
    career_context: str | None = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=10, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    is_verified: bool
    oauth_provider: str | None = None
    career_context: str | None = None
    created_at: str
    updated_at: str

    model_config = {"from_attributes": True}


# --- Register ---


@router.post("/register")
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        return {"message": "Check your inbox to verify your email."}

    user = User(
        id=uuid4(),
        email=body.email,
        password_hash=hash_password(body.password),
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    token = generate_email_token()
    verification = EmailVerification(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
    )
    db.add(verification)
    await db.commit()

    verify_url = f"{settings.FRONTEND_ORIGIN}/verify?token={token}"
    with open("app/templates/email/verification.txt") as f:
        body_text = f.read().format(verify_url=verify_url)

    try:
        send_email(user.email, "Verify your email - Resume Tailor", body_text)
    except Exception:
        pass

    return {"message": "Check your inbox to verify your email."}


# --- Verify Email ---


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(token)
    result = await db.execute(
        select(EmailVerification).where(
            EmailVerification.token_hash == token_hash,
            EmailVerification.used == False,
        )
    )
    verification = result.scalar_one_or_none()

    if not verification or verification.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    verification.used = True

    result = await db.execute(select(User).where(User.id == verification.user_id))
    user = result.scalar_one_or_none()
    if user:
        user.is_verified = True

    await db.commit()

    return RedirectResponse(f"{settings.FRONTEND_ORIGIN}/login?verified=1")


# --- Login ---


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")

    access_token = create_access_token(user.id)
    refresh_token_str = create_refresh_token(user.id)

    refresh_row = RefreshToken(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_token_str),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
    )
    db.add(refresh_row)
    await db.commit()

    response = JSONResponse(
        content={
            "id": str(user.id),
            "email": user.email,
            "is_verified": user.is_verified,
            "oauth_provider": user.oauth_provider,
            "career_context": user.career_context,
            "created_at": str(user.created_at),
            "updated_at": str(user.updated_at),
        }
    )
    set_auth_cookies(response, access_token, refresh_token_str)
    return response


# --- Refresh ---


@router.post("/refresh")
async def refresh(request: Request, db: AsyncSession = Depends(get_db)):
    cookie_token = request.cookies.get("refresh_token")
    if not cookie_token:
        raise HTTPException(status_code=401, detail="No refresh token")

    try:
        payload = decode_refresh_token(cookie_token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    token_hash = hash_token(cookie_token)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash).order_by(RefreshToken.created_at.desc())
    )
    token_row = result.scalars().first()

    if not token_row or token_row.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Token expired")

    if token_row.revoked:
        await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == token_row.user_id, RefreshToken.revoked == False
            )
        )
        tokens_to_revoke = (await db.execute(
            select(RefreshToken).where(
                RefreshToken.user_id == token_row.user_id, RefreshToken.revoked == False
            )
        )).scalars().all()
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
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        replaced_by_token_hash=None,
    )
    token_row.replaced_by_token_hash = new_refresh.token_hash
    db.add(new_refresh)
    await db.commit()

    response = JSONResponse(content={"status": "ok"})
    set_auth_cookies(response, access_token, refresh_token_str)
    return response


# --- Forgot / Reset Password ---


@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if user:
        token = generate_email_token()
        reset = PasswordReset(
            id=uuid4(),
            user_id=user.id,
            token_hash=hash_token(token),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        )
        db.add(reset)
        await db.commit()

        reset_url = f"{settings.FRONTEND_ORIGIN}/reset-password?token={token}"
        with open("app/templates/email/password_reset.txt") as f:
            body_text = f.read().format(reset_url=reset_url)

        try:
            send_email(user.email, "Reset your password - Resume Tailor", body_text)
        except Exception:
            pass

    return {"message": "If the email exists, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hash_token(body.token)
    result = await db.execute(
        select(PasswordReset).where(
            PasswordReset.token_hash == token_hash, PasswordReset.used == False
        )
    )
    reset = result.scalar_one_or_none()

    if not reset or reset.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired token")

    reset.used = True

    result = await db.execute(select(User).where(User.id == reset.user_id))
    user = result.scalar_one_or_none()
    if user:
        user.password_hash = hash_password(body.new_password)

    tokens = (await db.execute(
        select(RefreshToken).where(RefreshToken.user_id == reset.user_id, RefreshToken.revoked == False)
    )).scalars().all()
    for t in tokens:
        t.revoked = True

    await db.commit()
    return {"message": "Password reset successfully"}


# --- Logout ---


@router.post("/logout")
async def logout(request: Request, db: AsyncSession = Depends(get_db)):
    cookie_token = request.cookies.get("refresh_token")
    if cookie_token:
        token_hash = hash_token(cookie_token)
        result = await db.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
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
        f"&redirect_uri={settings.FRONTEND_ORIGIN}/api/auth/github/callback"
        f"&state={state}"
        "&scope=user:email"
    )
    response = RedirectResponse(url)
    response.set_cookie("oauth_state", state, max_age=600, httponly=True, samesite="lax")
    return response


@router.get("/github/callback")
async def github_callback(code: str, state: str, request: Request, db: AsyncSession = Depends(get_db)):
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
        primary_email = next((e["email"] for e in emails_data if e.get("primary")), emails_data[0]["email"] if emails_data else None)

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
            user.is_verified = True

    if not user:
        user = User(
            id=uuid4(),
            email=primary_email or f"github_{github_id}@placeholder.local",
            oauth_provider="github",
            oauth_id=github_id,
            is_verified=True,
        )
        db.add(user)

    await db.commit()

    access_jwt = create_access_token(user.id)
    refresh_jwt = create_refresh_token(user.id)

    refresh_row = RefreshToken(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_jwt),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
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
        f"&redirect_uri={settings.FRONTEND_ORIGIN}/api/auth/google/callback"
        f"&response_type=code"
        "&scope=openid+email+profile"
        f"&state={state}"
    )
    response = RedirectResponse(url)
    response.set_cookie("oauth_state", state, max_age=600, httponly=True, samesite="lax")
    return response


@router.get("/google/callback")
async def google_callback(code: str, state: str, request: Request, db: AsyncSession = Depends(get_db)):
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
                "redirect_uri": f"{settings.FRONTEND_ORIGIN}/api/auth/google/callback",
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
            user.is_verified = True

    if not user:
        user = User(
            id=uuid4(),
            email=email or f"google_{google_id}@placeholder.local",
            oauth_provider="google",
            oauth_id=google_id,
            is_verified=True,
        )
        db.add(user)

    await db.commit()

    access_jwt = create_access_token(user.id)
    refresh_jwt = create_refresh_token(user.id)

    refresh_row = RefreshToken(
        id=uuid4(),
        user_id=user.id,
        token_hash=hash_token(refresh_jwt),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
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
        "is_verified": current_user.is_verified,
        "oauth_provider": current_user.oauth_provider,
        "career_context": current_user.career_context,
        "created_at": str(current_user.created_at),
        "updated_at": str(current_user.updated_at),
    }


@user_router.patch("/me")
async def update_me(body: UserUpdateRequest, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if body.career_context is not None:
        current_user.career_context = body.career_context
    await db.commit()
    await db.refresh(current_user)
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "is_verified": current_user.is_verified,
        "oauth_provider": current_user.oauth_provider,
        "career_context": current_user.career_context,
        "created_at": str(current_user.created_at),
        "updated_at": str(current_user.updated_at),
    }


@user_router.post("/me/change-password")
async def change_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    if not current_user.password_hash or not verify_password(body.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    current_user.password_hash = hash_password(body.new_password)

    tokens = (await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == current_user.id, RefreshToken.revoked == False
        )
    )).scalars().all()
    for t in tokens:
        t.revoked = True

    await db.commit()
    return {"message": "Password changed"}


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
