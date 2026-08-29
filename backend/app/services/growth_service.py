from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import Product


class MerchantGrowthEngine:
    """
    Merchant Revenue Intelligence:
    Identifies high-synergy complementary items that fit strictly within remaining budget.
    Ensures suggestions NEVER bypass buyer constraints, spending limits, or deterministic policies.
    """

    # Affinity Graph (e.g., Keyboard -> Wrist Rest, Mouse, Desk Mat, USB Hub)
    COMPLEMENTARY_MAP = {
        "Keyboards": ["Mice", "Adapters & Hubs", "Desk Accessories"],
        "Mice": ["Desk Accessories", "Adapters & Hubs"],
        "Cameras": ["Adapters & Hubs", "Audio"],
        "Adapters & Hubs": ["Desk Accessories"]
    }

    def __init__(self, db: Session):
        self.db = db

    def suggest_upsell(
        self,
        current_skus: List[str],
        current_total_paise: int,
        budget_limit_paise: Optional[int],
        max_policy_limit_paise: int = 500000
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates remaining budget headroom and finds the highest-affinity in-stock product.
        Headroom = min(budget_limit, max_policy_limit) - current_total.
        """
        effective_cap = min(budget_limit_paise or max_policy_limit_paise, max_policy_limit_paise)
        headroom = effective_cap - current_total_paise

        if headroom <= 0:
            return None

        # Determine target categories based on cart contents
        current_products = self.db.scalars(select(Product).where(Product.sku.in_(current_skus))).all()
        target_cats = set()
        for p in current_products:
            complements = self.COMPLEMENTARY_MAP.get(p.category, [])
            target_cats.update(complements)

        if not target_cats:
            target_cats = {"Desk Accessories", "Adapters & Hubs"}

        # Find candidate products within headroom and in-stock
        candidates = self.db.scalars(
            select(Product)
            .where(
                Product.category.in_(list(target_cats)),
                Product.sku.notin_(current_skus),
                Product.stock_quantity > 0,
                Product.active == True,
                Product.price <= headroom
            )
            .order_by(Product.price.desc())  # Maximize revenue within headroom
        ).all()

        if not candidates:
            return None

        best = candidates[0]
        return {
            "sku": best.sku,
            "name": best.name,
            "category": best.category,
            "price_paise": best.price,
            "reason": f"Complementary upgrade fitting within ₹{headroom/100:,.2f} remaining budget headroom",
            "new_projected_total_paise": current_total_paise + best.price
        }
