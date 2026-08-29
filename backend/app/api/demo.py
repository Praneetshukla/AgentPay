import uuid
import hmac
import hashlib
import json
from typing import Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel

from app.core.config import settings
from app.db.session import get_db
from app.db.models import Product, Quote, Transaction, AuditEvent, TransactionStatus
from app.ledger.service import AuditLedgerService
from app.razorpay.webhooks import RazorpayWebhookProcessor

router = APIRouter(prefix="/demo", tags=["Failure Simulation Lab (Demo Only)"])


class StockUpdateRequest(BaseModel):
    sku: str
    stock_quantity: int


class PriceUpdateRequest(BaseModel):
    sku: str
    price_paise: int


class SimulateWebhookRequest(BaseModel):
    razorpay_order_id: str
    event: str = "payment.captured"  # payment.captured or payment.failed
    amount_override: Optional[int] = None
    tamper_signature: bool = False


@router.post(
    "/simulate-stock",
    status_code=status.HTTP_200_OK,
    summary="[Demo Only] Change Product Stock Quantity"
)
async def simulate_stock_change(
    request: StockUpdateRequest,
    db: Session = Depends(get_db)
):
    """Simulates real-time inventory loss to test autonomous agent recovery."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="Simulation endpoints are disabled in production mode")

    product = db.scalars(select(Product).where(Product.sku == request.sku.strip())).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.stock_quantity = request.stock_quantity
    product.version += 1
    db.commit()
    db.refresh(product)
    return {"sku": product.sku, "new_stock": product.stock_quantity, "version": product.version}


@router.post(
    "/simulate-price-change",
    status_code=status.HTTP_200_OK,
    summary="[Demo Only] Change Product Authoritative Price"
)
async def simulate_price_change(
    request: PriceUpdateRequest,
    db: Session = Depends(get_db)
):
    """Simulates product price change to invalidate cached quotes (stale quote test)."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="Simulation endpoints are disabled in production mode")

    product = db.scalars(select(Product).where(Product.sku == request.sku.strip())).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    product.price = request.price_paise
    product.version += 1
    db.commit()
    db.refresh(product)
    return {"sku": product.sku, "new_price_paise": product.price, "version": product.version}


@router.post(
    "/simulate-webhook",
    status_code=status.HTTP_200_OK,
    summary="[Demo Only] Simulate Razorpay Payment Webhook Delivery"
)
async def simulate_webhook(
    request: SimulateWebhookRequest,
    db: Session = Depends(get_db)
):
    """Simulates Razorpay payment webhook with authentic or fraudulent signatures."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="Simulation endpoints are disabled in production mode")

    tx = db.scalars(select(Transaction).where(Transaction.razorpay_order_id == request.razorpay_order_id.strip())).first()
    if not tx:
        raise HTTPException(status_code=404, detail=f"No transaction found with razorpay_order_id '{request.razorpay_order_id}'")

    amount = request.amount_override if request.amount_override is not None else tx.amount
    payment_id = f"pay_sim_{uuid.uuid4().hex[:14]}"

    webhook_payload = {
        "event": request.event,
        "payload": {
            "payment": {
                "entity": {
                    "id": payment_id,
                    "order_id": tx.razorpay_order_id,
                    "amount": amount,
                    "currency": tx.currency,
                    "status": "captured" if request.event == "payment.captured" else "failed",
                    "error_description": "Simulated card decline" if request.event == "payment.failed" else None
                }
            }
        }
    }
    raw_body = json.dumps(webhook_payload)

    if request.tamper_signature:
        signature = "0" * 64
    else:
        signature = hmac.new(
            settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
            raw_body.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()

    processor = RazorpayWebhookProcessor(db)
    success, code, details = processor.process_webhook(raw_body=raw_body, signature=signature)
    return {
        "webhook_processed": success,
        "code": code,
        "details": details,
        "transaction_status": tx.status.value
    }


@router.post(
    "/simulate-tamper-ledger",
    status_code=status.HTTP_200_OK,
    summary="[Demo Only] Tamper with Audit Ledger Record to Demonstrate Cryptographic Verification"
)
async def simulate_tamper_ledger(
    db: Session = Depends(get_db)
):
    """Mutates payload of the latest audit event in DB to prove hash-chain tamper detection."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="Simulation endpoints are disabled in production mode")

    event = db.query(AuditEvent).order_by(AuditEvent.id.desc()).first()
    if not event:
        audit_service = AuditLedgerService(db)
        event = audit_service.record_event(
            event_type="DEMO_INITIAL_EVENT",
            actor="demo_sim_setup",
            payload={"initial": True}
        )

    original_payload = dict(event.payload)
    event.payload = {"tampered": True, "malicious_modification": "Altered amount from ₹2,499 to ₹0.01"}
    db.commit()
    return {
        "tampered_event_id": event.id,
        "event_hash": event.event_hash,
        "original_payload": original_payload,
        "tampered_payload": event.payload,
        "message": "Audit event altered. Run GET /ledger/verify-chain to verify cryptographic failure."
    }


@router.post(
    "/reset",
    status_code=status.HTTP_200_OK,
    summary="[Demo Only] Reset Demo State, Stock, Policies, and Ledger"
)
async def reset_demo_state(
    db: Session = Depends(get_db)
):
    """Restores deterministic baseline catalog and stock for judge presentations."""
    if settings.ENVIRONMENT == "production":
        raise HTTPException(status_code=403, detail="Reset is disabled in production mode")

    from app.db.base import Base
    import app.db.models
    from app.db.session import engine
    from app.db.seed import seed_demo_catalog

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    seed_demo_catalog(db)

    return {
        "status": "reset_complete",
        "message": "Database, catalog, policies, and ledger successfully reset to baseline."
    }
