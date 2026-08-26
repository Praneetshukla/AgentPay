from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, ConfigDict


# ==========================================
# Product Schemas
# ==========================================

class ProductRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    sku: str
    name: str
    description: str
    category: str
    price: int = Field(..., description="Price in smallest currency unit (e.g. Paise for INR)")
    currency: str
    stock_quantity: int
    version: int
    attributes: Dict[str, Any]
    active: bool


class CatalogCapabilities(BaseModel):
    merchant_id: str
    merchant_name: str
    version: str
    currency: str
    endpoints: Dict[str, str]
    capabilities: List[str]
    purchase_constraints: Dict[str, Any]


# ==========================================
# Cart & Quote Request/Response Schemas
# ==========================================

class CartItemRequest(BaseModel):
    sku: str = Field(..., min_length=1, max_length=64, pattern=r"^[A-Za-z0-9\-_]+$")
    quantity: int = Field(..., gt=0, le=100, description="Quantity must be a positive integer <= 100")


class QuoteRequest(BaseModel):
    items: List[CartItemRequest] = Field(..., min_length=1, max_length=50)


class QuoteItemRead(BaseModel):
    sku: str
    name: str
    quantity: int
    unit_price: int
    subtotal: int
    product_version: int


class QuoteResponse(BaseModel):
    quote_id: str
    merchant_id: str
    currency: str
    items: List[QuoteItemRead]
    subtotal: int
    discounts: int
    total: int
    created_at: datetime
    expires_at: datetime
    signature: str


# ==========================================
# Quote Validation Schemas
# ==========================================

class QuoteValidateRequest(BaseModel):
    quote_id: str = Field(..., min_length=1, max_length=64)
    signature: Optional[str] = None  # Optional client-provided signature check, or validates database quote


class QuoteValidateResponse(BaseModel):
    valid: bool
    quote_id: str
    reason: Optional[str] = None  # QUOTE_NOT_FOUND, QUOTE_EXPIRED, INVALID_SIGNATURE, INSUFFICIENT_STOCK, PRODUCT_UNAVAILABLE, PRODUCT_STATE_CHANGED
    details: Optional[Dict[str, Any]] = None
