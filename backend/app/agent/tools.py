from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.services.catalog_service import CatalogService
from app.services.quote_service import QuoteService
from app.guards.policy import DeterministicPolicyEngine
from app.guards.decisions import PolicyDecisionType
from app.razorpay.service import ExecutionService
from app.razorpay.models import CheckoutExecuteResponse
from app.schemas.catalog import QuoteRequest, CartItemRequest


class AgentToolSuite:
    """
    Narrowly scoped tool wrapper exposing server endpoints to the AI Buyer.
    
    CRITICAL ARCHITECTURAL BOUNDARY:
    The AI Agent CANNOT directly call Razorpay.
    The agent calls execute_checkout(quote_id), which routes through the
    server's fail-closed deterministic policy and stock verification gates.
    """

    def __init__(self, db: Session):
        self.db = db
        self.catalog_service = CatalogService(db)
        self.quote_service = QuoteService(db)
        self.policy_engine = DeterministicPolicyEngine(db)
        self.execution_service = ExecutionService(db)

    def search_catalog(self, search: Optional[str] = None, category: Optional[str] = None) -> List[Dict[str, Any]]:
        """Discover products through agent-readable merchant catalog."""
        products = self.catalog_service.list_products(
            category=category,
            search=search,
            active_only=True
        )
        return [
            {
                "sku": p.sku,
                "name": p.name,
                "description": p.description,
                "category": p.category,
                "price_paise": p.price,
                "currency": p.currency,
                "stock_quantity": p.stock_quantity,
                "active": p.active,
                "attributes": p.attributes
            }
            for p in products
        ]

    def get_product(self, sku: str) -> Optional[Dict[str, Any]]:
        """Lookup single SKU details from catalog."""
        p = self.catalog_service.get_product_by_sku(sku)
        if not p:
            return None
        return {
            "sku": p.sku,
            "name": p.name,
            "description": p.description,
            "category": p.category,
            "price_paise": p.price,
            "currency": p.currency,
            "stock_quantity": p.stock_quantity,
            "active": p.active
        }

    def create_server_quote(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Request authoritative quote from merchant server.
        The server calculates unit prices, subtotal, discounts, total, and cryptographic signature.
        """
        req_items = [CartItemRequest(sku=i["sku"], quantity=i.get("quantity", 1)) for i in items]
        quote_req = QuoteRequest(items=req_items)
        quote_read = self.quote_service.create_authoritative_quote(quote_req)
        return quote_read.model_dump(mode="json")

    def evaluate_policy_gate(self, quote_id: str, policy_id: str = "policy_demo") -> Dict[str, Any]:
        """
        Submit quote to deterministic policy gate for evaluation.
        Outputs ALLOW, BLOCK, or REQUIRE_CONFIRMATION with machine-readable reasons.
        """
        decision = self.policy_engine.evaluate_quote_policy(quote_id, policy_id)
        return decision.model_dump(mode="json")

    def execute_checkout(self, quote_id: str, policy_id: str = "policy_demo") -> CheckoutExecuteResponse:
        """
        Request checkout execution.
        Will ONLY proceed if policy gate evaluates to ALLOW and inventory is locked.
        """
        return self.execution_service.execute_checkout(quote_id=quote_id, policy_id=policy_id)
