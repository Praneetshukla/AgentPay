import hashlib
import json
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, desc

from app.db.models import AuditEvent
from app.core.security import canonicalize_payload

GENESIS_HASH = "0" * 64


def normalize_datetime_iso(dt: datetime) -> str:
    """Ensure consistent ISO string without microsecond variance for deterministic hashing."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).isoformat()


def calculate_event_hash(
    event_id: str,
    transaction_id: Optional[str],
    quote_id: Optional[str],
    event_type: str,
    actor: str,
    payload: Dict[str, Any],
    previous_event_hash: str,
    created_at_iso: str
) -> str:
    """
    Compute cryptographic SHA-256 hash of canonical audit event representation.
    """
    event_dict = {
        "event_id": event_id,
        "transaction_id": transaction_id or "",
        "quote_id": quote_id or "",
        "event_type": event_type,
        "actor": actor,
        "payload": payload,
        "previous_event_hash": previous_event_hash,
        "created_at": created_at_iso
    }
    canonical_str = canonicalize_payload(event_dict)
    return hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()


class AuditLedgerService:
    """
    Append-only tamper-evident audit ledger service.
    """

    def __init__(self, db: Session):
        self.db = db

    def record_event(
        self,
        event_type: str,
        actor: str,
        payload: Dict[str, Any],
        transaction_id: Optional[str] = None,
        quote_id: Optional[str] = None
    ) -> AuditEvent:
        """
        Appends an immutable, hash-chained audit event to the ledger.
        """
        # Retrieve latest event to chain previous_hash
        latest_event = self.db.scalars(
            select(AuditEvent).order_by(desc(AuditEvent.id))
        ).first()

        previous_hash = latest_event.event_hash if latest_event else GENESIS_HASH
        
        now = datetime.now(timezone.utc)
        created_at_iso = normalize_datetime_iso(now)
        event_id = f"evt_{hashlib.sha256((f'{now.timestamp()}_{event_type}_{transaction_id or quote_id}').encode()).hexdigest()[:16]}"

        event_hash = calculate_event_hash(
            event_id=event_id,
            transaction_id=transaction_id,
            quote_id=quote_id,
            event_type=event_type,
            actor=actor,
            payload=payload,
            previous_event_hash=previous_hash,
            created_at_iso=created_at_iso
        )

        event = AuditEvent(
            event_id=event_id,
            transaction_id=transaction_id,
            quote_id=quote_id,
            event_type=event_type,
            actor=actor,
            payload=payload,
            previous_event_hash=previous_hash,
            event_hash=event_hash,
            created_at=now
        )
        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)
        return event

    def verify_audit_chain(self) -> Tuple[bool, Optional[str], Optional[int]]:
        """
        Iterates and verifies the cryptographic SHA-256 hash chain of all audit events.
        Detects:
        - Payload modifications
        - Deleted events
        - Reordered events
        - Tampered previous_event_hash
        Returns: (is_valid, error_reason, failed_event_id)
        """
        events = list(self.db.scalars(select(AuditEvent).order_by(AuditEvent.id)).all())
        if not events:
            return True, None, None

        expected_prev_hash = GENESIS_HASH

        for idx, event in enumerate(events):
            # 1. Check previous hash continuity
            if event.previous_event_hash != expected_prev_hash:
                return False, f"Broken hash chain at event id {event.id}: previous_event_hash '{event.previous_event_hash}' does not match expected '{expected_prev_hash}'.", event.id

            # 2. Re-compute event hash
            created_at_iso = normalize_datetime_iso(event.created_at)
            
            recomputed_hash = calculate_event_hash(
                event_id=event.event_id,
                transaction_id=event.transaction_id,
                quote_id=event.quote_id,
                event_type=event.event_type,
                actor=event.actor,
                payload=event.payload,
                previous_event_hash=event.previous_event_hash,
                created_at_iso=created_at_iso
            )

            if recomputed_hash != event.event_hash:
                return False, f"Tampered event payload at event id {event.id}: recomputed hash '{recomputed_hash}' does not match stored hash '{event.event_hash}'.", event.id

            expected_prev_hash = event.event_hash

        return True, None, None
