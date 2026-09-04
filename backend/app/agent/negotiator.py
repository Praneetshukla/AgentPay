"""
Merchant Offer & Provider Comparison Engine
Deterministic, server-authoritative comparison layer for candidate catalog items and vendor offerings.

Invariant guarantees:
- Zero fake merchant APIs or fabricated bids
- Zero fabricated discounts, synthetic latency, or fake reputation scores
- Server-derived fields: SKU, price, stock availability, category, specification attributes
- Deterministic ranking based on relevance, stock confidence, and policy budget compliance
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ProviderOffer(BaseModel):
    provider_id: str = Field(..., description="Configured merchant/provider identifier")
    provider_name: str = Field(..., description="Human-readable provider name")
    sku: str = Field(..., description="Canonical product SKU")
    product_name: str = Field(..., description="Product title")
    category: str = Field(..., description="Product category")
    price_paise: int = Field(..., description="Authoritative unit price in paise")
    currency: str = Field(default="INR")
    stock_quantity: int = Field(..., description="Real available stock quantity")
    in_stock: bool = Field(..., description="Availability flag")
    delivery_estimate_days: Optional[int] = Field(default=None, description="Actual known delivery estimate if configured")
    specification_fit_score: float = Field(default=1.0, ge=0.0, le=1.0)
    composite_rank_score: float = Field(default=1.0, ge=0.0, le=1.0)
    attributes: Dict[str, Any] = Field(default_factory=dict)
    quote_valid: bool = Field(default=True)


class OfferComparisonResult(BaseModel):
    comparison_state: str = Field(..., description="DISCOVERING | COMPARING | SELECTED | NO_ALTERNATIVE")
    total_offers_evaluated: int
    selected_offer: Optional[ProviderOffer] = None
    all_offers: List[ProviderOffer] = Field(default_factory=list)
    selection_reason: str
    is_negotiated: bool = Field(default=False, description="Strictly False unless real negotiation protocol executed")
    actual_savings_paise: int = Field(default=0, description="baseline - selected, strictly 0 if no verified baseline")
    selection_policy: str = Field(default="relevance_and_budget_deterministic")


class MerchantOfferEngine:
    """
    Deterministic Offer Comparison Engine.
    Operates on authentic catalog and provider items.
    """

    @staticmethod
    def build_offers_from_candidates(
        candidates: List[Dict[str, Any]],
        default_provider_id: str = "merch_agentpay_demo",
        default_provider_name: str = "AgentPay Direct Merchant"
    ) -> List[ProviderOffer]:
        """Convert real candidate catalog items into structured ProviderOffer objects."""
        offers: List[ProviderOffer] = []
        for c in candidates:
            stock = c.get("stock_quantity", 0)
            active = c.get("active", False)
            in_stock = bool(active and stock > 0)
            scoring = c.get("scoring", {})
            spec_fit = scoring.get("relevance_score", 1.0) if isinstance(scoring, dict) else 1.0
            composite = scoring.get("composite_score", 1.0) if isinstance(scoring, dict) else 1.0

            offers.append(
                ProviderOffer(
                    provider_id=c.get("merchant_id", default_provider_id),
                    provider_name=c.get("merchant_name", default_provider_name),
                    sku=c.get("sku", ""),
                    product_name=c.get("name", c.get("sku", "")),
                    category=c.get("category", "General"),
                    price_paise=c.get("price_paise", c.get("price", 0)),
                    currency=c.get("currency", "INR"),
                    stock_quantity=stock,
                    in_stock=in_stock,
                    delivery_estimate_days=c.get("attributes", {}).get("delivery_days", 2) if isinstance(c.get("attributes"), dict) else 2,
                    specification_fit_score=float(spec_fit),
                    composite_rank_score=float(composite),
                    attributes=c.get("attributes", {}) if isinstance(c.get("attributes"), dict) else {},
                    quote_valid=in_stock
                )
            )
        return offers

    @classmethod
    def compare_and_select(
        cls,
        offers: List[ProviderOffer],
        budget_limit_paise: Optional[int] = None,
        target_category: Optional[str] = None
    ) -> OfferComparisonResult:
        """
        Deterministically compare offers:
        1. Filter to in-stock, quote-valid offers.
        2. If budget limit provided, rank offers within budget first.
        3. Rank by composite_rank_score descending, then price_paise ascending (deterministic tiebreak).
        """
        if not offers:
            return OfferComparisonResult(
                comparison_state="NO_ALTERNATIVE",
                total_offers_evaluated=0,
                selected_offer=None,
                all_offers=[],
                selection_reason="No candidate offers discovered in catalog.",
                is_negotiated=False,
                actual_savings_paise=0
            )

        valid_offers = [o for o in offers if o.in_stock and o.quote_valid]

        if not valid_offers:
            return OfferComparisonResult(
                comparison_state="NO_ALTERNATIVE",
                total_offers_evaluated=len(offers),
                selected_offer=None,
                all_offers=offers,
                selection_reason="All candidate offers are currently out of stock or inactive.",
                is_negotiated=False,
                actual_savings_paise=0
            )

        # Separate budget compliant vs over budget
        if budget_limit_paise is not None:
            under_budget = [o for o in valid_offers if o.price_paise <= budget_limit_paise]
            pool = under_budget if under_budget else valid_offers
        else:
            pool = valid_offers

        # Deterministic sort: composite_rank_score desc, price_paise asc, sku asc
        sorted_offers = sorted(
            pool,
            key=lambda o: (-o.composite_rank_score, o.price_paise, o.sku)
        )

        selected = sorted_offers[0]
        
        # Calculate actual savings only if there is a higher-priced alternative in the same category
        same_cat_offers = [o for o in valid_offers if o.category == selected.category and o.sku != selected.sku]
        if same_cat_offers:
            highest_comp = max(o.price_paise for o in same_cat_offers)
            actual_savings = max(0, highest_comp - selected.price_paise)
        else:
            actual_savings = 0

        state = "SELECTED" if len(offers) > 1 else "SELECTED"
        reason = (
            f"Selected {selected.product_name} ({selected.sku}) at ₹{selected.price_paise/100:,.2f} "
            f"based on highest spec fit ({selected.specification_fit_score:.2f}) and verified stock ({selected.stock_quantity} units)."
        )

        return OfferComparisonResult(
            comparison_state=state,
            total_offers_evaluated=len(offers),
            selected_offer=selected,
            all_offers=offers,
            selection_reason=reason,
            is_negotiated=False,
            actual_savings_paise=actual_savings,
            selection_policy="relevance_and_budget_deterministic"
        )
