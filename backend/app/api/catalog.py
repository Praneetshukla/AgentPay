from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.catalog_service import CatalogService
from app.schemas.catalog import ProductRead, CatalogCapabilities
from app.core.config import settings

router = APIRouter()


@router.get(
    "/.well-known/agent-catalog.json",
    response_model=CatalogCapabilities,
    tags=["Agent Discovery"],
    summary="Agent-Readable Merchant Manifest"
)
async def get_agent_capabilities():
    """
    Exposes merchant metadata, supported capabilities, endpoints, and purchase constraints
    in a standardized machine-readable format for AI buyers.
    """
    return CatalogCapabilities(
        merchant_id="merch_agentpay_demo",
        merchant_name="AgentPay Demo Store (Electronics & Accessories)",
        version=settings.VERSION,
        currency="INR",
        endpoints={
            "discovery": "/.well-known/agent-catalog.json",
            "catalog": "/agent/catalog",
            "product_detail": "/agent/products/{sku}",
            "cart_quote": "/agent/cart/quote",
            "quote_validate": "/agent/cart/validate"
        },
        capabilities=[
            "product_discovery",
            "filtered_search",
            "authoritative_cart_quoting",
            "cryptographic_hmac_verification",
            "real_time_inventory_validation"
        ],
        purchase_constraints={
            "max_items_per_cart": 50,
            "max_units_per_sku": 100,
            "quote_ttl_seconds": 900,
            "supported_currency": "INR",
            "minimum_order_amount_paise": 100
        }
    )


@router.get(
    "/agent/catalog",
    response_model=List[ProductRead],
    tags=["Agent Commerce"],
    summary="Discover Merchant Products"
)
async def list_agent_catalog(
    category: Optional[str] = Query(None, description="Filter products by category name"),
    search: Optional[str] = Query(None, description="Search term for name/description/sku"),
    available_only: bool = Query(False, description="Only return items with positive stock"),
    db: Session = Depends(get_db)
):
    """
    Deterministic catalog query endpoint for autonomous agents.
    """
    service = CatalogService(db)
    return service.list_products(category=category, search=search, available_only=available_only)


@router.get(
    "/agent/products/{sku}",
    response_model=ProductRead,
    tags=["Agent Commerce"],
    summary="Get Authoritative Product Information by SKU"
)
async def get_product_by_sku(
    sku: str,
    db: Session = Depends(get_db)
):
    """
    Fetch authoritative real-time product pricing, description, and availability.
    """
    service = CatalogService(db)
    product = service.get_product_by_sku(sku)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with SKU '{sku}' not found."
        )
    return product
