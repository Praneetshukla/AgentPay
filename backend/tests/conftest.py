import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.db.base import Base
from app.db.models import Product, Quote, Policy, Transaction, AuditEvent, AgentRun  # noqa: F401
from app.db.session import engine, SessionLocal
from app.db.seed import seed_demo_catalog


@pytest.fixture(autouse=True)
def setup_test_database():
    """
    Ensure database schema is cleanly reset and demo catalog seeded before each test.
    """
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        # Clear existing data cleanly in foreign-key safe order
        db.query(AuditEvent).delete()
        db.query(Transaction).delete()
        db.query(Quote).delete()
        db.query(Policy).delete()
        db.query(Product).delete()
        db.query(AgentRun).delete()
        db.commit()
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
