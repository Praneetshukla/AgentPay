import pytest
import hmac
import hashlib
import json
from httpx import AsyncClient
from app.db.session import SessionLocal
from app.db.models import Product, Transaction, AuditEvent, TransactionStatus
from app.ledger.service import AuditLedgerService, calculate_event_hash
from app.core.config import settings


@pytest.mark.asyncio
async def test_execution_allow_creates_order(async_client: AsyncClient):
    """
    Test that an ALLOW-decision quote executes cleanly into a PAYMENT_PENDING transaction with Razorpay order ID.
    """
    # 1. Create quote for ₹2,499 keyboard
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "KB-MECH-001", "quantity": 1}]
    })
    assert resp_quote.status_code == 201
    quote = resp_quote.json()
    quote_id = quote["quote_id"]

    # 2. Execute Checkout
    resp_exec = await async_client.post("/agent/checkout/execute", json={
        "quote_id": quote_id,
        "policy_id": "policy_demo"
    })
    assert resp_exec.status_code == 200
    exec_data = resp_exec.json()
    assert exec_data["success"] is True
    assert exec_data["status"] == "PAYMENT_PENDING"
    assert exec_data["decision"] == "ALLOW"
    assert exec_data["razorpay_order_id"] is not None
    assert exec_data["amount"] == 249900


@pytest.mark.asyncio
async def test_execution_block_does_not_call_razorpay(async_client: AsyncClient):
    """
    Test that a BLOCKED policy decision (amount > ₹5,000) prevents any Razorpay order creation.
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [
            {"sku": "KB-MECH-001", "quantity": 2},
            {"sku": "HUB-USBC-003", "quantity": 1}
        ]
    })
    quote = resp_quote.json()
    quote_id = quote["quote_id"]

    resp_exec = await async_client.post("/agent/checkout/execute", json={
        "quote_id": quote_id,
        "policy_id": "policy_demo"
    })
    assert resp_exec.status_code == 200
    exec_data = resp_exec.json()
    assert exec_data["success"] is False
    assert exec_data["status"] == "BLOCKED"
    assert exec_data["decision"] == "BLOCK"
    assert exec_data["razorpay_order_id"] is None


@pytest.mark.asyncio
async def test_execution_confirmation_required_does_not_call_razorpay(async_client: AsyncClient):
    """
    Test that REQUIRE_CONFIRMATION halts checkout execution safely.
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "CAM-4K-005", "quantity": 1}]
    })
    quote = resp_quote.json()
    quote_id = quote["quote_id"]

    resp_exec = await async_client.post("/agent/checkout/execute", json={
        "quote_id": quote_id,
        "policy_id": "policy_demo"
    })
    assert resp_exec.status_code == 200
    exec_data = resp_exec.json()
    assert exec_data["success"] is False
    assert exec_data["status"] == "REQUIRE_CONFIRMATION"
    assert exec_data["decision"] == "REQUIRE_CONFIRMATION"
    assert exec_data["razorpay_order_id"] is None


@pytest.mark.asyncio
async def test_duplicate_execution_idempotency(async_client: AsyncClient):
    """
    Test that submitting the same quote twice returns the same transaction without creating duplicate orders.
    """
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "STAND-ALUM-004", "quantity": 1}]
    })
    quote = resp_quote.json()
    quote_id = quote["quote_id"]

    # First execution
    res1 = await async_client.post("/agent/checkout/execute", json={"quote_id": quote_id})
    assert res1.status_code == 200
    data1 = res1.json()

    # Second execution
    res2 = await async_client.post("/agent/checkout/execute", json={"quote_id": quote_id})
    assert res2.status_code == 200
    data2 = res2.json()

    assert data1["transaction_id"] == data2["transaction_id"]
    assert data1["razorpay_order_id"] == data2["razorpay_order_id"]
    assert data2["details"]["idempotent"] is True


@pytest.mark.asyncio
async def test_webhook_payment_captured_lifecycle(async_client: AsyncClient):
    """
    Test valid Razorpay payment.captured webhook changes transaction status to PAID.
    """
    # 1. Execute Checkout
    resp_quote = await async_client.post("/agent/cart/quote", json={
        "items": [{"sku": "MOUSE-WL-002", "quantity": 1}]
    })
    quote = resp_quote.json()
    res_exec = await async_client.post("/agent/checkout/execute", json={"quote_id": quote["quote_id"]})
    exec_data = res_exec.json()
    razorpay_order_id = exec_data["razorpay_order_id"]
    transaction_id = exec_data["transaction_id"]
    amount = exec_data["amount"]

    # 2. Forge Webhook payload
    webhook_body = json.dumps({
        "event": "payment.captured",
        "payload": {
            "payment": {
                "entity": {
                    "id": "pay_test_987654321",
                    "order_id": razorpay_order_id,
                    "amount": amount,
                    "currency": "INR",
                    "status": "captured"
                }
            }
        }
    })
    signature = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        webhook_body.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    # 3. Post Webhook
    resp_wh = await async_client.post(
        "/webhooks/razorpay",
        content=webhook_body,
        headers={"X-Razorpay-Signature": signature, "Content-Type": "application/json"}
    )
    assert resp_wh.status_code == 200
    wh_data = resp_wh.json()
    assert wh_data["status"] == "success"
    assert wh_data["code"] == "PAYMENT_CAPTURED"
    assert wh_data["transaction_status"] == "PAID"

    # 4. Verify DB state is PAID
    with SessionLocal() as db:
        tx = db.query(Transaction).filter(Transaction.id == transaction_id).first()
        assert tx is not None
        assert tx.status == TransactionStatus.PAID
        assert tx.razorpay_payment_id == "pay_test_987654321"


@pytest.mark.asyncio
async def test_webhook_invalid_signature_rejected(async_client: AsyncClient):
    """
    Test webhook with fraudulent signature is rejected with HTTP 400.
    """
    webhook_body = json.dumps({"event": "payment.captured", "payload": {}})
    bad_signature = "0" * 64

    resp_wh = await async_client.post(
        "/webhooks/razorpay",
        content=webhook_body,
        headers={"X-Razorpay-Signature": bad_signature, "Content-Type": "application/json"}
    )
    assert resp_wh.status_code == 400


@pytest.mark.asyncio
async def test_audit_ledger_chain_verification_and_tamper_detection(async_client: AsyncClient):
    """
    Test:
    1. Query audit chain verification endpoint -> valid == True.
    2. Tamper with an event payload in database.
    3. Re-verify audit chain -> valid == False with error reason.
    """
    # 1. Check healthy chain
    res_verify1 = await async_client.get("/ledger/verify-chain")
    assert res_verify1.status_code == 200
    data1 = res_verify1.json()
    assert data1["valid"] is True

    # 2. Tamper with latest audit event in DB
    with SessionLocal() as db:
        event = db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
        assert event is not None
        tampered_id = event.id
        event.payload = {"tampered_key": "tampered_value"}
        db.commit()

    # 3. Check broken chain
    res_verify2 = await async_client.get("/ledger/verify-chain")
    assert res_verify2.status_code == 200
    data2 = res_verify2.json()
    assert data2["valid"] is False
    assert "Tampered event payload" in data2["error_reason"]
    assert data2["failed_event_id"] == tampered_id
