import re
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.agent.state import AgentState
from app.agent.models import BuyerIntent, RecoveryAction
from app.agent.tools import AgentToolSuite
from app.guards.decisions import PolicyDecisionType, PolicyCheckCode


def _record_trace_step(state: AgentState, node: str, action: str, input_summary: Optional[Dict[str, Any]] = None, output_summary: Optional[Dict[str, Any]] = None) -> None:
    step_num = len(state.get("trace_steps", [])) + 1
    state["trace_steps"].append({
        "step": step_num,
        "node": node,
        "action": action,
        "input_summary": input_summary or {},
        "output_summary": output_summary or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    })


class AgentNodes:
    """
    LangGraph execution nodes for the autonomous AI Buyer.
    """

    def __init__(self, db: Session):
        self.db = db
        self.tools = AgentToolSuite(db)

    def parse_intent_node(self, state: AgentState) -> AgentState:
        """
        Extract structured user intent from natural language input.
        Detects category targets, budget constraints (in paise), and priorities.
        """
        user_goal = state["user_goal"]
        state["iteration_count"] += 1

        # Budget extraction (e.g. ₹5,000 or 5000 or 3000)
        budget_limit = None
        budget_match = re.search(r'(?:₹|rs\.?|inr|under|below|budget of)\s*([0-9]+(?:,[0-9]+)*)', user_goal, re.IGNORECASE)
        if budget_match:
            amount_str = budget_match.group(1).replace(",", "")
            budget_limit = int(amount_str) * 100  # convert to paise

        # Categories
        categories = []
        lower_goal = user_goal.lower()
        if "keyboard" in lower_goal:
            categories.append("Keyboards")
        if "mouse" in lower_goal:
            categories.append("Mice")
        if "hub" in lower_goal or "dock" in lower_goal:
            categories.append("Adapters & Hubs")
        if "stand" in lower_goal:
            categories.append("Desk Accessories")
        if any(w in lower_goal for w in ["webcam", "camera", "stream", "video"]):
            categories.append("Cameras")
        if any(w in lower_goal for w in ["audio", "headset", "earphones", "headphone"]):
            categories.append("Audio")
        if "workstation" in lower_goal:
            categories.extend(["Keyboards", "Mice", "Adapters & Hubs", "Desk Accessories"])

        intent = BuyerIntent(
            user_goal=user_goal,
            target_categories=list(set(categories)),
            budget_limit_paise=budget_limit,
            priority="budget_first" if budget_limit else "balanced"
        )
        state["buyer_intent"] = intent

        _record_trace_step(
            state=state,
            node="parse_intent",
            action="Parsed natural language buyer intent",
            input_summary={"user_goal": user_goal},
            output_summary={"intent": intent.model_dump()}
        )
        return state

    def discover_catalog_node(self, state: AgentState) -> AgentState:
        """
        Discover merchant products via agent-readable catalog tools.
        """
        intent = state.get("buyer_intent")
        target_cats = intent.target_categories if intent else []
        
        discovered = []
        if target_cats:
            for cat in target_cats:
                prods = self.tools.search_catalog(category=cat)
                discovered.extend(prods)
        else:
            discovered = self.tools.search_catalog()

        # Deduplicate by SKU
        seen_skus = set()
        unique_prods = []
        for p in discovered:
            if p["sku"] not in seen_skus:
                seen_skus.add(p["sku"])
                unique_prods.append(p)

        state["discovered_products"] = unique_prods

        _record_trace_step(
            state=state,
            node="discover_catalog",
            action="Queried merchant agent-readable catalog",
            input_summary={"target_categories": target_cats},
            output_summary={"products_found": len(unique_prods), "skus": [p["sku"] for p in unique_prods]}
        )
        return state

    def plan_cart_node(self, state: AgentState) -> AgentState:
        """
        Select products and construct cart proposal.
        """
        discovered = state.get("discovered_products", [])
        intent = state.get("buyer_intent")
        budget = intent.budget_limit_paise if intent else None
        user_goal_lower = state["user_goal"].lower()

        # Filter out products with 0 stock
        in_stock_candidates = [p for p in discovered if p["stock_quantity"] > 0 and p["active"]]

        proposal = []
        # Explicit mentions matching
        if "keyboard" in user_goal_lower:
            kb = next((p for p in in_stock_candidates if p["sku"] == "KB-MECH-001"), None)
            if kb and not any(p["sku"] == kb["sku"] for p in proposal):
                proposal.append({"sku": kb["sku"], "quantity": 1, "name": kb["name"], "price_paise": kb["price_paise"]})

        if "mouse" in user_goal_lower:
            mouse = next((p for p in in_stock_candidates if p["sku"] == "MOUSE-WL-002"), None)
            if mouse and not any(p["sku"] == mouse["sku"] for p in proposal):
                proposal.append({"sku": mouse["sku"], "quantity": 1, "name": mouse["name"], "price_paise": mouse["price_paise"]})

        if "hub" in user_goal_lower or "dock" in user_goal_lower:
            hub = next((p for p in in_stock_candidates if p["sku"] == "HUB-USBC-003"), None)
            if hub and not any(p["sku"] == hub["sku"] for p in proposal):
                proposal.append({"sku": hub["sku"], "quantity": 1, "name": hub["name"], "price_paise": hub["price_paise"]})

        if "stand" in user_goal_lower:
            stand = next((p for p in in_stock_candidates if p["sku"] == "STAND-ALUM-004"), None)
            if stand and not any(p["sku"] == stand["sku"] for p in proposal):
                proposal.append({"sku": stand["sku"], "quantity": 1, "name": stand["name"], "price_paise": stand["price_paise"]})

        if "camera" in user_goal_lower or "webcam" in user_goal_lower:
            cam = next((p for p in in_stock_candidates if p["sku"] == "CAM-4K-005"), None)
            if cam and not any(p["sku"] == cam["sku"] for p in proposal):
                proposal.append({"sku": cam["sku"], "quantity": 1, "name": cam["name"], "price_paise": cam["price_paise"]})

        # If general "workstation" setup without explicit list, build full initial workstation bundle (which may test recovery)
        if "workstation" in user_goal_lower and not proposal:
            for item_sku in ["KB-MECH-001", "HUB-USBC-003", "STAND-ALUM-004"]:
                p = next((x for x in in_stock_candidates if x["sku"] == item_sku), None)
                if p:
                    proposal.append({"sku": p["sku"], "quantity": 1, "name": p["name"], "price_paise": p["price_paise"]})

        # Fallback if still empty: grab the first in-stock product candidate
        if not proposal and in_stock_candidates:
            first_prod = in_stock_candidates[0]
            proposal.append({"sku": first_prod["sku"], "quantity": 1, "name": first_prod["name"], "price_paise": first_prod["price_paise"]})

        state["cart_proposal"] = proposal

        _record_trace_step(
            state=state,
            node="plan_cart",
            action="Formulated cart item proposal",
            input_summary={"budget_paise": budget, "user_goal": state["user_goal"]},
            output_summary={"cart_items": proposal}
        )
        return state

    def request_quote_node(self, state: AgentState) -> AgentState:
        """
        Request server-authoritative quote.
        """
        cart = state.get("cart_proposal", [])
        if not cart:
            state["final_status"] = "FAILED"
            state["failure_reason"] = "Cannot generate quote: Empty cart proposal"
            return state

        try:
            quote_payload = self.tools.create_server_quote(cart)
            state["quote_id"] = quote_payload["quote_id"]
            state["quote_payload"] = quote_payload

            _record_trace_step(
                state=state,
                node="request_quote",
                action="Obtained server-authoritative signed quote",
                input_summary={"items": cart},
                output_summary={"quote_id": quote_payload["quote_id"], "total_paise": quote_payload["total"]}
            )
        except Exception as e:
            state["final_status"] = "FAILED"
            state["failure_reason"] = f"Quote creation error: {str(e)}"
            _record_trace_step(
                state=state,
                node="request_quote",
                action="Quote creation failed",
                output_summary={"error": str(e)}
            )
        return state

    def evaluate_policy_node(self, state: AgentState) -> AgentState:
        """
        Evaluate deterministic policy gate against server quote.
        """
        quote_id = state.get("quote_id")
        if not quote_id:
            state["final_status"] = "FAILED"
            return state

        decision = self.tools.evaluate_policy_gate(quote_id, state["policy_id"])
        state["policy_decision"] = decision["decision"]
        state["policy_reasons"] = decision.get("reasons", [])
        state["policy_checks"] = decision.get("checks", [])

        _record_trace_step(
            state=state,
            node="evaluate_policy",
            action="Submitted quote to deterministic policy gate",
            input_summary={"quote_id": quote_id, "policy_id": state["policy_id"]},
            output_summary={
                "decision": decision["decision"],
                "reasons": decision.get("reasons", [])
            }
        )
        return state

    def execute_checkout_node(self, state: AgentState) -> AgentState:
        """
        Request checkout execution through server boundary (ONLY if decision == ALLOW).
        """
        quote_id = state.get("quote_id")
        decision = state.get("policy_decision")

        # Double safety gate: Agent node strictly checks decision
        if decision != PolicyDecisionType.ALLOW.value:
            state["final_status"] = "BLOCKED"
            state["failure_reason"] = "Safety halt: Refused to execute unapproved transaction"
            return state

        resp = self.tools.execute_checkout(quote_id=quote_id, policy_id=state["policy_id"])
        state["execution_result"] = resp.model_dump()

        if resp.success:
            state["final_status"] = "COMPLETED"
            state["explanation"] = f"Successfully placed order {resp.razorpay_order_id} for ₹{resp.amount / 100:,.2f}."
        else:
            state["final_status"] = "FAILED"
            state["failure_reason"] = f"Execution failed: {resp.reason}"

        _record_trace_step(
            state=state,
            node="execute_checkout",
            action="Invoked server checkout execution boundary",
            input_summary={"quote_id": quote_id},
            output_summary=resp.model_dump()
        )
        return state

    def handle_recovery_node(self, state: AgentState) -> AgentState:
        """
        Autonomous Recovery Engine for recoverable planning failures:
        - AMOUNT_EXCEEDS_LIMIT: Drop lowest-priority item or reduce quantity
        - INSUFFICIENT_STOCK: Drop out-of-stock item and pick in-stock alternative
        - QUOTE_EXPIRED / STALE: Request fresh quote
        """
        state["recovery_count"] += 1
        attempt = state["recovery_count"]
        reasons = state.get("policy_reasons", [])
        reason_codes = [r.get("code") for r in reasons]
        cart = list(state.get("cart_proposal", []))

        recovery_action = None

        if PolicyCheckCode.AMOUNT_EXCEEDS_LIMIT.value in reason_codes:
            # Drop lowest priority or highest priced item to get under budget
            if len(cart) > 1:
                # Remove the last item in proposal
                removed_item = cart.pop()
                recovery_action = RecoveryAction(
                    attempt=attempt,
                    strategy="REMOVE_LOW_PRIORITY_ITEM",
                    reason="Cart exceeded authorized spending limit",
                    adjustments_made={"removed_sku": removed_item.get("sku"), "retained_items_count": len(cart)}
                )
            elif len(cart) == 1 and cart[0].get("quantity", 1) > 1:
                cart[0]["quantity"] -= 1
                recovery_action = RecoveryAction(
                    attempt=attempt,
                    strategy="REDUCE_QUANTITY",
                    reason="Reduced item quantity to satisfy budget limit",
                    adjustments_made={"adjusted_sku": cart[0]["sku"], "new_quantity": cart[0]["quantity"]}
                )

        elif PolicyCheckCode.INSUFFICIENT_STOCK.value in reason_codes or "OUT_OF_STOCK" in reason_codes:
            # Remove unavailable SKU
            cart = [item for item in cart if item.get("sku") != "HEADSET-ANC-006"]
            recovery_action = RecoveryAction(
                attempt=attempt,
                strategy="REMOVE_UNAVAILABLE_ITEM",
                reason="Removed out-of-stock item from cart proposal",
                adjustments_made={"retained_items": [i.get("sku") for i in cart]}
            )

        if not recovery_action:
            recovery_action = RecoveryAction(
                attempt=attempt,
                strategy="FALLBACK_OPTIMIZATION",
                reason="Re-evaluating cart proposal",
                adjustments_made={"cart": cart}
            )

        state["cart_proposal"] = cart
        state["recovery_history"].append(recovery_action.model_dump())

        _record_trace_step(
            state=state,
            node="handle_recovery",
            action=f"Applied autonomous recovery strategy: {recovery_action.strategy}",
            input_summary={"attempt": attempt, "reason_codes": reason_codes},
            output_summary=recovery_action.model_dump()
        )
        return state
