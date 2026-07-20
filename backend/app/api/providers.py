from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.db import get_db
from app.models.models import LLMProvider
from app.services.llm.factory import get_adapter
from app.utils.crypto import encrypt

router = APIRouter(prefix="/api/providers", tags=["providers"])


class ProviderCreate(BaseModel):
    name: str
    provider_type: str = Field(pattern="^(openai|anthropic|ollama|custom)$")
    api_key: str | None = None
    base_url: str | None = None
    model: str
    temperature: float = 0.7
    top_p: float = 1.0
    max_tokens: int = 4096
    is_default: bool = False


class ProviderResponse(BaseModel):
    id: str
    name: str
    provider_type: str
    api_key_last_four: str | None = None
    base_url: str | None = None
    model: str
    temperature: float
    top_p: float
    max_tokens: int
    is_default: bool
    created_at: str

    model_config = {"from_attributes": True}


def _provider_to_response(p: LLMProvider) -> ProviderResponse:
    last_four = None
    if p.api_key_encrypted:
        last_four = p.api_key_encrypted[-4:]

    return ProviderResponse(
        id=str(p.id),
        name=p.name,
        provider_type=p.provider_type,
        api_key_last_four=last_four,
        base_url=p.base_url,
        model=p.model,
        temperature=p.temperature or 0.7,
        top_p=p.top_p or 1.0,
        max_tokens=p.max_tokens or 4096,
        is_default=p.is_default or False,
        created_at=str(p.created_at),
    )


@router.get("")
async def list_providers(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LLMProvider).where(LLMProvider.user_id == current_user.id).order_by(LLMProvider.created_at)
    )
    providers = result.scalars().all()
    return [_provider_to_response(p) for p in providers]


@router.post("")
async def create_provider(body: ProviderCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    if body.is_default:
        await db.execute(
            update(LLMProvider).where(LLMProvider.user_id == current_user.id).values(is_default=False)
        )

    provider = LLMProvider(
        id=uuid4(),
        user_id=current_user.id,
        name=body.name,
        provider_type=body.provider_type,
        api_key_encrypted=encrypt(body.api_key) if body.api_key else None,
        base_url=body.base_url,
        model=body.model,
        temperature=body.temperature,
        top_p=body.top_p,
        max_tokens=body.max_tokens,
        is_default=body.is_default,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return _provider_to_response(provider)


@router.get("/{provider_id}")
async def get_provider(provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LLMProvider).where(LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return _provider_to_response(provider)


@router.put("/{provider_id}")
async def update_provider(
    provider_id: str, body: ProviderCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(LLMProvider).where(LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    if body.is_default:
        await db.execute(
            update(LLMProvider).where(LLMProvider.user_id == current_user.id).values(is_default=False)
        )

    provider.name = body.name
    provider.provider_type = body.provider_type
    if body.api_key:
        provider.api_key_encrypted = encrypt(body.api_key)
    provider.base_url = body.base_url
    provider.model = body.model
    provider.temperature = body.temperature
    provider.top_p = body.top_p
    provider.max_tokens = body.max_tokens
    provider.is_default = body.is_default

    await db.commit()
    await db.refresh(provider)
    return _provider_to_response(provider)


@router.delete("/{provider_id}")
async def delete_provider(provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LLMProvider).where(LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    await db.delete(provider)
    await db.commit()
    return {"status": "ok"}


@router.post("/{provider_id}/test")
async def test_provider(provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LLMProvider).where(LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id)
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    try:
        adapter = get_adapter(provider)
        response = await adapter.chat([{"role": "user", "content": "Hello, respond with just 'ok'."}])
        content = response.content if hasattr(response, "content") else ""
        if "ok" in content.lower():
            return {"status": "ok", "message": "Provider test successful"}
        return {"status": "ok", "message": f"Response: {content[:100]}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Provider test failed: {str(e)}")
