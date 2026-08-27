from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class RazorpayOrderCreate(BaseModel):
    amount: int = Field(..., gt=0, description="Amount in smallest currency unit (paise)")
    currency: str = Field(default="INR", min_length=3, max_length=3)
    receipt: str = Field(..., min_length=1, max_length=40)
    notes: Dict[str, Any] = Field(default_factory=dict)


class RazorpayOrderResponse(BaseModel):
    id: str
    amount: int
    currency: str
    receipt: str
    status: str
    created_at: int
    notes: Dict[str, Any] = Field(default_factory=dict)


class CheckoutExecuteRequest(BaseModel):
    quote_id: str = Field(..., min_length=1, max_length=64, description="Authoritative quote ID to execute")
    policy_id: str = Field(default="policy_demo", min_length=1, max_length=64)


class CheckoutExecuteResponse(BaseModel):
    success: bool
    status: str
    transaction_id: Optional[str] = None
    razorpay_order_id: Optional[str] = None
    amount: Optional[int] = None
    currency: Optional[str] = None
    decision: Optional[str] = None
    reason: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
