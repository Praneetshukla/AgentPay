import pytest
from httpx import AsyncClient
from app.db.session import SessionLocal
from app.services.revenue_intelligence import RevenueIntelligenceEngine


@pytest.mark.asyncio
async def test_revenue_recommendations_within_headroom():
    """Verify complementary recommendations fit strictly within remaining budget headroom."""
    with SessionLocal() as db:
        engine = RevenueIntelligenceEngine(db)
        # Cart with Keyboard (₹2,499), budget limit ₹4,000 -> Headroom = ₹1,501
        recs = engine.generate_recommendations(
            current_skus=["KB-MECH-001"],
            current_total_paise=249900,
            buyer_budget_paise=400000
        )
        assert len(recs) > 0
        for r in recs:
            assert r["recommended_price"] <= 150100
            assert r["new_projected_total_paise"] <= 400000
            assert r["policy_safe"] is True


@pytest.mark.asyncio
async def test_revenue_recommendations_empty_when_no_headroom():
    """Verify recommendations return empty when budget headroom is exhausted."""
    with SessionLocal() as db:
        engine = RevenueIntelligenceEngine(db)
        # Cart with Keyboard (₹2,499), budget limit ₹2,500 -> Headroom = ₹1
        recs = engine.generate_recommendations(
            current_skus=["KB-MECH-001"],
            current_total_paise=249900,
            buyer_budget_paise=250000
        )
        assert len(recs) == 0


@pytest.mark.asyncio
async def test_revenue_analytics_endpoint(async_client: AsyncClient):
    """Verify /analytics/revenue returns structured commerce metrics."""
    resp = await async_client.get("/analytics/revenue")
    assert resp.status_code == 200
    data = resp.json()
    assert "baseline_cart_value_paise" in data
    assert "incremental_revenue_paise" in data
    assert "optimized_cart_value_paise" in data
    assert data["incremental_revenue_paise"] == data["optimized_cart_value_paise"] - data["baseline_cart_value_paise"]


@pytest.mark.asyncio
async def test_observability_summary_endpoint(async_client: AsyncClient):
    """Verify /observability/summary returns latency percentiles and execution metrics."""
    resp = await async_client.get("/observability/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert "latency_ms" in data
    assert "total_agent_run_p50" in data["latency_ms"]
    assert "system_metrics" in data
