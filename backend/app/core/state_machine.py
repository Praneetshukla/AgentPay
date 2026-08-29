from enum import Enum
from typing import Set, Tuple, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field


class AgentRunState(str, Enum):
    PARSE_INTENT = "PARSE_INTENT"
    DISCOVER = "DISCOVER"
    PLAN = "PLAN"
    QUOTE = "QUOTE"
    POLICY = "POLICY"
    RECOVERY = "RECOVERY"
    CONFIRMATION = "CONFIRMATION"
    EXECUTION = "EXECUTION"
    COMPLETED = "COMPLETED"
    BLOCKED = "BLOCKED"
    FAILED = "FAILED"


class TransactionState(str, Enum):
    CREATED = "CREATED"
    AUTHORIZED = "AUTHORIZED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


# Strict formal transition matrix
VALID_TRANSACTION_TRANSITIONS: Set[Tuple[TransactionState, TransactionState]] = {
    (TransactionState.CREATED, TransactionState.AUTHORIZED),
    (TransactionState.CREATED, TransactionState.FAILED),
    (TransactionState.CREATED, TransactionState.CANCELLED),
    (TransactionState.AUTHORIZED, TransactionState.PAYMENT_PENDING),
    (TransactionState.AUTHORIZED, TransactionState.FAILED),
    (TransactionState.PAYMENT_PENDING, TransactionState.PAID),
    (TransactionState.PAYMENT_PENDING, TransactionState.FAILED),
    (TransactionState.PAYMENT_PENDING, TransactionState.EXPIRED),
}


class StateTransitionRecord(BaseModel):
    from_state: str
    to_state: str
    valid: bool
    actor: str
    correlation_id: str
    reason: Optional[str] = None
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class FormalStateMachine:
    """
    Formal State Machine validator for Transactions and Agent Runs.
    Rejects illegal lifecycle jumps.
    """

    @staticmethod
    def validate_transaction_transition(
        from_state: TransactionState,
        to_state: TransactionState,
        actor: str,
        correlation_id: str,
        reason: Optional[str] = None
    ) -> StateTransitionRecord:
        is_valid = (from_state, to_state) in VALID_TRANSACTION_TRANSITIONS
        return StateTransitionRecord(
            from_state=from_state.value,
            to_state=to_state.value,
            valid=is_valid,
            actor=actor,
            correlation_id=correlation_id,
            reason=reason
        )
