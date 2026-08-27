import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import Quote, Policy, Transaction, TransactionStatus, VALID_STATUS_TRANSITIONS
from app.guards.policy import DeterministicPolicyEngine
from app.guards.decisions import PolicyDecisionType
from app.ledger.service import AuditLedgerService
from app.razorpay.client import RazorpayClientInterface, RazorpayTestClient
from app.razorpay.models import RazorpayOrderCreate, CheckoutExecuteResponse
from app.razorpay.errors import RazorpayAPIError


class ExecutionService:
    """
    Financial Execution Boundary Service.
    
    Orchestrates:
    Quote -> Quote Validation -> Policy Engine -> ALLOW -> Transaction -> Razorpay Order -> Audit Event
    """

    def __init__(
        self,
        db: Session,
        razorpay_client: Optional[RazorpayClientInterface] = None,
        audit_service: Optional[AuditLedgerService] = None
    ):
        self.db = db
        self.policy_engine = DeterministicPolicyEngine(db)
        self.audit_service = audit_service or AuditLedgerService(db)
        self.razorpay_client = razorpay_client or RazorpayTestClient()

    def transition_transaction_status(
        self,
        transaction: Transaction,
        new_status: TransactionStatus,
        actor: str,
        reason: Optional[str] = None,
        metadata_update: Optional[Dict[str, Any]] = None
    ) -> Transaction:
        """
        Enforce strict state machine transitions and append audit event.
        """
        current_status = transaction.status
        allowed_transitions = VALID_STATUS_TRANSITIONS.get(current_status, [])

        if new_status not in allowed_transitions:
            err_msg = f"Invalid state transition from '{current_status.value}' to '{new_status.value}'."
            self.audit_service.record_event(
                event_type="STATE_TRANSITION_REJECTED",
                actor=actor,
                payload={
                    "current_status": current_status.value,
                    "target_status": new_status.value,
                    "reason": err_msg
                },
                transaction_id=transaction.id,
                quote_id=transaction.quote_id
            )
            raise ValueError(err_msg)

        transaction.status = new_status
        if reason:
            transaction.failure_reason = reason
        if metadata_update:
            transaction.metadata_payload = {**transaction.metadata_payload, **metadata_update}
        
        transaction.updated_at = datetime.now(timezone.utc)
        self.db.commit()

        # Record audit event
        self.audit_service.record_event(
            event_type="TRANSACTION_STATE_CHANGED",
            actor=actor,
            payload={
                "from_status": current_status.value,
                "to_status": new_status.value,
                "reason": reason or ""
            },
            transaction_id=transaction.id,
            quote_id=transaction.quote_id
        )
        return transaction

    def execute_checkout(self, quote_id: str, policy_id: str = "policy_demo") -> CheckoutExecuteResponse:
        """
        Strict Execution Boundary:
        1. Checks for existing transaction (Idempotency).
        2. Evaluates Deterministic Policy Gate.
        3. If Decision == BLOCK or REQUIRE_CONFIRMATION -> stops immediately, no Razorpay call.
        4. If Decision == ALLOW -> Creates Transaction in CREATED status.
        5. Calls Razorpay Test Mode client.
        6. Transitions status to PAYMENT_PENDING.
        7. Records all audit events.
        """
        actor = "agent_checkout_service"

        # 1. Idempotency Check: Existing Transaction for this Quote
        existing_tx = self.db.scalars(select(Transaction).where(Transaction.quote_id == quote_id.strip())).first()
        if existing_tx:
            self.audit_service.record_event(
                event_type="DUPLICATE_EXECUTION_ATTEMPTED",
                actor=actor,
                payload={
                    "message": "Duplicate checkout execution request received. Returning existing transaction.",
                    "existing_transaction_id": existing_tx.id,
                    "status": existing_tx.status.value,
                    "razorpay_order_id": existing_tx.razorpay_order_id
                },
                transaction_id=existing_tx.id,
                quote_id=quote_id
            )
            return CheckoutExecuteResponse(
                success=True,
                status=existing_tx.status.value,
                transaction_id=existing_tx.id,
                razorpay_order_id=existing_tx.razorpay_order_id,
                amount=existing_tx.amount,
                currency=existing_tx.currency,
                decision="ALLOW",
                details={"idempotent": True, "message": "Transaction already initiated"}
            )

        # 2. Evaluate Policy Gate (includes Quote validation, signature integrity, and stock checks)
        decision = self.policy_engine.evaluate_quote_policy(quote_id, policy_id)

        # Record Policy Decision in Audit Trail
        self.audit_service.record_event(
            event_type="POLICY_EVALUATED",
            actor=actor,
            payload={
                "decision": decision.decision.value,
                "policy_id": decision.policy_id,
                "policy_version": decision.policy_version,
                "reasons": [r.model_dump() for r in decision.reasons],
                "checks_count": len(decision.checks)
            },
            quote_id=quote_id
        )

        # 3. Handle Non-ALLOW Decisions
        if decision.decision == PolicyDecisionType.BLOCK:
            self.audit_service.record_event(
                event_type="EXECUTION_REJECTED_POLICY_BLOCKED",
                actor=actor,
                payload={
                    "reasons": [r.model_dump() for r in decision.reasons]
                },
                quote_id=quote_id
            )
            return CheckoutExecuteResponse(
                success=False,
                status="BLOCKED",
                decision="BLOCK",
                reason=decision.reasons[0].code if decision.reasons else "POLICY_BLOCKED",
                details={"reasons": [r.model_dump() for r in decision.reasons]}
            )

        if decision.decision == PolicyDecisionType.REQUIRE_CONFIRMATION:
            self.audit_service.record_event(
                event_type="EXECUTION_HELD_CONFIRMATION_REQUIRED",
                actor=actor,
                payload={
                    "reasons": [r.model_dump() for r in decision.reasons]
                },
                quote_id=quote_id
            )
            return CheckoutExecuteResponse(
                success=False,
                status="REQUIRE_CONFIRMATION",
                decision="REQUIRE_CONFIRMATION",
                reason="REQUIRE_CONFIRMATION",
                details={"reasons": [r.model_dump() for r in decision.reasons]}
            )

        # 4. Decision is strictly ALLOW -> Retrieve authoritative quote
        quote = self.db.scalars(select(Quote).where(Quote.id == quote_id)).first()
        if not quote:
            return CheckoutExecuteResponse(
                success=False,
                status="FAILED",
                decision="BLOCK",
                reason="QUOTE_NOT_FOUND"
            )

        # 5. Initialize Transaction in CREATED status
        transaction_id = f"tx_{uuid.uuid4().hex[:16]}"
        transaction = Transaction(
            id=transaction_id,
            quote_id=quote.id,
            policy_id=decision.policy_id or policy_id,
            policy_version=decision.policy_version or 1,
            amount=quote.total,
            currency=quote.currency,
            status=TransactionStatus.CREATED,
            metadata_payload={"policy_decision": decision.model_dump(mode="json")}
        )
        self.db.add(transaction)
        self.db.commit()

        self.audit_service.record_event(
            event_type="TRANSACTION_CREATED",
            actor=actor,
            payload={
                "amount": quote.total,
                "currency": quote.currency,
                "policy_id": transaction.policy_id
            },
            transaction_id=transaction.id,
            quote_id=quote.id
        )

        # 6. Authorize with Razorpay Test Mode Orders API
        try:
            # Transition to AUTHORIZED internally
            self.transition_transaction_status(transaction, TransactionStatus.AUTHORIZED, actor=actor)

            order_req = RazorpayOrderCreate(
                amount=quote.total,
                currency=quote.currency,
                receipt=transaction.id,
                notes={"quote_id": quote.id, "transaction_id": transaction.id}
            )
            razorpay_order = self.razorpay_client.create_order(order_req)
            
            # Transition to PAYMENT_PENDING with razorpay_order_id attached
            transaction.razorpay_order_id = razorpay_order.id
            self.transition_transaction_status(
                transaction,
                TransactionStatus.PAYMENT_PENDING,
                actor=actor,
                metadata_update={"razorpay_order": razorpay_order.model_dump()}
            )

            self.audit_service.record_event(
                event_type="RAZORPAY_ORDER_CREATED",
                actor=actor,
                payload={
                    "razorpay_order_id": razorpay_order.id,
                    "amount": razorpay_order.amount,
                    "currency": razorpay_order.currency
                },
                transaction_id=transaction.id,
                quote_id=quote.id
            )

            return CheckoutExecuteResponse(
                success=True,
                status=TransactionStatus.PAYMENT_PENDING.value,
                transaction_id=transaction.id,
                razorpay_order_id=razorpay_order.id,
                amount=transaction.amount,
                currency=transaction.currency,
                decision="ALLOW",
                details={"message": "Razorpay order created successfully"}
            )

        except RazorpayAPIError as e:
            # External gateway failure -> Mark transaction FAILED safely
            self.transition_transaction_status(
                transaction,
                TransactionStatus.FAILED,
                actor=actor,
                reason=f"Razorpay API Error: {str(e)}"
            )
            self.audit_service.record_event(
                event_type="RAZORPAY_ORDER_CREATION_FAILED",
                actor=actor,
                payload={"error": str(e)},
                transaction_id=transaction.id,
                quote_id=quote.id
            )
            return CheckoutExecuteResponse(
                success=False,
                status=TransactionStatus.FAILED.value,
                transaction_id=transaction.id,
                decision="ALLOW",
                reason="RAZORPAY_GATEWAY_ERROR",
                details={"error": str(e)}
            )
