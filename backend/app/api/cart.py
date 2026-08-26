from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.quote_service import QuoteService
from app.schemas.catalog import (
    QuoteRequest,
    QuoteResponse,
    QuoteValidateRequest,
    QuoteValidateResponse
)

router = APIRouter(prefix="/agent/cart", tags=["Agent Cart & Quotes"])


@router.post(
    "/quote",
    response_model=QuoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Authoritative HMAC-Signed Cart Quote"
)
async def create_cart_quote(
    request: QuoteRequest,
    db: Session = Depends(get_db)
):
    """
    Accepts desired SKUs and quantities, checks live availability, fetches authoritative database prices,
    computes deterministic subtotals, and returns an HMAC SHA-256 signed quote with TTL.
    """
    service = QuoteService(db)
    return service.create_authoritative_quote(request)


@router.post(
    "/validate",
    response_model=QuoteValidateResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate Stored Quote against Real-Time Server State"
)
async def validate_cart_quote(
    request: QuoteValidateRequest,
    db: Session = Depends(get_db)
):
    """
    Validates quote signature integrity, expiration TTL, and checks that products remain active
    with sufficient inventory and unchanged authoritative prices.
    """
    service = QuoteService(db)
    return service.validate_quote(
        quote_id=request.quote_id,
        candidate_signature=request.signature
    )
