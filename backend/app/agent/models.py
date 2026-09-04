from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BuyerIntent(BaseModel):
    user_goal: str
    target_categories: List[str] = Field(default_factory=list)
    budget_limit_paise: Optional[int] = None
    currency: str = "INR"
    required_features: List[str] = Field(default_factory=list)
    excluded_categories: List[str] = Field(default_factory=list)
    excluded_skus: List[str] = Field(default_factory=list)
    requested_quantities: Dict[str, int] = Field(default_factory=dict)
    urgency: str = "normal"  # normal, high, immediate
    priority: str = "balanced"  # budget_first, quality_first, balanced
    preferences: List[str] = Field(default_factory=list)


class ProductScoringBreakdown(BaseModel):
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    category_match_score: float = Field(..., ge=0.0, le=1.0)
    availability_score: float = Field(..., ge=0.0, le=1.0)
    budget_fit_score: float = Field(..., ge=0.0, le=1.0)
    composite_score: float = Field(..., ge=0.0, le=1.0)
    rationale: str


class ProductCandidate(BaseModel):
    sku: str
    name: str
    category: str
    price_paise: int
    stock_quantity: int
    active: bool
    scoring: Optional[ProductScoringBreakdown] = None


class CartItemProposal(BaseModel):
    sku: str
    quantity: int = 1
    unit_price_paise: Optional[int] = None
    item_total_paise: Optional[int] = None
    priority_level: int = 1  # 1: High/Essential, 2: Medium/Preferred, 3: Optional/Add-on


class RecoveryAction(BaseModel):
    attempt: int
    strategy: str  # REMOVE_OPTIONAL_ADDON, REMOVE_LOW_RELEVANCE, REPLACE_WITH_CHEAPER_ALT, REDUCE_QUANTITY, REBUILD_CART, REFRESH_STALE_QUOTE
    reason: str
    before_total_paise: Optional[int] = None
    after_total_paise: Optional[int] = None
    affected_skus: List[str] = Field(default_factory=list)
    adjustments_made: Dict[str, Any] = Field(default_factory=dict)
    resulting_policy_decision: Optional[str] = None


class AgentTraceStep(BaseModel):
    step: int
    node: str
    action: str
    started_at: Optional[str] = None
    finished_at: Optional[str] = None
    duration_ms: Optional[int] = None
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None
    timestamp: str


class AgentBuyRequest(BaseModel):
    request: str = Field(..., min_length=3, max_length=500, description="Natural language purchase objective")
    policy_id: str = Field(default="policy_demo", min_length=1, max_length=64)


class ConfirmCheckoutRequest(BaseModel):
    quote_id: str = Field(..., min_length=1, max_length=64)
    policy_id: str = Field(default="policy_demo", min_length=1, max_length=64)


class AgentRunResult(BaseModel):
    run_id: str
    request_id: str
    user_goal: str
    status: str  # COMPLETED, REQUIRE_CONFIRMATION, BLOCKED, FAILED
    selected_items: List[Dict[str, Any]] = Field(default_factory=list)
    ranked_candidates: List[Dict[str, Any]] = Field(default_factory=list)
    quote: Optional[Dict[str, Any]] = None
    policy_decision: Optional[Dict[str, Any]] = None
    execution_result: Optional[Dict[str, Any]] = None
    recovery_history: List[Dict[str, Any]] = Field(default_factory=list)
    offer_comparison: Optional[Dict[str, Any]] = None
    explanation: str
    trace_steps: List[AgentTraceStep] = Field(default_factory=list)
