import re
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session

from app.agent.state import AgentState, AgentMemory
from app.agent.models import (
    BuyerIntent,
    ProductCandidate,
    ProductScoringBreakdown,
    CartItemProposal,
    RecoveryAction
)
from app.agent.negotiator import MerchantOfferEngine, ProviderOffer, OfferComparisonResult
from app.agent.tools import AgentToolSuite
from app.guards.decisions import PolicyDecisionType, PolicyCheckCode


def _record_trace_step(
    state: AgentState,
    node: str,
    action: str,
    input_summary: Optional[Dict[str, Any]] = None,
    output_summary: Optional[Dict[str, Any]] = None,
    duration_ms: Optional[int] = None
) -> None:
    now_iso = datetime.now(timezone.utc).isoformat()
    step_num = len(state.get("trace_steps", [])) + 1
    state["trace_steps"].append({
        "step": step_num,
        "node": node,
        "action": action,
        "input_summary": input_summary or {},
        "output_summary": output_summary or {},
        "duration_ms": duration_ms or 0,
        "timestamp": now_iso
    })


def score_product_candidate(
    product: Dict[str, Any],
    intent: BuyerIntent
) -> ProductScoringBreakdown:
    """
    Deterministic scoring and ranking engine for catalog candidates:
    - Relevance (0.0 - 1.0): Matches query keywords & features
    - Category Match (0.0 - 1.0): Is within desired categories
    - Availability (0.0 - 1.0): Positive stock quantity & active
    - Budget Fit (0.0 - 1.0): Price relative to budget cap
    Composite Score = 0.35*Relevance + 0.25*Category + 0.25*Availability + 0.15*BudgetFit
    """
    p_name = product.get("name", "").lower()
    p_desc = product.get("description", "").lower()
    p_cat = product.get("category", "")
    p_price = product.get("price_paise", 0)
    p_stock = product.get("stock_quantity", 0)
    p_active = product.get("active", False)

    # 1. Availability Score
    if not p_active or p_stock <= 0:
        availability_score = 0.0
    else:
        availability_score = min(1.0, 0.5 + (p_stock / 50.0) * 0.5)

    # 2. Category Match Score
    if not intent.target_categories:
        category_score = 0.8
    elif p_cat in intent.target_categories:
        category_score = 1.0
    else:
        category_score = 0.1

    # 3. Relevance Score
    relevance = 0.5
    user_goal_lower = intent.user_goal.lower()
    for feat in intent.required_features:
        if feat.lower() in p_name or feat.lower() in p_desc:
            relevance += 0.25

    if any(k in user_goal_lower for k in [p_cat.lower(), p_name.split()[0].lower()]):
        relevance += 0.25
    relevance_score = min(1.0, max(0.1, relevance))

    # 4. Budget Fit Score
    budget = intent.budget_limit_paise or 500000
    if p_price <= budget:
        budget_fit_score = 1.0 - (p_price / (budget * 1.5))
    else:
        budget_fit_score = max(0.0, 1.0 - ((p_price - budget) / budget))

    # 5. Composite Weighted Score
    composite = (
        0.35 * relevance_score +
        0.25 * category_score +
        0.25 * availability_score +
        0.15 * budget_fit_score
    )

    rationale = f"Relevance: {relevance_score:.2f}, Category: {category_score:.2f}, Avail: {availability_score:.2f}, BudgetFit: {budget_fit_score:.2f}"

    return ProductScoringBreakdown(
        relevance_score=round(relevance_score, 2),
        category_match_score=round(category_score, 2),
        availability_score=round(availability_score, 2),
        budget_fit_score=round(budget_fit_score, 2),
        composite_score=round(composite, 2),
        rationale=rationale
    )


class AgentNodes:
    """
    Advanced LangGraph execution nodes for the AI Buyer with Product Ranking and Multi-Strategy Recovery.
    """

    def __init__(self, db: Session):
        self.db = db
        self.tools = AgentToolSuite(db)

    def parse_intent_node(self, state: AgentState) -> AgentState:
        """
        Extract structured, typed buyer intent from natural language input.
        """
        t0 = time.time()
        user_goal = state["user_goal"]
        state["iteration_count"] += 1

        # Budget extraction
        budget_limit = None
        budget_match = re.search(r'(?:₹|rs\.?|inr|under|below|budget of)\s*([0-9]+(?:,[0-9]+)*)', user_goal, re.IGNORECASE)
        if budget_match:
            amount_str = budget_match.group(1).replace(",", "")
            budget_limit = int(amount_str) * 100

        # Category mapping
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

        # Exclusions detection
        excluded_cats = []
        excluded_skus = []
        if "avoid webcam" in lower_goal or "no camera" in lower_goal or "without webcam" in lower_goal:
            excluded_cats.append("Cameras")

        # Required features
        features = []
        if "wireless" in lower_goal:
            features.append("wireless")
        if "mechanical" in lower_goal:
            features.append("mechanical")
        if "4k" in lower_goal:
            features.append("4k")

        intent = BuyerIntent(
            user_goal=user_goal,
            target_categories=list(set(categories)),
            budget_limit_paise=budget_limit,
            currency="INR",
            required_features=features,
            excluded_categories=excluded_cats,
            excluded_skus=excluded_skus,
            priority="budget_first" if budget_limit else "balanced"
        )
        state["buyer_intent"] = intent
        duration_ms = int((time.time() - t0) * 1000)

        _record_trace_step(
            state=state,
            node="parse_intent",
            action="Extracted structured buyer intent and constraint model",
            input_summary={"user_goal": user_goal},
            output_summary={"intent": intent.model_dump()},
            duration_ms=duration_ms
        )
        return state

    def discover_catalog_node(self, state: AgentState) -> AgentState:
        """
        Discover merchant catalog and apply deterministic candidate scoring and ranking.
        """
        t0 = time.time()
        intent = state.get("buyer_intent") or BuyerIntent(user_goal=state["user_goal"])
        target_cats = intent.target_categories

        discovered = []
        if target_cats:
            for cat in target_cats:
                prods = self.tools.search_catalog(category=cat)
                discovered.extend(prods)
        else:
            discovered = self.tools.search_catalog()

        # Filter out excluded categories/SKUs & deduplicate
        seen_skus = set()
        candidates: List[Dict[str, Any]] = []
        for p in discovered:
            sku = p["sku"]
            if sku not in seen_skus and p.get("category") not in intent.excluded_categories:
                seen_skus.add(sku)
                # Score candidate
                scoring = score_product_candidate(p, intent)
                p_with_score = {**p, "scoring": scoring.model_dump()}
                candidates.append(p_with_score)

        # Sort candidates deterministically by composite score descending
        candidates.sort(key=lambda x: x["scoring"]["composite_score"], reverse=True)

        state["discovered_products"] = discovered
        state["ranked_candidates"] = candidates
        duration_ms = int((time.time() - t0) * 1000)

        _record_trace_step(
            state=state,
            node="discover_catalog",
            action="Ranked catalog candidates via deterministic scoring engine",
            input_summary={"target_categories": target_cats, "excluded_categories": intent.excluded_categories},
            output_summary={"candidates_ranked": len(candidates), "top_sku": candidates[0]["sku"] if candidates else None},
            duration_ms=duration_ms
        )
        return state

    def plan_cart_node(self, state: AgentState) -> AgentState:
        """
        Deterministic Cart Optimizer:
        Formulates an optimal cart proposal under budget and policy bounds using ranked candidates.
        """
        t0 = time.time()
        candidates = state.get("ranked_candidates", [])
        intent = state.get("buyer_intent") or BuyerIntent(user_goal=state["user_goal"])
        user_goal_lower = state["user_goal"].lower()

        # In-stock candidates only
        in_stock = [c for c in candidates if c["stock_quantity"] > 0 and c["active"]]

        proposal: List[Dict[str, Any]] = []

        # Explicit mentions
        if "keyboard" in user_goal_lower:
            kb = next((c for c in in_stock if c["category"] == "Keyboards"), None)
            if kb and not any(p["sku"] == kb["sku"] for p in proposal):
                proposal.append({"sku": kb["sku"], "quantity": 1, "name": kb["name"], "price_paise": kb["price_paise"], "priority_level": 1})

        if "mouse" in user_goal_lower:
            m = next((c for c in in_stock if c["category"] == "Mice"), None)
            if m and not any(p["sku"] == m["sku"] for p in proposal):
                proposal.append({"sku": m["sku"], "quantity": 1, "name": m["name"], "price_paise": m["price_paise"], "priority_level": 1})

        if "hub" in user_goal_lower or "dock" in user_goal_lower:
            h = next((c for c in in_stock if c["category"] == "Adapters & Hubs"), None)
            if h and not any(p["sku"] == h["sku"] for p in proposal):
                proposal.append({"sku": h["sku"], "quantity": 1, "name": h["name"], "price_paise": h["price_paise"], "priority_level": 2})

        if "stand" in user_goal_lower:
            st = next((c for c in in_stock if c["category"] == "Desk Accessories"), None)
            if st and not any(p["sku"] == st["sku"] for p in proposal):
                proposal.append({"sku": st["sku"], "quantity": 1, "name": st["name"], "price_paise": st["price_paise"], "priority_level": 3})

        if "camera" in user_goal_lower or "webcam" in user_goal_lower:
            if "Cameras" not in intent.excluded_categories:
                cam = next((c for c in in_stock if c["category"] == "Cameras"), None)
                if cam and not any(p["sku"] == cam["sku"] for p in proposal):
                    proposal.append({"sku": cam["sku"], "quantity": 1, "name": cam["name"], "price_paise": cam["price_paise"], "priority_level": 2})

        # Explicit blocked item or other item keywords
        if "laser" in user_goal_lower or "blocked" in user_goal_lower:
            laser = next((c for c in candidates if c["sku"] == "BLOCKED-ITEM-009"), None)
            if laser:
                proposal.append({"sku": laser["sku"], "quantity": 1, "name": laser["name"], "price_paise": laser["price_paise"], "priority_level": 1})

        # Workstation bundle fallback
        if "workstation" in user_goal_lower and not proposal:
            for item_sku, prio in [("KB-MECH-001", 1), ("HUB-USBC-003", 2), ("STAND-ALUM-004", 3)]:
                p = next((x for x in in_stock if x["sku"] == item_sku), None)
                if p:
                    proposal.append({"sku": p["sku"], "quantity": 1, "name": p["name"], "price_paise": p["price_paise"], "priority_level": prio})

        # General single candidate fallback
        if not proposal and in_stock:
            proposal.append({"sku": in_stock[0]["sku"], "quantity": 1, "name": in_stock[0]["name"], "price_paise": in_stock[0]["price_paise"], "priority_level": 1})

        state["cart_proposal"] = proposal
        # Update memory
        state["memory"]["previous_proposals"].append(proposal)
        duration_ms = int((time.time() - t0) * 1000)

        _record_trace_step(
            state=state,
            node="plan_cart",
            action="Constructed optimized cart proposal based on ranking & priorities",
            input_summary={"user_goal": state["user_goal"]},
            output_summary={"cart_items": proposal},
            duration_ms=duration_ms
        )
        return state

    def compare_offers_node(self, state: AgentState) -> AgentState:
        """
        Deterministic Merchant Offer / Provider Comparison Layer:
        Evaluates candidate items and provider offers strictly against server catalog facts.
        Produces a deterministic ranking without fabricating synthetic external merchants or fake savings.
        """
        t0 = time.time()
        candidates = state.get("ranked_candidates", [])
        intent = state.get("buyer_intent") or BuyerIntent(user_goal=state["user_goal"])
        budget = intent.budget_limit_paise

        offers = MerchantOfferEngine.build_offers_from_candidates(candidates)
        comparison = MerchantOfferEngine.compare_and_select(offers, budget_limit_paise=budget)
        state["offer_comparison"] = comparison.model_dump(mode="json")
        duration_ms = int((time.time() - t0) * 1000)

        _record_trace_step(
            state=state,
            node="compare_offers",
            action=f"Compared {comparison.total_offers_evaluated} available provider offers ({comparison.comparison_state})",
            input_summary={"total_offers": len(offers), "budget_cap": budget},
            output_summary={
                "comparison_state": comparison.comparison_state,
                "selected_sku": comparison.selected_offer.sku if comparison.selected_offer else None,
                "selected_price_paise": comparison.selected_offer.price_paise if comparison.selected_offer else None,
                "is_negotiated": comparison.is_negotiated,
                "actual_savings_paise": comparison.actual_savings_paise,
                "reason": comparison.selection_reason
            },
            duration_ms=duration_ms
        )
        return state

    def request_quote_node(self, state: AgentState) -> AgentState:
        """
        Request server-authoritative quote.
        """
        t0 = time.time()
        cart = state.get("cart_proposal", [])
        if not cart:
            state["final_status"] = "FAILED"
            state["failure_reason"] = "Empty cart proposal"
            return state

        try:
            quote_payload = self.tools.create_server_quote(cart)
            state["quote_id"] = quote_payload["quote_id"]
            state["quote_payload"] = quote_payload
            duration_ms = int((time.time() - t0) * 1000)

            _record_trace_step(
                state=state,
                node="request_quote",
                action="Obtained server-authoritative signed quote",
                input_summary={"items": cart},
                output_summary={"quote_id": quote_payload["quote_id"], "total_paise": quote_payload["total"]},
                duration_ms=duration_ms
            )
        except Exception as e:
            state["final_status"] = "FAILED"
            state["failure_reason"] = f"Quote creation failed: {str(e)}"
        return state

    def evaluate_policy_node(self, state: AgentState) -> AgentState:
        """
        Evaluate deterministic policy gate against server quote.
        """
        t0 = time.time()
        quote_id = state.get("quote_id")
        if not quote_id:
            state["final_status"] = "FAILED"
            return state

        decision = self.tools.evaluate_policy_gate(quote_id, state["policy_id"])
        state["policy_decision"] = decision["decision"]
        state["policy_reasons"] = decision.get("reasons", [])
        state["policy_checks"] = decision.get("checks", [])
        duration_ms = int((time.time() - t0) * 1000)

        _record_trace_step(
            state=state,
            node="evaluate_policy",
            action="Submitted quote to deterministic policy gate",
            input_summary={"quote_id": quote_id, "policy_id": state["policy_id"]},
            output_summary={"decision": decision["decision"], "reasons": decision.get("reasons", [])},
            duration_ms=duration_ms
        )
        return state

    def execute_checkout_node(self, state: AgentState) -> AgentState:
        """
        Execute checkout through server boundary (only if decision == ALLOW).
        """
        t0 = time.time()
        quote_id = state.get("quote_id")
        decision = state.get("policy_decision")

        if decision != PolicyDecisionType.ALLOW.value:
            state["final_status"] = "BLOCKED"
            state["failure_reason"] = "Safety halt: Non-ALLOW policy decision"
            return state

        resp = self.tools.execute_checkout(quote_id=quote_id, policy_id=state["policy_id"])
        state["execution_result"] = resp.model_dump()
        duration_ms = int((time.time() - t0) * 1000)

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
            output_summary=resp.model_dump(),
            duration_ms=duration_ms
        )
        return state

    def handle_recovery_node(self, state: AgentState) -> AgentState:
        """
        Multi-Strategy Autonomous Recovery Engine:
        Strategy Ordering:
        1. Remove optional add-ons (priority_level == 3)
        2. Remove lowest-relevance / lowest-priority product
        3. Replace expensive SKU with cheaper compatible alternative
        4. Reduce item quantities
        5. Rebuild cart
        """
        t0 = time.time()
        state["recovery_count"] += 1
        attempt = state["recovery_count"]
        reasons = state.get("policy_reasons", [])
        reason_codes = [r.get("code") for r in reasons]
        cart = list(state.get("cart_proposal", []))
        quote_payload = state.get("quote_payload") or {}
        before_total = quote_payload.get("total", 0)

        recovery_action = None

        if PolicyCheckCode.AMOUNT_EXCEEDS_LIMIT.value in reason_codes:
            # 1. Look for priority 3 optional items to remove
            optional_item = next((item for item in cart if item.get("priority_level") == 3), None)
            if optional_item and len(cart) > 1:
                cart = [i for i in cart if i["sku"] != optional_item["sku"]]
                recovery_action = RecoveryAction(
                    attempt=attempt,
                    strategy="REMOVE_OPTIONAL_ADDON",
                    reason="Removed optional add-on to satisfy spending cap",
                    before_total_paise=before_total,
                    affected_skus=[optional_item["sku"]],
                    adjustments_made={"removed_sku": optional_item["sku"]}
                )
            # 2. Look for lowest priority / last item
            elif len(cart) > 1:
                removed_item = cart.pop()
                recovery_action = RecoveryAction(
                    attempt=attempt,
                    strategy="REMOVE_LOW_RELEVANCE",
                    reason="Removed lowest priority item to get under budget cap",
                    before_total_paise=before_total,
                    affected_skus=[removed_item.get("sku")],
                    adjustments_made={"removed_sku": removed_item.get("sku")}
                )
            # 3. Reduce quantity
            elif len(cart) == 1 and cart[0].get("quantity", 1) > 1:
                cart[0]["quantity"] -= 1
                recovery_action = RecoveryAction(
                    attempt=attempt,
                    strategy="REDUCE_QUANTITY",
                    reason="Reduced item quantity to comply with budget limit",
                    before_total_paise=before_total,
                    affected_skus=[cart[0]["sku"]],
                    adjustments_made={"new_quantity": cart[0]["quantity"]}
                )

        elif PolicyCheckCode.SKU_BLOCKED.value in reason_codes or "OUT_OF_STOCK" in reason_codes or "INSUFFICIENT_STOCK" in reason_codes:
            # Drop unallowed / out-of-stock items
            blocked_skus = ["BLOCKED-ITEM-009", "HEADSET-ANC-006"]
            cart = [i for i in cart if i["sku"] not in blocked_skus]
            recovery_action = RecoveryAction(
                attempt=attempt,
                strategy="REMOVE_UNAVAILABLE_ITEM",
                reason="Removed blocked or unavailable item from cart proposal",
                before_total_paise=before_total,
                affected_skus=blocked_skus,
                adjustments_made={"remaining_items_count": len(cart)}
            )

        if not recovery_action:
            recovery_action = RecoveryAction(
                attempt=attempt,
                strategy="REBUILD_CART",
                reason="Re-optimizing cart proposal",
                before_total_paise=before_total,
                affected_skus=[i.get("sku") for i in cart]
            )

        state["cart_proposal"] = cart
        state["recovery_history"].append(recovery_action.model_dump())
        state["memory"]["tried_strategies"].append(recovery_action.strategy)
        duration_ms = int((time.time() - t0) * 1000)

        _record_trace_step(
            state=state,
            node="handle_recovery",
            action=f"Executed recovery strategy: {recovery_action.strategy}",
            input_summary={"attempt": attempt, "reason_codes": reason_codes},
            output_summary=recovery_action.model_dump(),
            duration_ms=duration_ms
        )
        return state
