from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select, desc
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.db.models import AuditEvent, Transaction
from app.ledger.service import AuditLedgerService

router = APIRouter(prefix="/ledger", tags=["Audit Ledger & Inspector"])


class AuditEventRead(BaseModel):
    id: int
    event_id: str
    transaction_id: Optional[str] = None
    quote_id: Optional[str] = None
    event_type: str
    actor: str
    payload: Dict[str, Any]
    previous_event_hash: str
    event_hash: str
    created_at: datetime


class AuditChainVerificationResponse(BaseModel):
    valid: bool
    error_reason: Optional[str] = None
    failed_event_id: Optional[int] = None
    total_events: int


@router.get(
    "/events",
    response_model=List[AuditEventRead],
    status_code=status.HTTP_200_OK,
    summary="Query Append-Only Immutable Audit Trail"
)
async def list_audit_events(
    transaction_id: Optional[str] = Query(None, description="Filter by transaction ID"),
    quote_id: Optional[str] = Query(None, description="Filter by quote ID"),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """
    Returns cryptographic hash-chained audit events for full explainability.
    """
    query = select(AuditEvent).order_by(desc(AuditEvent.id)).limit(limit)
    if transaction_id:
        query = query.where(AuditEvent.transaction_id == transaction_id.strip())
    if quote_id:
        query = query.where(AuditEvent.quote_id == quote_id.strip())
    return list(db.scalars(query).all())


@router.get(
    "/verify-chain",
    response_model=AuditChainVerificationResponse,
    status_code=status.HTTP_200_OK,
    summary="Cryptographically Verify Audit Trail Hash Chain Integrity"
)
async def verify_audit_trail_integrity(
    db: Session = Depends(get_db)
):
    """
    Traverses the entire audit ledger and verifies continuous cryptographic SHA-256 hash chaining.
    """
    service = AuditLedgerService(db)
    is_valid, reason, failed_id = service.verify_audit_chain()
    total_count = len(list(db.scalars(select(AuditEvent.id)).all()))
    return AuditChainVerificationResponse(
        valid=is_valid,
        error_reason=reason,
        failed_event_id=failed_id,
        total_events=total_count
    )
