import pytest
from httpx import AsyncClient
from app.db.session import SessionLocal
from app.db.models import Product, Quote


@pytest.mark.asyncio
async def test_create_authoritative_quote(async_client: AsyncClient):
    """
    Verify creating an authoritative quote calculates server prices and generates HMAC signature.
    KB-MECH-001 (₹2,499.00 / 249900 paise) + 2 * MOUSE-WL-002 (₹1,299.00 / 129900 paise)
    Subtotal = 249900 + 259800 = 509700 paise (₹5,097.00)
    """
    payload = {
        "items": [
            {"sku": "KB-MECH-001", "quantity": 1},
            {"sku": "MOUSE-WL-002", "quantity": 2}
        ]
    }
    response = await async_client.post("/agent/cart/quote", json=payload)
    assert response.status_code == 201
    quote = response.json()
    assert quote["quote_id"].startswith("qt_")
    assert quote["currency"] == "INR"
    assert quote["subtotal"] == 249900 + 259800  # 509700 paise
    assert quote["total"] == 509700
    assert len(quote["signature"]) == 64
    assert len(quote["items"]) == 2


@pytest.mark.asyncio
async def test_quote_rejection_on_out_of_stock(async_client: AsyncClient):
    """
    Verify that requesting out-of-stock items (HEADSET-ANC-006) fails with HTTP 400.
    """
    payload = {
        "items": [
            {"sku": "HEADSET-ANC-006", "quantity": 1}
        ]
    }
    response = await async_client.post("/agent/cart/quote", json=payload)
    assert response.status_code == 400
    assert "Insufficient stock" in response.json()["detail"]


@pytest.mark.asyncio
async def test_quote_validation_lifecycle_and_stale_detection(async_client: AsyncClient):
    """
    Lifecycle test:
    1. Create quote for available product.
    2. Validate quote -> Expect VALID.
    3. Artificially drop product stock to 0 in DB.
    4. Re-validate quote -> Expect INVALID with INSUFFICIENT_STOCK reason.
    """
    # 1. Create quote
    payload = {
        "items": [
            {"sku": "STAND-ALUM-004", "quantity": 5}
        ]
    }
    resp_create = await async_client.post("/agent/cart/quote", json=payload)
    assert resp_create.status_code == 201
    quote = resp_create.json()
    quote_id = quote["quote_id"]
    signature = quote["signature"]

    # 2. Validate quote immediately
    resp_val1 = await async_client.post(
        "/agent/cart/validate",
        json={"quote_id": quote_id, "signature": signature}
    )
    assert resp_val1.status_code == 200
    val_data1 = resp_val1.json()
    assert val_data1["valid"] is True
    assert val_data1["reason"] is None

    # 3. Simulate external purchase decreasing stock below quote quantity
    with SessionLocal() as db:
        product = db.query(Product).filter(Product.sku == "STAND-ALUM-004").first()
        assert product is not None
        original_stock = product.stock_quantity
        product.stock_quantity = 2  # Less than the quoted quantity 5
        db.commit()

    try:
        # 4. Re-validate quote
        resp_val2 = await async_client.post(
            "/agent/cart/validate",
            json={"quote_id": quote_id, "signature": signature}
        )
        assert resp_val2.status_code == 200
        val_data2 = resp_val2.json()
        assert val_data2["valid"] is False
        assert val_data2["reason"] == "INSUFFICIENT_STOCK"
        assert val_data2["details"]["available_stock"] == 2
    finally:
        # Restore stock for remaining tests
        with SessionLocal() as db:
            prod = db.query(Product).filter(Product.sku == "STAND-ALUM-004").first()
            if prod:
                prod.stock_quantity = original_stock
                db.commit()


@pytest.mark.asyncio
async def test_quote_validation_fails_on_price_change(async_client: AsyncClient):
    """
    Verify that if the merchant changes the product price/version after quoting,
    the quote is invalidated with PRODUCT_STATE_CHANGED.
    """
    payload = {"items": [{"sku": "HUB-USBC-003", "quantity": 1}]}
    resp_create = await async_client.post("/agent/cart/quote", json=payload)
    assert resp_create.status_code == 201
    quote = resp_create.json()
    quote_id = quote["quote_id"]

    # Mutate price & version in DB
    with SessionLocal() as db:
        product = db.query(Product).filter(Product.sku == "HUB-USBC-003").first()
        original_price = product.price
        original_version = product.version
        product.price = 349900  # Price increased
        product.version = original_version + 1
        db.commit()

    try:
        resp_val = await async_client.post("/agent/cart/validate", json={"quote_id": quote_id})
        assert resp_val.status_code == 200
        val_data = resp_val.json()
        assert val_data["valid"] is False
        assert val_data["reason"] == "PRODUCT_STATE_CHANGED"
    finally:
        with SessionLocal() as db:
            prod = db.query(Product).filter(Product.sku == "HUB-USBC-003").first()
            if prod:
                prod.price = original_price
                prod.version = original_version
                db.commit()


@pytest.mark.asyncio
async def test_input_validation_and_security_bounds(async_client: AsyncClient):
    """
    Test input validation guards against negative quantities, zero quantities, and excessive items.
    """
    # Negative quantity
    resp1 = await async_client.post("/agent/cart/quote", json={"items": [{"sku": "KB-MECH-001", "quantity": -5}]})
    assert resp1.status_code == 422

    # Zero quantity
    resp2 = await async_client.post("/agent/cart/quote", json={"items": [{"sku": "KB-MECH-001", "quantity": 0}]})
    assert resp2.status_code == 422

    # Quantity over 100 limit
    resp3 = await async_client.post("/agent/cart/quote", json={"items": [{"sku": "KB-MECH-001", "quantity": 150}]})
    assert resp3.status_code == 422

    # Malformed SKU format
    resp4 = await async_client.post("/agent/cart/quote", json={"items": [{"sku": "SKU with Spaces!", "quantity": 1}]})
    assert resp4.status_code == 422
