import pytest
from httpx import AsyncClient
from app.core.config import settings


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    """
    Test that the /health endpoint responds with status ok, correct version, and environment.
    """
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["version"] == settings.VERSION
    assert data["environment"] == settings.ENVIRONMENT


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """
    Test that root endpoint returns application metadata and references.
    """
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == settings.PROJECT_NAME
    assert data["health_url"] == "/health"
    assert data["docs_url"] == "/docs"


def test_configuration_loading():
    """
    Verify that application configuration loads correctly with expected defaults and types.
    """
    assert settings.PROJECT_NAME == "AgentPay Gateway"
    assert isinstance(settings.BACKEND_PORT, int)
    assert isinstance(settings.BACKEND_CORS_ORIGINS, list)
    assert len(settings.SECRET_KEY) > 0
    assert len(settings.CART_HMAC_SECRET) > 0
    assert settings.DATABASE_URL is not None
