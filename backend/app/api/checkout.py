from fastapi import APIRouter, Depends, Header, Request, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.db.session import get_db
from app.razorpay.service import ExecutionService
from app.razorpay.webhooks import RazorpayWebhookProcessor
from app.razorpay.models import CheckoutExecuteRequest, CheckoutExecuteResponse

router = APIRouter(tags=["Financial Execution & Webhooks"])


@router.post(
    "/agent/checkout/execute",
    response_model=CheckoutExecuteResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute Authorized Checkout and Create Razorpay Test Mode Order"
)
async def execute_checkout(
    request: CheckoutExecuteRequest,
    db: Session = Depends(get_db)
):
    """
    Financial Execution Boundary:
    Takes an authoritative quote ID, validates quote & real-time inventory,
    evaluates deterministic policy rules, and if ALLOW, generates a Razorpay Test Mode Order.
    """
    service = ExecutionService(db)
    return service.execute_checkout(
        quote_id=request.quote_id,
        policy_id=request.policy_id
    )


@router.post(
    "/webhooks/razorpay",
    status_code=status.HTTP_200_OK,
    summary="Receive and Idempotently Process Razorpay Webhooks"
)
async def razorpay_webhook_endpoint(
    request: Request,
    x_razorpay_signature: str = Header(..., alias="X-Razorpay-Signature"),
    db: Session = Depends(get_db)
):
    """
    Validates HMAC signature of incoming Razorpay payment webhooks and triggers state machine transitions.
    """
    raw_body = (await request.body()).decode("utf-8")
    processor = RazorpayWebhookProcessor(db)
    success, code, details = processor.process_webhook(
        raw_body=raw_body,
        signature=x_razorpay_signature
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": code, **details}
        )
    return {"status": "success", "code": code, **details}
