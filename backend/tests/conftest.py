import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.db.seed import seed_demo_catalog


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """
    Ensure database schema is created and demo catalog is seeded before tests run.
    """
    # Clean reset database for hermetic test suite run
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_demo_catalog(db)
    yield


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
