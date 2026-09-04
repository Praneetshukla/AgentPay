from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import get_db
from app.db.models import Policy, Transaction, TransactionStatus
from app.guards.policy import DeterministicPolicyEngine
from app.guards.models import (
    PolicyDecision,
    PolicyEvaluateRequest,
    PolicyRead,
    PolicyUpdateRequest,
    PolicySummaryRead,
)
from app.ledger.service import AuditLedgerService

router = APIRouter(prefix="/agent/policy", tags=["Deterministic Policy Gate"])


@router.post(
    "/evaluate",
    response_model=PolicyDecision,
    status_code=status.HTTP_200_OK,
    summary="Evaluate Authoritative Quote Against Deterministic Financial Policy"
)
async def evaluate_transaction_policy(
    request: PolicyEvaluateRequest,
    db: Session = Depends(get_db)
):
    """
    Evaluates an authoritative server quote ID against the deterministic financial policy.
    Returns structured decision: ALLOW, BLOCK, or REQUIRE_CONFIRMATION with all check audits.
    """
    engine = DeterministicPolicyEngine(db)
    return engine.evaluate_quote_policy(
        quote_id=request.quote_id,
        policy_id=request.policy_id
    )


@router.get(
    "/{policy_id}/summary",
    response_model=PolicySummaryRead,
    status_code=status.HTTP_200_OK,
    summary="Get Database-Derived Spending & Policy Summary"
)
async def get_policy_summary(
    policy_id: str,
    db: Session = Depends(get_db)
):
    """
    Calculates live spending, available headroom, and active policy parameters from real database state.
    """
    policy = db.scalars(select(Policy).where(Policy.id == policy_id.strip())).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy '{policy_id}' not found."
        )

    # Sum all paid transactions from real database records
    successful_txs = db.scalars(
        select(Transaction).where(
            Transaction.policy_id == policy.id,
            Transaction.status.in_([TransactionStatus.PAID, TransactionStatus.PAYMENT_PENDING])
        )
    ).all()

    total_spent_paise = sum(tx.amount for tx in successful_txs)
    available_headroom = max(0, policy.max_transaction_amount - total_spent_paise)

    return PolicySummaryRead(
        policy_id=policy.id,
        policy_version=policy.policy_version,
        merchant_id=policy.merchant_id,
        currency=policy.currency,
        max_transaction_amount=policy.max_transaction_amount,
        confirmation_threshold=policy.confirmation_threshold,
        total_spent_paise=total_spent_paise,
        available_headroom_paise=available_headroom,
        successful_transactions_count=len(successful_txs),
        allowed_categories=policy.allowed_categories,
        max_cart_items=policy.max_cart_items,
        max_quantity_per_sku=policy.max_quantity_per_sku,
        active=policy.active,
        last_updated=policy.updated_at
    )


@router.get(
    "/{policy_id}",
    response_model=PolicyRead,
    status_code=status.HTTP_200_OK,
    summary="Inspect Active Policy Rules"
)
async def get_policy_details(
    policy_id: str,
    db: Session = Depends(get_db)
):
    """
    Read policy limits, allowed categories, and threshold configurations.
    """
    policy = db.scalars(select(Policy).where(Policy.id == policy_id.strip())).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy '{policy_id}' not found."
        )
    return policy


@router.patch(
    "/{policy_id}",
    response_model=PolicyRead,
    status_code=status.HTTP_200_OK,
    summary="Update Delegation Policy Constraints in Database"
)
async def update_policy_constraints(
    policy_id: str,
    request: PolicyUpdateRequest,
    db: Session = Depends(get_db)
):
    """
    Persistently mutates policy boundaries in the database, increments policy_version,
    and logs an immutable cryptographic audit record.
    """
    policy = db.scalars(select(Policy).where(Policy.id == policy_id.strip())).first()
    if not policy:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Policy '{policy_id}' not found."
        )

    # Server-side validation of boundaries
    if request.max_transaction_amount is not None:
        if request.max_transaction_amount <= 0:
            raise HTTPException(status_code=400, detail="max_transaction_amount must be positive.")
        policy.max_transaction_amount = request.max_transaction_amount

    if request.confirmation_threshold is not None:
        if request.confirmation_threshold <= 0:
            raise HTTPException(status_code=400, detail="confirmation_threshold must be positive.")
        policy.confirmation_threshold = request.confirmation_threshold

    if request.allowed_categories is not None:
        policy.allowed_categories = request.allowed_categories

    if request.max_cart_items is not None:
        policy.max_cart_items = request.max_cart_items

    if request.max_quantity_per_sku is not None:
        policy.max_quantity_per_sku = request.max_quantity_per_sku

    policy.policy_version += 1
    policy.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(policy)

    # Record immutable audit event
    audit_service = AuditLedgerService(db)
    audit_service.record_event(
        event_type="POLICY_UPDATED",
        actor="policy_admin",
        payload={
            "policy_id": policy.id,
            "new_version": policy.policy_version,
            "max_transaction_amount": policy.max_transaction_amount,
            "confirmation_threshold": policy.confirmation_threshold,
            "allowed_categories": policy.allowed_categories
        }
    )

    return policy
