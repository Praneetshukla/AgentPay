from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.db.session import get_db
from app.services.revenue_intelligence import RevenueIntelligenceEngine

router = APIRouter(prefix="/analytics", tags=["Revenue & Commerce Analytics"])


@router.get("/revenue", summary="Get Merchant Revenue & Commerce Intelligence Metrics")
def get_revenue_analytics(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns observable merchant revenue contribution, baseline vs optimized cart values,
    and incremental value delivered by advisory recommendations.
    """
    engine = RevenueIntelligenceEngine(db)
    return engine.get_revenue_metrics()
