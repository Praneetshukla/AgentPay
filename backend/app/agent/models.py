from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class BuyerIntent(BaseModel):
    user_goal: str
    target_categories: List[str] = Field(default_factory=list)
    budget_limit_paise: Optional[int] = None
    requested_quantities: Dict[str, int] = Field(default_factory=dict)
    preferences: List[str] = Field(default_factory=list)
    priority: str = "balanced"  # budget_first, quality_first, balanced


class ProductCandidate(BaseModel):
    sku: str
    name: str
    category: str
    price_paise: int
    stock_quantity: int
    active: bool


class CartItemProposal(BaseModel):
    sku: str
    quantity: int = 1


class RecoveryAction(BaseModel):
    attempt: int
    strategy: str  # REDUCE_QUANTITY, REMOVE_LOW_PRIORITY_ITEM, SELECT_CHEAPER_ALTERNATIVE, REFRESH_STALE_QUOTE, REMOVE_UNAVAILABLE_ITEM
    reason: str
    adjustments_made: Dict[str, Any] = Field(default_factory=dict)


class AgentTraceStep(BaseModel):
    step: int
    node: str
    action: str
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None
    timestamp: str


class AgentBuyRequest(BaseModel):
    request: str = Field(..., min_length=3, max_length=500, description="Natural language purchase objective")
    policy_id: str = Field(default="policy_demo", min_length=1, max_length=64)


class AgentRunResult(BaseModel):
    run_id: str
    request_id: str
    user_goal: str
    status: str  # COMPLETED, REQUIRE_CONFIRMATION, BLOCKED, FAILED
    selected_items: List[Dict[str, Any]] = Field(default_factory=list)
    quote: Optional[Dict[str, Any]] = None
    policy_decision: Optional[Dict[str, Any]] = None
    execution_result: Optional[Dict[str, Any]] = None
    recovery_history: List[Dict[str, Any]] = Field(default_factory=list)
    explanation: str
    trace_steps: List[AgentTraceStep] = Field(default_factory=list)
