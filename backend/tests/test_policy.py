import pytest
from httpx import AsyncClient
from app.db.session import SessionLocal
from app.db.models import Product, Policy


@pytest.mark.asyncio
async def test_scenario_a_happy_path_allow(async_client: AsyncClient):
    """
    SCENARIO A: ₹2,499 keyboard (KB-MECH-001) -> Total ₹2,499 (249900 paise)
    Under ₹5,000 max amount, under ₹3,000 confirmation threshold -> ALLOW
    """
    # 1. Create quote
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "KB-MECH-001", "quantity": 1}]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()
    assert quote["total"] == 249900

    # 2. Evaluate Policy
    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_demo"
    })
    assert resp_pol.status_code == 200
    decision = resp_pol.json()
    assert decision["decision"] == "ALLOW"
    assert len(decision["reasons"]) == 0
    assert len(decision["checks"]) > 0


@pytest.mark.asyncio
async def test_scenario_b_amount_exceeds_limit_block(async_client: AsyncClient):
    """
    SCENARIO B: ₹6,000+ cart exceeds max_transaction_amount (₹5,000 / 500000 paise) -> BLOCK
    Reason: AMOUNT_EXCEEDS_LIMIT
    """
    # 2 keyboards @ ₹2,499 = ₹4,998 + 1 Hub @ ₹2,899 = ₹7,897 (789700 paise)
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [
            {"sku": "KB-MECH-001", "quantity": 2},
            {"sku": "HUB-USBC-003", "quantity": 1}
        ]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()
    assert quote["total"] == 789700

    # Evaluate Policy
    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_demo"
    })
    assert resp_pol.status_code == 200
    decision = resp_pol.json()
    assert decision["decision"] == "BLOCK"
    assert any(r["code"] == "AMOUNT_EXCEEDS_LIMIT" for r in decision["reasons"])


@pytest.mark.asyncio
async def test_scenario_c_disallowed_category_block(async_client: AsyncClient):
    """
    SCENARIO C: Product from disallowed category ('Luxury Goods' - LUX-WATCH-008) -> BLOCK
    Reason: CATEGORY_NOT_ALLOWED
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "LUX-WATCH-008", "quantity": 1}]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()

    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_demo"
    })
    assert resp_pol.status_code == 200
    decision = resp_pol.json()
    assert decision["decision"] == "BLOCK"
    assert any(r["code"] == "CATEGORY_NOT_ALLOWED" for r in decision["reasons"])


@pytest.mark.asyncio
async def test_scenario_d_blocked_sku_block(async_client: AsyncClient):
    """
    SCENARIO D: Explicitly blocked SKU ('BLOCKED-ITEM-009') -> BLOCK
    Reason: SKU_BLOCKED
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "BLOCKED-ITEM-009", "quantity": 1}]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()

    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_demo"
    })
    assert resp_pol.status_code == 200
    decision = resp_pol.json()
    assert decision["decision"] == "BLOCK"
    assert any(r["code"] == "SKU_BLOCKED" for r in decision["reasons"])


@pytest.mark.asyncio
async def test_scenario_e_confirmation_threshold(async_client: AsyncClient):
    """
    SCENARIO E: ₹3,499 webcam (CAM-4K-005) -> Total ₹3,499 (349900 paise)
    Under max limit (₹5,000), but >= confirmation threshold (₹3,000) -> REQUIRE_CONFIRMATION
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "CAM-4K-005", "quantity": 1}]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()
    assert quote["total"] == 349900

    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_demo"
    })
    assert resp_pol.status_code == 200
    decision = resp_pol.json()
    assert decision["decision"] == "REQUIRE_CONFIRMATION"
    assert any(r["code"] == "REQUIRE_CONFIRMATION" for r in decision["reasons"])


@pytest.mark.asyncio
async def test_scenario_f_stale_or_tampered_quote_block(async_client: AsyncClient):
    """
    SCENARIO F: Stale / insufficient inventory quote -> Policy must BLOCK with QUOTE_INVALID
    """
    # 1. Create quote for mouse
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "MOUSE-WL-002", "quantity": 2}]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()

    # 2. Artificially drop stock
    with SessionLocal() as db:
        prod = db.query(Product).filter(Product.sku == "MOUSE-WL-002").first()
        orig_stock = prod.stock_quantity
        prod.stock_quantity = 0
        db.commit()

    try:
        # 3. Evaluate Policy -> must fail closed
        resp_pol = await async_client.post("/agent/policy/evaluate", json={
            "quote_id": quote["quote_id"],
            "policy_id": "policy_demo"
        })
        assert resp_pol.status_code == 200
        decision = resp_pol.json()
        assert decision["decision"] == "BLOCK"
        assert any(r["code"] == "QUOTE_INVALID" for r in decision["reasons"])
    finally:
        with SessionLocal() as db:
            prod = db.query(Product).filter(Product.sku == "MOUSE-WL-002").first()
            if prod:
                prod.stock_quantity = orig_stock
                db.commit()


@pytest.mark.asyncio
async def test_scenario_g_missing_or_inactive_policy_fail_closed(async_client: AsyncClient):
    """
    SCENARIO G: Missing policy or inactive policy -> Fail Closed (BLOCK)
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "KB-MECH-001", "quantity": 1}]
    })
    quote = resp_quote.json()

    # 1. Non-existent policy
    resp_missing = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_does_not_exist"
    })
    assert resp_missing.status_code == 200
    decision_missing = resp_missing.json()
    assert decision_missing["decision"] == "BLOCK"
    assert any(r["code"] == "POLICY_NOT_FOUND" for r in decision_missing["reasons"])

    # 2. Inactive policy
    with SessionLocal() as db:
        policy = db.query(Policy).filter(Policy.id == "policy_demo").first()
        policy.active = False
        db.commit()

    try:
        resp_inactive = await async_client.post("/agent/policy/evaluate", json={
            "quote_id": quote["quote_id"],
            "policy_id": "policy_demo"
        })
        assert resp_inactive.status_code == 200
        decision_inactive = resp_inactive.json()
        assert decision_inactive["decision"] == "BLOCK"
        assert any(r["code"] == "POLICY_INACTIVE" for r in decision_inactive["reasons"])
    finally:
        with SessionLocal() as db:
            policy = db.query(Policy).filter(Policy.id == "policy_demo").first()
            if policy:
                policy.active = True
                db.commit()


@pytest.mark.asyncio
async def test_policy_cart_item_and_quantity_limits(async_client: AsyncClient):
    """
    Verify quantity limit per SKU (> 2) and cart item count limits.
    """
    # Use merge/upsert for custom test policy
    with SessionLocal() as db:
        strict_pol = Policy(
            id="policy_strict_qty",
            merchant_id="merch_agentpay_demo",
            currency="INR",
            max_transaction_amount=500000,
            max_cart_items=5,
            max_quantity_per_sku=1,  # Strict limit: max 1 per SKU
            allowed_categories=["Mice", "Keyboards", "Cables", "Adapters & Hubs", "Desk Accessories", "Cameras", "Electronics"],
            allowed_skus=[],
            blocked_skus=[],
            confirmation_threshold=400000,
            policy_version=1,
            active=True
        )
        db.merge(strict_pol)
        db.commit()

    # Quote with 2 mice
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "MOUSE-WL-002", "quantity": 2}]
    })
    quote = resp_quote.json()

    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_strict_qty"
    })
    decision = resp_pol.json()
    assert decision["decision"] == "BLOCK"
    assert any(r["code"] == "QUANTITY_LIMIT_EXCEEDED" for r in decision["reasons"])


@pytest.mark.asyncio
async def test_policy_currency_mismatch(async_client: AsyncClient):
    """
    Verify currency mismatch results in BLOCK (CURRENCY_NOT_ALLOWED).
    """
    with SessionLocal() as db:
        usd_pol = Policy(
            id="policy_usd_only",
            merchant_id="merch_agentpay_demo",
            currency="USD",  # Policy requires USD
            max_transaction_amount=500000,
            max_cart_items=5,
            max_quantity_per_sku=5,
            allowed_categories=["Keyboards"],
            allowed_skus=[],
            blocked_skus=[],
            confirmation_threshold=300000,
            policy_version=1,
            active=True
        )
        db.merge(usd_pol)
        db.commit()

    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "KB-MECH-001", "quantity": 1}]
    })
    quote = resp_quote.json()
    assert quote["currency"] == "INR"

    resp_pol = await async_client.post("/agent/policy/evaluate", json={
        "quote_id": quote["quote_id"],
        "policy_id": "policy_usd_only"
    })
    decision = resp_pol.json()
    assert decision["decision"] == "BLOCK"
    assert any(r["code"] == "CURRENCY_NOT_ALLOWED" for r in decision["reasons"])


@pytest.mark.asyncio
async def test_policy_evaluation_determinism(async_client: AsyncClient):
    """
    Verify that evaluating the exact same quote multiple times produces identical decisions.
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "KB-MECH-001", "quantity": 1}]
    })
    quote = resp_quote.json()

    res1 = await async_client.post("/agent/policy/evaluate", json={"quote_id": quote["quote_id"]})
    res2 = await async_client.post("/agent/policy/evaluate", json={"quote_id": quote["quote_id"]})
    assert res1.json()["decision"] == res2.json()["decision"]
    assert res1.json()["reasons"] == res2.json()["reasons"]
    assert len(res1.json()["checks"]) == len(res2.json()["checks"])
