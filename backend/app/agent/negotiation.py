from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import Product
from app.agent.models import CartItemProposal


class NegotiationState(str, Enum):
    PROPOSE = "PROPOSE"
    OPTIMIZE = "OPTIMIZE"
    SUBSTITUTE = "SUBSTITUTE"
    PRUNE = "PRUNE"
    REQUOTE = "REQUOTE"
    REVALIDATE = "REVALIDATE"
    FINALIZE = "FINALIZE"
    STOP = "STOP"


class NegotiationStep(BaseModel):
    step_number: int
    state: NegotiationState
    action_description: str
    cart_before: List[CartItemProposal]
    cart_after: List[CartItemProposal]
    total_before_paise: int
    total_after_paise: int
    budget_limit_paise: int
    policy_compliant: bool
    rationale: str


class BoundedNegotiationEngine:
    """
    Bounded Multi-Objective Negotiation Engine (Phase 9):
    Negotiates cart composition toward buyer constraints within strictly bounded iterations (<= 3).
    
    CRITICAL INVARIANTS:
    - Never modifies server prices
    - Never bypasses confirmation thresholds
    - Never modifies inventory
    - Never bypasses deterministic policy gates
    """

    MAX_ITERATIONS = 3

    def __init__(self, db: Session):
        self.db = db

    def negotiate_cart(
        self,
        current_proposals: List[CartItemProposal],
        budget_limit_paise: int,
        failure_reason: str,
        attempt: int
    ) -> Tuple[List[CartItemProposal], NegotiationStep]:
        """
        Executes one bounded step of structured negotiation:
        1. PRUNE optional or lowest priority items
        2. SUBSTITUTE expensive items with cheaper compatible alternatives
        3. REDUCE quantities
        """
        before_proposals = [p.model_copy() for p in current_proposals]
        before_total = self._calculate_estimated_total(before_proposals)
        after_proposals = [p.model_copy() for p in current_proposals]
        state = NegotiationState.OPTIMIZE
        rationale = ""

        if attempt >= self.MAX_ITERATIONS:
            return after_proposals, NegotiationStep(
                step_number=attempt,
                state=NegotiationState.STOP,
                action_description="Negotiation reached maximum bounded iterations (3). Halting to prevent loops.",
                cart_before=before_proposals,
                cart_after=after_proposals,
                total_before_paise=before_total,
                total_after_paise=before_total,
                budget_limit_paise=budget_limit_paise,
                policy_compliant=False,
                rationale="Bounded iteration limit reached."
            )

        # Strategy 1: Prune lowest priority (priority == 3)
        p3_items = [p for p in after_proposals if getattr(p, 'priority', 2) >= 3]
        if p3_items:
            removed = p3_items[-1]
            after_proposals = [p for p in after_proposals if p.sku != removed.sku]
            state = NegotiationState.PRUNE
            rationale = f"Pruned optional accessory ({removed.sku}) to reduce cart total."

        # Strategy 2: Substitute highest cost item with cheaper alternative in same category
        elif len(after_proposals) > 0:
            most_expensive = self._find_most_expensive_proposal(after_proposals)
            if most_expensive:
                alt = self._find_cheaper_alternative(most_expensive.sku)
                if alt:
                    after_proposals = [
                        CartItemProposal(sku=alt.sku, quantity=p.quantity, priority=p.priority)
                        if p.sku == most_expensive.sku else p
                        for p in after_proposals
                    ]
                    state = NegotiationState.SUBSTITUTE
                    rationale = f"Substituted {most_expensive.sku} with cheaper alternative {alt.sku} ({alt.name})."
                else:
                    # Strategy 3: Prune lowest priority remaining
                    after_proposals = after_proposals[:-1]
                    state = NegotiationState.PRUNE
                    rationale = f"Pruned lowest relevance product ({most_expensive.sku}) to fit within budget."

        after_total = self._calculate_estimated_total(after_proposals)

        step = NegotiationStep(
            step_number=attempt,
            state=state,
            action_description=f"Negotiation attempt {attempt}: {rationale}",
            cart_before=before_proposals,
            cart_after=after_proposals,
            total_before_paise=before_total,
            total_after_paise=after_total,
            budget_limit_paise=budget_limit_paise,
            policy_compliant=(after_total <= budget_limit_paise),
            rationale=rationale
        )

        return after_proposals, step

    def _find_most_expensive_proposal(self, proposals: List[CartItemProposal]) -> Optional[CartItemProposal]:
        skus = [p.sku for p in proposals]
        products = {p.sku: p for p in self.db.scalars(select(Product).where(Product.sku.in_(skus))).all()}
        if not products:
            return proposals[0] if proposals else None
        return max(proposals, key=lambda p: products.get(p.sku).price if products.get(p.sku) else 0)

    def _find_cheaper_alternative(self, sku: str) -> Optional[Product]:
        orig = self.db.scalars(select(Product).where(Product.sku == sku)).first()
        if not orig:
            return None
        return self.db.scalars(
            select(Product)
            .where(
                Product.category == orig.category,
                Product.sku != sku,
                Product.price < orig.price,
                Product.stock_quantity > 0,
                Product.active == True
            )
            .order_by(Product.price.asc())
        ).first()

    def _calculate_estimated_total(self, proposals: List[CartItemProposal]) -> int:
        skus = [p.sku for p in proposals]
        products = {p.sku: p for p in self.db.scalars(select(Product).where(Product.sku.in_(skus))).all()}
        return sum(products[p.sku].price * p.quantity for p in proposals if p.sku in products)
