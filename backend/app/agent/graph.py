import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, END

from app.agent.state import AgentState, AgentMemory
from app.agent.nodes import AgentNodes
from app.guards.decisions import PolicyDecisionType, PolicyCheckCode
from app.db.models import AgentRun


def should_route_after_policy(state: AgentState) -> str:
    """
    Conditional routing logic following policy gate evaluation:
    - ALLOW -> route to execute_checkout
    - REQUIRE_CONFIRMATION -> route to hold_confirmation (END)
    - BLOCK -> route to check_recovery
    """
    decision = state.get("policy_decision")

    if decision == PolicyDecisionType.ALLOW.value:
        return "execute_checkout"
    elif decision == PolicyDecisionType.REQUIRE_CONFIRMATION.value:
        return "hold_confirmation"
    else:
        return "check_recovery"


def should_route_recovery(state: AgentState) -> str:
    """
    Check if recovery attempts are bounded (< 3) and if failure is recoverable.
    """
    recovery_count = state.get("recovery_count", 0)
    reasons = state.get("policy_reasons", [])
    reason_codes = [r.get("code") for r in reasons]

    # Non-recoverable policy blocks
    if PolicyCheckCode.CURRENCY_NOT_ALLOWED.value in reason_codes or PolicyCheckCode.POLICY_INACTIVE.value in reason_codes:
        return "stop_blocked"

    if recovery_count >= 3:
        return "stop_blocked"

    if not state.get("cart_proposal"):
        return "stop_blocked"

    return "handle_recovery"


def create_buyer_graph(db: Session) -> StateGraph:
    """
    Builds the deterministic LangGraph state machine for the AI Buyer.
    """
    nodes = AgentNodes(db)
    workflow = StateGraph(AgentState)

    # Register nodes
    workflow.add_node("parse_intent", nodes.parse_intent_node)
    workflow.add_node("discover_catalog", nodes.discover_catalog_node)
    workflow.add_node("plan_cart", nodes.plan_cart_node)
    workflow.add_node("request_quote", nodes.request_quote_node)
    workflow.add_node("evaluate_policy", nodes.evaluate_policy_node)
    workflow.add_node("execute_checkout", nodes.execute_checkout_node)
    workflow.add_node("handle_recovery", nodes.handle_recovery_node)

    def hold_confirmation_node(state: AgentState) -> AgentState:
        state["final_status"] = "REQUIRE_CONFIRMATION"
        total = state.get("quote_payload", {}).get("total", 0)
        state["explanation"] = f"Your proposed cart total is ₹{total/100:,.2f}, which requires merchant confirmation before payment authorization."
        return state

    def stop_blocked_node(state: AgentState) -> AgentState:
        state["final_status"] = "BLOCKED"
        reasons = [r.get("message") for r in state.get("policy_reasons", [])]
        state["explanation"] = f"Purchase request blocked by policy: {'; '.join(reasons) if reasons else 'Exceeded spending limits or unrecoverable constraint'}."
        return state

    workflow.add_node("hold_confirmation", hold_confirmation_node)
    workflow.add_node("stop_blocked", stop_blocked_node)

    # Define linear graph edges
    workflow.set_entry_point("parse_intent")
    workflow.add_edge("parse_intent", "discover_catalog")
    workflow.add_edge("discover_catalog", "plan_cart")
    workflow.add_edge("plan_cart", "request_quote")
    workflow.add_edge("request_quote", "evaluate_policy")

    # Policy conditional branch
    workflow.add_conditional_edges(
        "evaluate_policy",
        should_route_after_policy,
        {
            "execute_checkout": "execute_checkout",
            "hold_confirmation": "hold_confirmation",
            "check_recovery": "handle_recovery"
        }
    )

    # Recovery conditional branch
    workflow.add_conditional_edges(
        "handle_recovery",
        should_route_recovery,
        {
            "handle_recovery": "request_quote",
            "stop_blocked": "stop_blocked"
        }
    )

    workflow.add_edge("execute_checkout", END)
    workflow.add_edge("hold_confirmation", END)
    workflow.add_edge("stop_blocked", END)

    return workflow.compile()


class AutonomousBuyerOrchestrator:
    """
    Manages LangGraph AI Buyer execution, state persistence, and audit ledger persistence.
    """

    def __init__(self, db: Session):
        self.db = db
        self.app = create_buyer_graph(db)

    def run_buyer_workflow(self, user_goal: str, policy_id: str = "policy_demo") -> AgentState:
        request_id = f"req_{uuid.uuid4().hex[:16]}"
        run_id = f"run_{uuid.uuid4().hex[:16]}"
        
        initial_state: AgentState = {
            "request_id": request_id,
            "run_id": run_id,
            "user_goal": user_goal,
            "policy_id": policy_id,
            "buyer_intent": None,
            "discovered_products": [],
            "ranked_candidates": [],
            "cart_proposal": [],
            "quote_id": None,
            "quote_payload": None,
            "policy_decision": None,
            "policy_reasons": [],
            "policy_checks": [],
            "execution_result": None,
            "iteration_count": 0,
            "recovery_count": 0,
            "recovery_history": [],
            "memory": {
                "previous_proposals": [],
                "rejected_skus": [],
                "failed_reasons": [],
                "tried_strategies": []
            },
            "final_status": "RUNNING",
            "explanation": "",
            "failure_reason": None,
            "trace_steps": []
        }

        # Run StateGraph
        final_state = self.app.invoke(initial_state)

        # Persist AgentRun record in database
        agent_run = AgentRun(
            run_id=run_id,
            request_id=request_id,
            user_goal=user_goal,
            status=final_state["final_status"],
            quote_id=final_state.get("quote_id"),
            transaction_id=final_state.get("execution_result", {}).get("transaction_id") if final_state.get("execution_result") else None,
            iteration_count=final_state["iteration_count"],
            recovery_count=final_state["recovery_count"],
            final_decision=final_state.get("policy_decision"),
            explanation=final_state.get("explanation"),
            trace_log=final_state.get("trace_steps", []),
            completed_at=datetime.now(timezone.utc)
        )
        self.db.add(agent_run)
        self.db.commit()

        return final_state
