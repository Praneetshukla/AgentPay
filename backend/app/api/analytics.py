from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from app.db.session import get_db
from app.services.revenue_intelligence import RevenueIntelligenceEngine
from app.ledger.service import AuditLedgerService

router = APIRouter(prefix="/analytics", tags=["Revenue & Commerce Analytics"])


class CrossSellRequest(BaseModel):
    current_skus: List[str] = Field(default_factory=list)
    current_total_paise: int = Field(default=0, ge=0)
    buyer_budget_paise: Optional[int] = None
    policy_id: str = Field(default="policy_demo")


class GrowthDecisionRequest(BaseModel):
    decision: str = Field(..., description="'ACCEPTED' or 'REJECTED'")
    sku: str
    product_name: str
    price_paise: int
    quote_id: Optional[str] = None


@router.get("/revenue", summary="Get Merchant Revenue & Commerce Intelligence Metrics")
def get_revenue_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns observable merchant revenue contribution, total GMV, average order value,
    recovered revenue, and incremental lift derived directly from SQLite transactions.
    """
    engine = RevenueIntelligenceEngine(db)
    return engine.get_revenue_metrics()


@router.post("/revenue/cross-sell-recommendations", summary="Generate Budget-Aware Complementary Cross-Sell Opportunities")
def get_cross_sell_recommendations(
    request: CrossSellRequest,
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Analyzes active cart SKUs and evaluates in-stock complementary candidates that fit
    strictly within the remaining buyer authority headroom.
    """
    engine = RevenueIntelligenceEngine(db)
    recs = engine.generate_recommendations(
        current_skus=request.current_skus,
        current_total_paise=request.current_total_paise,
        buyer_budget_paise=request.buyer_budget_paise
    )

    # Emit audit event for recommendation generation
    if recs:
        audit = AuditLedgerService(db)
        audit.record_event(
            event_type="RECOMMENDATION_GENERATED",
            actor="revenue_growth_engine",
            payload={
                "current_skus": request.current_skus,
                "current_total_paise": request.current_total_paise,
                "headroom_paise": recs[0].get("remaining_headroom", 0),
                "suggested_skus": [r["sku"] for r in recs]
            }
        )

    return recs


@router.post("/revenue/record-recommendation-decision", summary="Record Cryptographic Ledger Event for Growth Recommendation Acceptance/Rejection")
def record_growth_decision(
    request: GrowthDecisionRequest,
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Logs an immutable SHA-256 hash-chained event when a buyer accepts or rejects an advisory cross-sell.
    """
    event_type = "CROSS_SELL_ACCEPTED" if request.decision.upper() == "ACCEPTED" else "CROSS_SELL_REJECTED"
    audit = AuditLedgerService(db)
    event = audit.record_event(
        event_type=event_type,
        actor="user_buyer",
        payload={
            "sku": request.sku,
            "product_name": request.product_name,
            "incremental_amount_paise": request.price_paise,
            "decision": request.decision.upper()
        },
        quote_id=request.quote_id
    )

    return {
        "status": "recorded",
        "event_id": event.id,
        "event_type": event_type,
        "event_hash": event.event_hash
    }
