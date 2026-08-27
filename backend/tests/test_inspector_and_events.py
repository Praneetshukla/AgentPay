import pytest
import json
import asyncio
from httpx import AsyncClient
from app.db.session import SessionLocal
from app.db.seed import seed_demo_catalog
from app.core.events import event_broker, AgentExecutionEvent
from app.core.config import settings


@pytest.mark.asyncio
async def test_event_broker_sanitization_and_publishing():
    """
    Test event broker sanitizes sensitive keys before publishing.
    """
    queue = event_broker.subscribe()
    try:
        raw_event = AgentExecutionEvent(
            event_id="evt_test_123",
            run_id="run_test_456",
            event_type="TEST_EVENT",
            status="SUCCESS",
            timestamp="2026-08-27T14:00:00Z",
            payload={
                "order_id": "order_123",
                "RAZORPAY_KEY_SECRET": "super_secret_key",
                "api_key": "openai_secret"
            }
        )
        # Create listener task
        async def publish_and_wait():
            await event_broker.publish(raw_event)
            return await queue.get()

        published_str = await asyncio.wait_for(publish_and_wait(), timeout=2.0)
        published_json = json.loads(published_str)

        assert published_json["payload"]["order_id"] == "order_123"
        assert published_json["payload"]["RAZORPAY_KEY_SECRET"] == "***REDACTED***"
        assert published_json["payload"]["api_key"] == "***REDACTED***"
    finally:
        event_broker.unsubscribe(queue)


@pytest.mark.asyncio
async def test_demo_failure_simulation_endpoints(async_client: AsyncClient):
    """
    Test Failure Lab simulation routes:
    - Stock reduction to 0
    - Price change
    - Audit ledger tampering
    """
    # 1. Stock change
    resp_stock = await async_client.post("/demo/simulate-stock", json={
        "sku": "KB-MECH-001",
        "stock_quantity": 0
    })
    assert resp_stock.status_code == 200
    assert resp_stock.json()["new_stock"] == 0

    # 2. Price change
    resp_price = await async_client.post("/demo/simulate-price-change", json={
        "sku": "KB-MECH-001",
        "price_paise": 999900
    })
    assert resp_price.status_code == 200
    assert resp_price.json()["new_price_paise"] == 999900

    # 3. Tamper audit ledger
    resp_tamper = await async_client.post("/demo/simulate-tamper-ledger")
    assert resp_tamper.status_code == 200
    assert resp_tamper.json()["tampered_event_id"] is not None

    # Restore DB state after test
    with SessionLocal() as db:
        seed_demo_catalog(db)
