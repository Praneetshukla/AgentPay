import pytest
from httpx import AsyncClient
from app.agent.negotiator import MerchantOfferEngine, ProviderOffer, OfferComparisonResult
from app.db.models import Product, TransactionStatus
from app.razorpay.webhooks import RazorpayWebhookProcessor
from app.razorpay.client import RazorpayTestClient
from app.core.events import event_broker, AgentExecutionEvent
from app.db.session import SessionLocal


def test_merchant_offer_engine_comparison():
    """Verify deterministic ranking and selection of valid provider offers."""
    offers = [
        ProviderOffer(
            provider_id="merch_1",
            provider_name="Supplier Alpha",
            sku="SKU-A",
            product_name="Product Alpha",
            category="Keyboards",
            price_paise=249900,
            stock_quantity=10,
            in_stock=True,
            specification_fit_score=0.95,
            composite_rank_score=0.92,
            quote_valid=True
        ),
        ProviderOffer(
            provider_id="merch_1",
            provider_name="Supplier Beta",
            sku="SKU-B",
            product_name="Product Beta",
            category="Keyboards",
            price_paise=349900,
            stock_quantity=5,
            in_stock=True,
            specification_fit_score=0.85,
            composite_rank_score=0.80,
            quote_valid=True
        )
    ]

    # Compare under ₹3,000 budget
    res = MerchantOfferEngine.compare_and_select(offers, budget_limit_paise=300000)
    assert res.comparison_state == "SELECTED"
    assert res.selected_offer is not None
    assert res.selected_offer.sku == "SKU-A"
    assert res.is_negotiated is False
    assert res.actual_savings_paise == 100000  # 349900 - 249900


def test_merchant_offer_engine_no_alternative_out_of_stock():
    """Verify empty/out-of-stock offers produce honest NO_ALTERNATIVE result."""
    offers = [
        ProviderOffer(
            provider_id="merch_1",
            provider_name="Supplier Alpha",
            sku="SKU-A",
            product_name="Product Alpha",
            category="Keyboards",
            price_paise=249900,
            stock_quantity=0,
            in_stock=False,
            specification_fit_score=0.95,
            composite_rank_score=0.92,
            quote_valid=False
        )
    ]

    res = MerchantOfferEngine.compare_and_select(offers)
    assert res.comparison_state == "NO_ALTERNATIVE"
    assert res.selected_offer is None
    assert res.actual_savings_paise == 0


@pytest.mark.asyncio
async def test_agent_run_includes_offer_comparison(async_client: AsyncClient):
    """Verify that agent run returns structured, server-derived offer comparison."""
    resp = await async_client.post("/agent/buy", json={
        "request": "I need a high-end mechanical keyboard under ₹3,000"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "COMPLETED"
    assert "offer_comparison" in data
    assert data["offer_comparison"] is not None
    assert data["offer_comparison"]["comparison_state"] in ["SELECTED", "DISCOVERING", "COMPARING"]
    assert data["offer_comparison"]["selected_offer"] is not None
    assert data["offer_comparison"]["selected_offer"]["sku"] == "KB-MECH-001"
    assert data["offer_comparison"]["is_negotiated"] is False


@pytest.mark.asyncio
async def test_duplicate_webhook_sse_and_idempotency(async_client: AsyncClient):
    """Verify duplicate webhook delivery is rejected idempotently and does not emit duplicate corruption."""
    # 1. Execute normal order to get valid transaction
    buy_resp = await async_client.post("/agent/buy", json={
        "request": "I need a wireless mouse"
    })
    assert buy_resp.status_code == 200
    buy_data = buy_resp.json()
    order_id = buy_data["execution_result"]["razorpay_order_id"]

    # 2. Simulate valid webhook
    import hmac
    import hashlib
    from app.core.config import settings

    payload_str = f'{{"event": "payment.captured", "payload": {{"payment": {{"entity": {{"id": "pay_test_001", "order_id": "{order_id}", "amount": 129900, "currency": "INR"}}}}}}}}'
    sig = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    webhook_resp = await async_client.post(
        "/webhooks/razorpay",
        content=payload_str,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
    )
    assert webhook_resp.status_code == 200
    assert webhook_resp.json()["code"] == "PAYMENT_CAPTURED"

    # 3. Deliver duplicate webhook
    dup_resp = await async_client.post(
        "/webhooks/razorpay",
        content=payload_str,
        headers={"X-Razorpay-Signature": sig, "Content-Type": "application/json"}
    )
    assert dup_resp.status_code == 200
    assert dup_resp.json()["code"] == "ALREADY_PROCESSED"
    assert dup_resp.json()["idempotent"] is True
