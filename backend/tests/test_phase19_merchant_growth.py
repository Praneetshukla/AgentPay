import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from app.main import app
from app.db.session import SessionLocal
from app.db.models import AuditEvent, Product


@pytest.mark.asyncio
async def test_revenue_analytics_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/analytics/revenue")
        assert res.status_code == 200
        data = res.json()
        assert "total_gmv_paise" in data
        assert "average_order_value_paise" in data
        assert "recovery_preserved_revenue_paise" in data
        assert "incremental_cross_sell_revenue_paise" in data
        assert "category_affinity_insights" in data


@pytest.mark.asyncio
async def test_cross_sell_recommendations_within_headroom():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Keyboard (2499 INR = 249900 paise) in cart, budget 5000 INR (500000 paise) -> Headroom 250100 paise
        res = await client.post("/analytics/revenue/cross-sell-recommendations", json={
            "current_skus": ["KB-MECH-001"],
            "current_total_paise": 249900,
            "buyer_budget_paise": 500000
        })
        assert res.status_code == 200
        recs = res.json()
        assert len(recs) > 0
        for r in recs:
            assert r["recommended_price"] <= 250100
            assert r["remaining_after_add_paise"] >= 0
            assert r["policy_safe"] is True


@pytest.mark.asyncio
async def test_cross_sell_recommendations_zero_headroom():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Cart total 5000 INR, budget 5000 INR -> Headroom 0
        res = await client.post("/analytics/revenue/cross-sell-recommendations", json={
            "current_skus": ["KB-MECH-001"],
            "current_total_paise": 500000,
            "buyer_budget_paise": 500000
        })
        assert res.status_code == 200
        recs = res.json()
        assert len(recs) == 0


@pytest.mark.asyncio
async def test_record_growth_decision_audit_event():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/analytics/revenue/record-recommendation-decision", json={
            "decision": "ACCEPTED",
            "sku": "MOUSE-WL-002",
            "product_name": "PrecisionFlow Wireless Mouse",
            "price_paise": 129900,
            "quote_id": "qt_mock_growth_01"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "recorded"
        assert data["event_type"] == "CROSS_SELL_ACCEPTED"
        assert "event_hash" in data

        with SessionLocal() as session:
            evt = session.scalars(select(AuditEvent).where(AuditEvent.id == data["event_id"])).first()
            assert evt is not None
            assert evt.event_hash == data["event_hash"]
            assert evt.payload["sku"] == "MOUSE-WL-002"
            assert evt.payload["incremental_amount_paise"] == 129900
