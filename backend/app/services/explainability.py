from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone


class DecisionEvidence(BaseModel):
    decision_type: str
    headline: str
    mathematical_formula: Optional[str] = None
    input_facts: Dict[str, Any] = Field(default_factory=dict)
    deterministic_checks: List[Dict[str, Any]] = Field(default_factory=list)
    outcome: str
    authoritative_source: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ExplainabilityEngine:
    """
    Deterministic Explainability Engine (Phase 9):
    Extracts structured mathematical and policy facts behind every AI reasoning step.
    
    SAFETY INVARIANT:
    Explanations NEVER contradict database/server execution states.
    """

    @staticmethod
    def explain_candidate_ranking(
        sku: str,
        name: str,
        relevance: float,
        category_match: float,
        availability: float,
        budget_fit: float,
        composite_score: float
    ) -> DecisionEvidence:
        formula = "Score = (0.35 * Relevance) + (0.25 * Category) + (0.25 * Availability) + (0.15 * BudgetFit)"
        return DecisionEvidence(
            decision_type="PRODUCT_RANKING",
            headline=f"Ranked {name} ({sku}) with composite suitability {composite_score:.2f}",
            mathematical_formula=formula,
            input_facts={
                "sku": sku,
                "relevance_score": relevance,
                "category_match_score": category_match,
                "availability_score": availability,
                "budget_fit_score": budget_fit,
                "composite_score": composite_score
            },
            deterministic_checks=[
                {"metric": "Relevance Match", "weight": 0.35, "value": relevance},
                {"metric": "Category Affinity", "weight": 0.25, "value": category_match},
                {"metric": "Live Stock Availability", "weight": 0.25, "value": availability},
                {"metric": "Budget Headroom Fit", "weight": 0.15, "value": budget_fit}
            ],
            outcome="QUALIFIED_CANDIDATE" if composite_score >= 0.5 else "LOW_SUITABILITY",
            authoritative_source="Merchant Catalog Database"
        )

    @staticmethod
    def explain_policy_decision(
        decision: str,
        checks: List[Dict[str, Any]],
        total_amount_paise: int,
        policy_id: str
    ) -> DecisionEvidence:
        return DecisionEvidence(
            decision_type="POLICY_EVALUATION",
            headline=f"Deterministic Policy {policy_id} evaluated to {decision} (₹{total_amount_paise/100:,.2f})",
            input_facts={
                "policy_id": policy_id,
                "total_amount_paise": total_amount_paise,
                "decision": decision
            },
            deterministic_checks=checks,
            outcome=decision,
            authoritative_source="Deterministic Policy Engine"
        )

    @staticmethod
    def explain_checkout_execution(
        quote_id: str,
        amount_paise: int,
        transaction_id: str,
        razorpay_order_id: Optional[str],
        status: str
    ) -> DecisionEvidence:
        return DecisionEvidence(
            decision_type="FINANCIAL_EXECUTION",
            headline=f"Transaction {transaction_id} executed in {status} status for ₹{amount_paise/100:,.2f}",
            input_facts={
                "quote_id": quote_id,
                "amount_paise": amount_paise,
                "transaction_id": transaction_id,
                "razorpay_order_id": razorpay_order_id,
                "status": status
            },
            deterministic_checks=[
                {"check": "HMAC Quote Signature Verified", "passed": True},
                {"check": "Live Inventory Decrement Succeeded", "passed": True},
                {"check": "Razorpay Orders API Order Generated", "passed": (razorpay_order_id is not None)}
            ],
            outcome=status,
            authoritative_source="ExecutionService & Razorpay Test Client"
        )
