from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict
from app.guards.decisions import PolicyDecisionType, PolicyCheckCode


class PolicyCheckResult(BaseModel):
    check_name: str
    passed: bool
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class PolicyReason(BaseModel):
    code: str
    message: str
    details: Dict[str, Any] = Field(default_factory=dict)


class PolicyDecision(BaseModel):
    decision: PolicyDecisionType
    policy_id: Optional[str] = None
    policy_version: Optional[int] = None
    quote_id: Optional[str] = None
    merchant_id: Optional[str] = None
    transaction_amount_paise: Optional[int] = None
    currency: Optional[str] = None
    reasons: List[PolicyReason] = Field(default_factory=list)
    checks: List[PolicyCheckResult] = Field(default_factory=list)
    evaluated_at: datetime = Field(default_factory=datetime.utcnow)
    evaluation_version: str = "1.0.0"


class PolicyEvaluateRequest(BaseModel):
    quote_id: str = Field(..., min_length=1, max_length=64, description="Authoritative server quote ID to evaluate")
    policy_id: str = Field(default="policy_demo", min_length=1, max_length=64, description="Policy ID to evaluate against")


class PolicyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    merchant_id: str
    currency: str
    max_transaction_amount: int
    max_cart_items: int
    max_quantity_per_sku: int
    allowed_categories: List[str]
    allowed_skus: List[str]
    blocked_skus: List[str]
    confirmation_threshold: int
    policy_version: int
    active: bool
    created_at: datetime
    updated_at: datetime


class PolicyUpdateRequest(BaseModel):
    max_transaction_amount: Optional[int] = Field(None, ge=100, le=5000000, description="Max transaction amount in paise")
    confirmation_threshold: Optional[int] = Field(None, ge=100, le=5000000, description="Confirmation threshold in paise")
    allowed_categories: Optional[List[str]] = Field(None, description="Allowed category whitelists")
    max_cart_items: Optional[int] = Field(None, ge=1, le=20, description="Max items per cart")
    max_quantity_per_sku: Optional[int] = Field(None, ge=1, le=10, description="Max quantity per SKU")


class PolicySummaryRead(BaseModel):
    policy_id: str
    policy_version: int
    merchant_id: str
    currency: str
    max_transaction_amount: int
    confirmation_threshold: int
    total_spent_paise: int
    available_headroom_paise: int
    successful_transactions_count: int
    allowed_categories: List[str]
    max_cart_items: int
    max_quantity_per_sku: int
    active: bool
    last_updated: datetime
