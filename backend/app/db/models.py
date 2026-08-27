import uuid
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List
from sqlalchemy import String, Integer, Boolean, DateTime, JSON, ForeignKey, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class TransactionStatus(str, Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


# Valid State Transitions
VALID_STATUS_TRANSITIONS: Dict[TransactionStatus, List[TransactionStatus]] = {
    TransactionStatus.CREATED: [TransactionStatus.AUTHORIZED, TransactionStatus.FAILED, TransactionStatus.CANCELLED],
    TransactionStatus.AUTHORIZED: [TransactionStatus.PAYMENT_PENDING, TransactionStatus.CANCELLED, TransactionStatus.FAILED],
    TransactionStatus.PAYMENT_PENDING: [TransactionStatus.PAID, TransactionStatus.FAILED, TransactionStatus.EXPIRED, TransactionStatus.CANCELLED],
    TransactionStatus.PAID: [],  # Terminal state: Cannot transition backwards
    TransactionStatus.FAILED: [],  # Terminal state
    TransactionStatus.CANCELLED: [],  # Terminal state
    TransactionStatus.EXPIRED: []  # Terminal state
}


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    price: Mapped[int] = mapped_column(Integer, nullable=False)  # Price in smallest currency unit (e.g. Paise for INR, 500000 = ₹5000.00)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # Incremented on every price/stock change
    attributes: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"qt_{uuid.uuid4().hex[:16]}")
    merchant_id: Mapped[str] = mapped_column(String(64), default="merch_agentpay_demo", nullable=False)
    subtotal: Mapped[int] = mapped_column(Integer, nullable=False)
    discounts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total: Mapped[int] = mapped_column(Integer, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    signature: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Items in this quote
    items: Mapped[list["QuoteItem"]] = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")


class QuoteItem(Base):
    __tablename__ = "quote_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    quote_id: Mapped[str] = mapped_column(String(36), ForeignKey("quotes.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id: Mapped[str] = mapped_column(String(36), ForeignKey("products.id"), nullable=False)
    sku: Mapped[str] = mapped_column(String(64), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[int] = mapped_column(Integer, nullable=False)
    product_version: Mapped[int] = mapped_column(Integer, nullable=False)  # Version at quote creation time

    quote: Mapped["Quote"] = relationship("Quote", back_populates="items")
    product: Mapped["Product"] = relationship("Product")


class Policy(Base):
    __tablename__ = "policies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default="policy_demo")
    merchant_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    max_transaction_amount: Mapped[int] = mapped_column(Integer, nullable=False)  # in paise, e.g. 500000 = ₹5,000.00
    max_cart_items: Mapped[int] = mapped_column(Integer, default=5, nullable=False)
    max_quantity_per_sku: Mapped[int] = mapped_column(Integer, default=2, nullable=False)
    allowed_categories: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    allowed_skus: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)  # empty list = any non-blocked SKU allowed
    blocked_skus: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    confirmation_threshold: Mapped[int] = mapped_column(Integer, nullable=False)  # in paise, e.g. 300000 = ₹3,000.00
    policy_version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True, default=lambda: f"tx_{uuid.uuid4().hex[:16]}")
    quote_id: Mapped[str] = mapped_column(String(36), ForeignKey("quotes.id"), unique=True, nullable=False, index=True)
    policy_id: Mapped[str] = mapped_column(String(64), nullable=False)
    policy_version: Mapped[int] = mapped_column(Integer, nullable=False)
    razorpay_order_id: Mapped[Optional[str]] = mapped_column(String(64), unique=True, nullable=True, index=True)
    razorpay_payment_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # in paise
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        SQLEnum(TransactionStatus),
        default=TransactionStatus.CREATED,
        nullable=False,
        index=True
    )
    failure_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    metadata_payload: Mapped[Dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    quote: Mapped["Quote"] = relationship("Quote")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, default=lambda: f"evt_{uuid.uuid4().hex[:16]}", index=True)
    transaction_id: Mapped[Optional[str]] = mapped_column(String(64), ForeignKey("transactions.id"), nullable=True, index=True)
    quote_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    actor: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JSON, nullable=False)
    previous_event_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    event_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True
    )
