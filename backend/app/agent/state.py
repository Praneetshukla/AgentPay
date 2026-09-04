from typing import TypedDict, List, Dict, Any, Optional
from app.agent.models import BuyerIntent, CartItemProposal, RecoveryAction, AgentTraceStep


class AgentMemory(TypedDict):
    previous_proposals: List[List[Dict[str, Any]]]
    rejected_skus: List[str]
    failed_reasons: List[str]
    tried_strategies: List[str]


class AgentState(TypedDict):
    request_id: str
    run_id: str
    user_goal: str
    policy_id: str
    
    # Structured Intent Extraction
    buyer_intent: Optional[BuyerIntent]
    
    # Discovery & Deterministic Ranking
    discovered_products: List[Dict[str, Any]]
    ranked_candidates: List[Dict[str, Any]]
    
    # Cart Planning & Optimization
    cart_proposal: List[Dict[str, Any]]
    offer_comparison: Optional[Dict[str, Any]]
    
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
    
    # Run-local bounded memory
    memory: AgentMemory
    
    # Termination & Explainability
    final_status: str  # "COMPLETED", "REQUIRE_CONFIRMATION", "BLOCKED", "FAILED"
    explanation: str
    failure_reason: Optional[str]
    trace_steps: List[Dict[str, Any]]
