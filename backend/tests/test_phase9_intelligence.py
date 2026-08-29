import pytest
import json
import asyncio
from httpx import AsyncClient
from app.db.session import SessionLocal
from app.db.models import Product, Quote, Transaction
from app.services.commerce_intelligence import CommerceIntelligenceEngine
from app.agent.negotiation import BoundedNegotiationEngine, NegotiationState
from app.agent.models import CartItemProposal
from app.services.explainability import ExplainabilityEngine


@pytest.mark.asyncio
async def test_commerce_intelligence_advisory_safety():
    """Verify commerce intelligence recommendations NEVER bypass budget or force checkout."""
    with SessionLocal() as db:
        engine = CommerceIntelligenceEngine(db)
        # Cart with ₹2,499 keyboard and ₹3,000 budget cap (headroom: ₹501)
        recs = engine.generate_recommendations(
            current_skus=["KB-MECH-001"],
            current_total_paise=249900,
            budget_limit_paise=300000,
            max_policy_limit_paise=500000
        )
        for r in recs:
            # Must strictly fit within headroom and policy
            assert r.price_paise <= (300000 - 249900)
            assert r.policy_safe is True


@pytest.mark.asyncio
async def test_bounded_negotiation_terminates_strictly_at_max_iterations():
    """Verify negotiation halts strictly after 3 attempts without infinite loops."""
    with SessionLocal() as db:
        neg = BoundedNegotiationEngine(db)
        proposals = [
            CartItemProposal(sku="KB-MECH-001", quantity=1, priority=1),
            CartItemProposal(sku="MOUSE-WL-002", quantity=1, priority=2),
            CartItemProposal(sku="STAND-ALUM-004", quantity=1, priority=3)
        ]
        # Attempt 1
        p1, step1 = neg.negotiate_cart(proposals, budget_limit_paise=200000, failure_reason="AMOUNT_EXCEEDS_LIMIT", attempt=1)
        assert step1.state in [NegotiationState.PRUNE, NegotiationState.SUBSTITUTE]

        # Attempt 3 (Max)
        p3, step3 = neg.negotiate_cart(p1, budget_limit_paise=200000, failure_reason="AMOUNT_EXCEEDS_LIMIT", attempt=3)
        assert step3.state == NegotiationState.STOP


@pytest.mark.asyncio
async def test_explainability_factual_integrity():
    """Verify explainability engine produces mathematical and policy facts without contradictions."""
    ev = ExplainabilityEngine.explain_candidate_ranking(
        sku="KB-MECH-001",
        name="ProKey Keyboard",
        relevance=0.95,
        category_match=1.0,
        availability=1.0,
        budget_fit=0.85,
        composite_score=0.96
    )
    assert ev.decision_type == "PRODUCT_RANKING"
    assert ev.mathematical_formula is not None
    assert ev.outcome == "QUALIFIED_CANDIDATE"
    assert ev.input_facts["composite_score"] == 0.96


@pytest.mark.asyncio
async def test_growth_upsell_cannot_bypass_policy_spending_caps(async_client: AsyncClient):
    """Verify upsell suggestions cannot cause policy evaluation to exceed hard policy cap."""
    resp = await async_client.post("/agent/buy", json={"request": "I need a workstation under ₹5,000"})
    assert resp.status_code == 200
    data = resp.json()
    if data.get("quote"):
        assert data["quote"]["total"] <= 500000  # Hard policy cap ₹5,000


@pytest.mark.asyncio
async def test_unauthorized_money_actions_strictly_zero_in_phase_9(async_client: AsyncClient):
    """Verify zero unauthorized executions across intelligent optimization and negotiation cycles."""
    resp = await async_client.post("/agent/buy", json={"request": "Buy luxury watch for ₹100,000"})
    assert resp.status_code in [200, 400, 422]
    data = resp.json()
    exec_res = data.get("execution_result") or {}
    assert exec_res.get("amount", 0) <= 500000
    if exec_res.get("amount", 0) > 0:
        assert data.get("policy_decision", {}).get("decision") == "ALLOW"
