from contextlib import suppress
from uuid import uuid4

import redis.asyncio as redis
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser
from app.config import settings
from app.db import get_db
from app.models.models import LLMProvider
from app.services.llm.factory import get_adapter
from app.utils.crypto import encrypt

router = APIRouter(prefix="/api/providers", tags=["providers"])

_redis = redis.from_url(settings.REDIS_URL, decode_responses=True)
CACHE_TTL = 900  # 15 minutes


class ProviderCreate(BaseModel):
    name: str
    provider_type: str = Field(pattern="^(openai|anthropic|ollama|custom)$")
    api_key: str | None = None
    base_url: str | None = None


class ProviderResponse(BaseModel):
    id: str
    name: str
    provider_type: str
    api_key_last_four: str | None = None
    base_url: str | None = None
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
        created_at=str(p.created_at),
    )


@router.get("")
async def list_providers(current_user: CurrentUser, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(LLMProvider)
        .where(LLMProvider.user_id == current_user.id)
        .order_by(LLMProvider.created_at)
    )
    providers = result.scalars().all()
    return [_provider_to_response(p) for p in providers]


@router.post("")
async def create_provider(
    body: ProviderCreate, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    provider = LLMProvider(
        id=uuid4(),
        user_id=current_user.id,
        name=body.name,
        provider_type=body.provider_type,
        api_key_encrypted=encrypt(body.api_key) if body.api_key else None,
        base_url=body.base_url,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return _provider_to_response(provider)


@router.get("/{provider_id}")
async def get_provider(
    provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    return _provider_to_response(provider)


@router.put("/{provider_id}")
async def update_provider(
    provider_id: str,
    body: ProviderCreate,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    provider.name = body.name
    provider.provider_type = body.provider_type
    if body.api_key:
        provider.api_key_encrypted = encrypt(body.api_key)
    provider.base_url = body.base_url

    await db.commit()
    await db.refresh(provider)

    with suppress(Exception):
        await _redis.delete(f"models:{provider_id}")

    return _provider_to_response(provider)


@router.delete("/{provider_id}")
async def delete_provider(
    provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    await db.delete(provider)
    await db.commit()

    with suppress(Exception):
        await _redis.delete(f"models:{provider_id}")

    return {"status": "ok"}


@router.post("/{provider_id}/test")
async def test_provider(
    provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    from app.services.llm.factory import get_adapter

    try:
        adapter = get_adapter(provider)
        models = await adapter.list_models()
        return {"status": "ok", "model_count": len(models)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Provider test failed: {str(e)}") from e


@router.get("/{provider_id}/models")
async def list_provider_models(
    provider_id: str, current_user: CurrentUser, db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(LLMProvider).where(
            LLMProvider.id == provider_id, LLMProvider.user_id == current_user.id
        )
    )
    provider = result.scalar_one_or_none()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    cache_key = f"models:{provider_id}"
    try:
        cached = await _redis.get(cache_key)
        if cached:
            import json

            return {"models": json.loads(cached), "cached": True}
    except Exception:
        pass

    try:
        adapter = get_adapter(provider)
        models = await adapter.list_models()
        model_list = [{"id": m.id, "display_name": m.display_name} for m in models]
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={"error": "provider_unavailable", "provider_id": provider_id, "message": str(e)},
        ) from e

    try:
        import json

        await _redis.setex(cache_key, CACHE_TTL, json.dumps(model_list))
    except Exception:
        pass

    return {"models": model_list, "cached": False}
