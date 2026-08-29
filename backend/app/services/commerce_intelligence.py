from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.db.models import Product


class RecommendationResult(BaseModel):
    sku: str
    name: str
    category: str
    reason: str
    affinity_score: float = Field(..., ge=0.0, le=1.0)
    budget_fit: float = Field(..., ge=0.0, le=1.0)
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    price_paise: int
    incremental_value_paise: int
    policy_safe: bool = True
    new_projected_total_paise: int


class CommerceIntelligenceEngine:
    """
    Production-Grade Commerce Intelligence Engine (Phase 9):
    - Multi-Objective Bundle & Upsell Detection
    - Complementary Product Affinity Analysis
    - Budget-Aware Cross-Sell & Opportunity Detection
    - Alternative Product Recommendations for OOS/Blocked Items
    
    SAFETY AXIOM:
    Recommendations are ADVISORY ONLY. They NEVER authorize payment,
    bypass quote signing, alter prices, or evade policy verification.
    """

    AFFINITY_RULES = {
        "Keyboards": [("Mice", 0.95), ("Adapters & Hubs", 0.85), ("Desk Accessories", 0.75)],
        "Mice": [("Desk Accessories", 0.90), ("Adapters & Hubs", 0.80), ("Keyboards", 0.70)],
        "Cameras": [("Adapters & Hubs", 0.90), ("Audio", 0.85), ("Desk Accessories", 0.65)],
        "Adapters & Hubs": [("Desk Accessories", 0.85), ("Keyboards", 0.60)],
        "Audio": [("Adapters & Hubs", 0.80), ("Desk Accessories", 0.70)]
    }

    def __init__(self, db: Session):
        self.db = db

    def generate_recommendations(
        self,
        current_skus: List[str],
        current_total_paise: int,
        budget_limit_paise: Optional[int],
        max_policy_limit_paise: int = 500000
    ) -> List[RecommendationResult]:
        """
        Analyzes cart SKUs and evaluates in-stock complementary candidates within remaining budget headroom.
        """
        effective_cap = min(budget_limit_paise or max_policy_limit_paise, max_policy_limit_paise)
        headroom = effective_cap - current_total_paise

        if headroom <= 0:
            return []

        # Find current categories
        current_products = self.db.scalars(select(Product).where(Product.sku.in_(current_skus))).all()
        target_affinities: Dict[str, float] = {}
        for p in current_products:
            complements = self.AFFINITY_RULES.get(p.category, [])
            for cat, aff in complements:
                target_affinities[cat] = max(target_affinities.get(cat, 0.0), aff)

        if not target_affinities:
            target_affinities = {"Desk Accessories": 0.75, "Adapters & Hubs": 0.70}

        candidates = self.db.scalars(
            select(Product)
            .where(
                Product.category.in_(list(target_affinities.keys())),
                Product.sku.notin_(current_skus),
                Product.stock_quantity > 0,
                Product.active == True,
                Product.price <= headroom
            )
            .order_by(Product.price.desc())
        ).all()

        recommendations: List[RecommendationResult] = []
        for c in candidates[:3]:  # Top 3 complementary items
            aff_score = target_affinities.get(c.category, 0.5)
            budget_fit_score = 1.0 - (c.price / headroom) if headroom > 0 else 0.0
            relevance = (aff_score * 0.6) + (budget_fit_score * 0.4)

            recommendations.append(RecommendationResult(
                sku=c.sku,
                name=c.name,
                category=c.category,
                reason=f"High affinity with cart ({c.category}) within ₹{headroom/100:,.2f} headroom",
                affinity_score=round(aff_score, 2),
                budget_fit=round(budget_fit_score, 2),
                relevance_score=round(relevance, 2),
                price_paise=c.price,
                incremental_value_paise=c.price,
                policy_safe=(current_total_paise + c.price <= max_policy_limit_paise),
                new_projected_total_paise=current_total_paise + c.price
            ))

        return recommendations

    def find_alternative_product(self, blocked_sku: str, max_price_paise: int) -> Optional[Product]:
        """
        Finds a lower-cost or in-stock alternative in the same category.
        """
        orig = self.db.scalars(select(Product).where(Product.sku == blocked_sku)).first()
        if not orig:
            return None

        alt = self.db.scalars(
            select(Product)
            .where(
                Product.category == orig.category,
                Product.sku != blocked_sku,
                Product.stock_quantity > 0,
                Product.active == True,
                Product.price <= max_price_paise
            )
            .order_by(Product.price.asc())
        ).first()

        return alt
