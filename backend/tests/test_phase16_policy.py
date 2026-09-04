import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_policy_summary(async_client: AsyncClient):
    """Verify GET /agent/policy/{policy_id}/summary returns live database-backed metrics."""
    resp = await async_client.get("/agent/policy/policy_demo/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["policy_id"] == "policy_demo"
    assert "total_spent_paise" in data
    assert "available_headroom_paise" in data
    assert "successful_transactions_count" in data
    assert data["max_transaction_amount"] > 0
    assert data["confirmation_threshold"] > 0
    assert data["available_headroom_paise"] == max(0, data["max_transaction_amount"] - data["total_spent_paise"])


@pytest.mark.asyncio
async def test_patch_policy_constraints_and_audit(async_client: AsyncClient):
    """Verify PATCH /agent/policy/{policy_id} updates limits and increments policy version."""
    # 1. Read current version
    resp_init = await async_client.get("/agent/policy/policy_demo")
    assert resp_init.status_code == 200
    v0 = resp_init.json()["policy_version"]

    # 2. Patch policy ceiling to 480,000 paise (₹4,800)
    resp_patch = await async_client.patch(
        "/agent/policy/policy_demo",
        json={"max_transaction_amount": 480000, "confirmation_threshold": 320000}
    )
    assert resp_patch.status_code == 200
    patched = resp_patch.json()
    assert patched["policy_version"] == v0 + 1
    assert patched["max_transaction_amount"] == 480000
    assert patched["confirmation_threshold"] == 320000

    # 3. Verify audit event logged
    resp_events = await async_client.get("/ledger/events?limit=5")
    assert resp_events.status_code == 200
    events = resp_events.json()
    assert any(e["event_type"] == "POLICY_UPDATED" for e in events)


@pytest.mark.asyncio
async def test_patch_policy_invalid_boundary(async_client: AsyncClient):
    """Verify invalid policy boundaries are rejected."""
    resp = await async_client.patch(
        "/agent/policy/policy_demo",
        json={"max_transaction_amount": -100}
    )
    assert resp.status_code == 422 or resp.status_code == 400
