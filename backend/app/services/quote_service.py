import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Tuple, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status

from app.db.models import Product, Quote, QuoteItem
from app.schemas.catalog import QuoteRequest, QuoteResponse, QuoteItemRead, QuoteValidateResponse
from app.core.security import generate_quote_signature, verify_quote_signature


# Default quote TTL = 15 minutes
QUOTE_TTL_SECONDS = 900


def build_canonical_quote_dict(
    quote_id: str,
    merchant_id: str,
    currency: str,
    subtotal: int,
    discounts: int,
    total: int,
    expires_at_epoch: int,
    items: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Build a canonical representation of a quote dictionary for HMAC SHA-256 signing.
    Items list is sorted deterministically by SKU.
    """
    sorted_items = sorted(items, key=lambda x: x["sku"])
    return {
        "quote_id": quote_id,
        "merchant_id": merchant_id,
        "currency": currency,
        "subtotal": subtotal,
        "discounts": discounts,
        "total": total,
        "expires_at": expires_at_epoch,
        "items": sorted_items
    }


class QuoteService:
    def __init__(self, db: Session):
        self.db = db

    def create_authoritative_quote(self, request: QuoteRequest) -> QuoteResponse:
        """
        Calculates an authoritative server-side quote.
        Prices are strictly read from the database, never accepted from the caller.
        """
        # Deduplicate requested items by SKU, aggregating quantities
        item_qty_map: Dict[str, int] = {}
        for req_item in request.items:
            sku = req_item.sku.strip()
            item_qty_map[sku] = item_qty_map.get(sku, 0) + req_item.quantity

        # Enforce max aggregate item count
        for sku, qty in item_qty_map.items():
            if qty > 100:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Total requested quantity for SKU '{sku}' exceeds limit of 100."
                )

        # Retrieve and lock products for consistent read
        skus = list(item_qty_map.keys())
        products = list(self.db.scalars(select(Product).where(Product.sku.in_(skus))).all())
        product_map = {p.sku: p for p in products}

        # Check for missing SKUs
        for sku in skus:
            if sku not in product_map:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Product with SKU '{sku}' not found."
                )

        quote_id = f"qt_{uuid.uuid4().hex[:16]}"
        merchant_id = "merch_agentpay_demo"
        currency = "INR"
        subtotal = 0
        discounts = 0
        
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(seconds=QUOTE_TTL_SECONDS)
        expires_at_epoch = int(expires_at.timestamp())

        quote_items_models: List[QuoteItem] = []
        quote_items_read: List[QuoteItemRead] = []
        canonical_items_for_signature: List[Dict[str, Any]] = []

        for sku, qty in item_qty_map.items():
            product = product_map[sku]

            if not product.active:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Product '{product.name}' ({sku}) is currently inactive."
                )

            if product.stock_quantity < qty:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Insufficient stock for '{product.name}' ({sku}). Requested: {qty}, Available: {product.stock_quantity}"
                )

            line_subtotal = product.price * qty
            subtotal += line_subtotal

            # For canonical signature
            canonical_items_for_signature.append({
                "sku": product.sku,
                "quantity": qty,
                "unit_price": product.price,
                "product_version": product.version
            })

            # For Response Read Schema
            quote_items_read.append(QuoteItemRead(
                sku=product.sku,
                name=product.name,
                quantity=qty,
                unit_price=product.price,
                subtotal=line_subtotal,
                product_version=product.version
            ))

            # Database model
            quote_items_models.append(QuoteItem(
                id=str(uuid.uuid4()),
                quote_id=quote_id,
                product_id=product.id,
                sku=product.sku,
                quantity=qty,
                unit_price=product.price,
                product_version=product.version
            ))

        total = subtotal - discounts

        # Sign canonical payload
        canonical_dict = build_canonical_quote_dict(
            quote_id=quote_id,
            merchant_id=merchant_id,
            currency=currency,
            subtotal=subtotal,
            discounts=discounts,
            total=total,
            expires_at_epoch=expires_at_epoch,
            items=canonical_items_for_signature
        )
        signature = generate_quote_signature(canonical_dict)

        # Save Quote & items to DB
        quote_model = Quote(
            id=quote_id,
            merchant_id=merchant_id,
            subtotal=subtotal,
            discounts=discounts,
            total=total,
            currency=currency,
            signature=signature,
            created_at=now,
            expires_at=expires_at,
            items=quote_items_models
        )
        self.db.add(quote_model)
        self.db.commit()

        return QuoteResponse(
            quote_id=quote_id,
            merchant_id=merchant_id,
            currency=currency,
            items=quote_items_read,
            subtotal=subtotal,
            discounts=discounts,
            total=total,
            created_at=now,
            expires_at=expires_at,
            signature=signature
        )

    def validate_quote(self, quote_id: str, candidate_signature: Optional[str] = None) -> QuoteValidateResponse:
        """
        Validates an existing quote against current database state, expiration, inventory, and signature integrity.
        """
        quote = self.db.scalars(select(Quote).where(Quote.id == quote_id)).first()
        if not quote:
            return QuoteValidateResponse(
                valid=False,
                quote_id=quote_id,
                reason="QUOTE_NOT_FOUND",
                details={"message": f"Quote with ID '{quote_id}' does not exist."}
            )

        now = datetime.now(timezone.utc)
        # Ensure quote.expires_at is timezone-aware for comparison
        expires_at = quote.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if now > expires_at:
            return QuoteValidateResponse(
                valid=False,
                quote_id=quote_id,
                reason="QUOTE_EXPIRED",
                details={"expires_at": expires_at.isoformat(), "current_time": now.isoformat()}
            )

        # Re-construct canonical quote dict from DB representation to verify signature
        canonical_items = []
        for item in quote.items:
            canonical_items.append({
                "sku": item.sku,
                "quantity": item.quantity,
                "unit_price": item.unit_price,
                "product_version": item.product_version
            })

        canonical_dict = build_canonical_quote_dict(
            quote_id=quote.id,
            merchant_id=quote.merchant_id,
            currency=quote.currency,
            subtotal=quote.subtotal,
            discounts=quote.discounts,
            total=quote.total,
            expires_at_epoch=int(expires_at.timestamp()),
            items=canonical_items
        )

        # Check DB stored signature integrity
        if not verify_quote_signature(canonical_dict, quote.signature):
            return QuoteValidateResponse(
                valid=False,
                quote_id=quote_id,
                reason="INVALID_SIGNATURE",
                details={"message": "Server-side stored quote signature integrity check failed."}
            )

        # If candidate signature was provided in request, check it matches stored signature
        if candidate_signature and not verify_quote_signature(canonical_dict, candidate_signature):
            return QuoteValidateResponse(
                valid=False,
                quote_id=quote_id,
                reason="INVALID_SIGNATURE",
                details={"message": "Provided quote signature does not match authoritative signature."}
            )

        # Re-verify product availability, active status, and real-time inventory
        for item in quote.items:
            product = self.db.scalars(select(Product).where(Product.id == item.product_id)).first()
            if not product or not product.active:
                return QuoteValidateResponse(
                    valid=False,
                    quote_id=quote_id,
                    reason="PRODUCT_UNAVAILABLE",
                    details={"sku": item.sku, "message": f"Product '{item.sku}' is no longer active or available."}
                )

            if product.stock_quantity < item.quantity:
                return QuoteValidateResponse(
                    valid=False,
                    quote_id=quote_id,
                    reason="INSUFFICIENT_STOCK",
                    details={
                        "sku": item.sku,
                        "requested_quantity": item.quantity,
                        "available_stock": product.stock_quantity
                    }
                )

            if product.price != item.unit_price:
                return QuoteValidateResponse(
                    valid=False,
                    quote_id=quote_id,
                    reason="PRODUCT_STATE_CHANGED",
                    details={
                        "sku": item.sku,
                        "quoted_price": item.unit_price,
                        "current_price": product.price
                    }
                )

        return QuoteValidateResponse(
            valid=True,
            quote_id=quote_id,
            reason=None,
            details={"status": "AUTHORITATIVE_AND_VALID"}
        )
