from typing import TypedDict, List, Dict, Any, Optional
from app.agent.models import BuyerIntent, CartItemProposal, RecoveryAction, AgentTraceStep


class AgentState(TypedDict):
    request_id: str
    run_id: str
    user_goal: str
    policy_id: str
    
    # Intent extraction
    buyer_intent: Optional[BuyerIntent]
    
    # Discovery & Cart Planning
    discovered_products: List[Dict[str, Any]]
    cart_proposal: List[Dict[str, Any]]  # [{"sku": "...", "quantity": 1}]
    
    # Server Authoritative Quote State
    quote_id: Optional[str]
    quote_payload: Optional[Dict[str, Any]]
    
    # Policy Gate State
    policy_decision: Optional[str]  # "ALLOW", "BLOCK", "REQUIRE_CONFIRMATION"
    policy_reasons: List[Dict[str, Any]]
    policy_checks: List[Dict[str, Any]]
    
    # Execution & Recovery Bounded Controls
    execution_result: Optional[Dict[str, Any]]
    iteration_count: int
    recovery_count: int
    recovery_history: List[Dict[str, Any]]
    
    # Termination & Explainability
    final_status: str  # "COMPLETED", "REQUIRE_CONFIRMATION", "BLOCKED", "FAILED"
    explanation: str
    failure_reason: Optional[str]
    trace_steps: List[Dict[str, Any]]
