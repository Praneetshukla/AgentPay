import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.models import Transaction, TransactionStatus
from app.ledger.service import AuditLedgerService
from app.razorpay.client import RazorpayClientInterface, RazorpayTestClient
from app.razorpay.errors import WebhookSignatureError
from app.razorpay.service import ExecutionService
from app.core.events import event_broker, AgentExecutionEvent


class RazorpayWebhookProcessor:
    """
    Secure and idempotent Razorpay Webhook processor.
    """

    def __init__(
        self,
        db: Session,
        razorpay_client: Optional[RazorpayClientInterface] = None,
        audit_service: Optional[AuditLedgerService] = None
    ):
        self.db = db
        self.audit_service = audit_service or AuditLedgerService(db)
        self.razorpay_client = razorpay_client or RazorpayTestClient()
        self.execution_service = ExecutionService(db, razorpay_client=self.razorpay_client, audit_service=self.audit_service)

    def process_webhook(
        self,
        raw_body: str,
        signature: str
    ) -> Tuple[bool, str, Dict[str, Any]]:
        """
        Process Razorpay webhook payload:
        1. Verify HMAC SHA-256 webhook signature.
        2. Parse JSON event.
        3. Match known transaction by razorpay_order_id.
        4. Validate amount and currency consistency.
        5. Idempotent transition to PAID or FAILED.
        6. Append audit events.
        """
        actor = "razorpay_webhook_receiver"

        # 1. Verify Webhook Signature
        if not self.razorpay_client.verify_webhook_signature(raw_body, signature):
            self.audit_service.record_event(
                event_type="WEBHOOK_SIGNATURE_VERIFICATION_FAILED",
                actor=actor,
                payload={"error": "Signature mismatch on incoming webhook"}
            )
            return False, "INVALID_SIGNATURE", {"message": "Webhook signature mismatch"}

        # 2. Parse Event JSON
        try:
            event_data = json.loads(raw_body)
        except Exception:
            return False, "MALFORMED_PAYLOAD", {"message": "Invalid JSON body"}

        event_name = event_data.get("event")
        payload = event_data.get("payload", {})
        payment_entity = payload.get("payment", {}).get("entity", {})
        
        razorpay_order_id = payment_entity.get("order_id")
        razorpay_payment_id = payment_entity.get("id")
        amount = payment_entity.get("amount")
        currency = payment_entity.get("currency")

        if not razorpay_order_id:
            return False, "MISSING_ORDER_ID", {"message": "Webhook payload missing order_id"}

        # 3. Match known transaction
        transaction = self.db.scalars(
            select(Transaction).where(Transaction.razorpay_order_id == razorpay_order_id)
        ).first()

        if not transaction:
            self.audit_service.record_event(
                event_type="WEBHOOK_UNKNOWN_ORDER_RECEIVED",
                actor=actor,
                payload={"razorpay_order_id": razorpay_order_id, "event": event_name}
            )
            return False, "UNKNOWN_TRANSACTION", {"message": f"No local transaction found for order '{razorpay_order_id}'"}

        # 4. Verify Amount & Currency Consistency
        if amount is not None and amount != transaction.amount:
            self.audit_service.record_event(
                event_type="WEBHOOK_AMOUNT_MISMATCH_REJECTED",
                actor=actor,
                payload={
                    "webhook_amount": amount,
                    "transaction_amount": transaction.amount,
                    "razorpay_order_id": razorpay_order_id
                },
                transaction_id=transaction.id,
                quote_id=transaction.quote_id
            )
            return False, "AMOUNT_MISMATCH", {"message": "Webhook amount does not match transaction amount"}

        if currency and currency.upper() != transaction.currency.upper():
            return False, "CURRENCY_MISMATCH", {"message": "Webhook currency does not match transaction currency"}

        # 5. Idempotency Check: Already in terminal state
        if transaction.status == TransactionStatus.PAID and event_name == "payment.captured":
            self.audit_service.record_event(
                event_type="WEBHOOK_DUPLICATE_DELIVERY_IGNORED",
                actor=actor,
                payload={"razorpay_order_id": razorpay_order_id, "status": transaction.status.value},
                transaction_id=transaction.id,
                quote_id=transaction.quote_id
            )
            return True, "ALREADY_PROCESSED", {"transaction_id": transaction.id, "transaction_status": "PAID", "idempotent": True}

        # 6. Apply State Machine Transitions
        if event_name in ["payment.captured", "order.paid"]:
            transaction.razorpay_payment_id = razorpay_payment_id
            self.execution_service.transition_transaction_status(
                transaction=transaction,
                new_status=TransactionStatus.PAID,
                actor=actor,
                metadata_update={"razorpay_payment_id": razorpay_payment_id, "payment_payload": payment_entity}
            )
            audit_event = self.audit_service.record_event(
                event_type="PAYMENT_CAPTURED",
                actor=actor,
                payload={
                    "razorpay_payment_id": razorpay_payment_id,
                    "amount": transaction.amount,
                    "currency": transaction.currency
                },
                transaction_id=transaction.id,
                quote_id=transaction.quote_id
            )
            # Publish real-time SSE event
            event_broker.publish_sync(
                AgentExecutionEvent(
                    event_id=f"evt_{uuid.uuid4().hex[:16]}",
                    transaction_id=transaction.id,
                    quote_id=transaction.quote_id,
                    event_type="PAYMENT_CAPTURED",
                    node="payment_gateway",
                    status="SUCCESS",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    explanation=f"Payment captured successfully via Razorpay (Payment ID: {razorpay_payment_id})",
                    payload={
                        "transaction_id": transaction.id,
                        "razorpay_order_id": razorpay_order_id,
                        "razorpay_payment_id": razorpay_payment_id,
                        "amount": transaction.amount,
                        "currency": transaction.currency,
                        "status": "PAID",
                        "audit_event_id": audit_event.id if audit_event else None
                    }
                )
            )
            return True, "PAYMENT_CAPTURED", {"transaction_id": transaction.id, "transaction_status": "PAID"}

        elif event_name == "payment.failed":
            error_desc = payment_entity.get("error_description", "Payment failed via gateway")
            self.execution_service.transition_transaction_status(
                transaction=transaction,
                new_status=TransactionStatus.FAILED,
                actor=actor,
                reason=error_desc,
                metadata_update={"payment_payload": payment_entity}
            )
            audit_event = self.audit_service.record_event(
                event_type="PAYMENT_FAILED",
                actor=actor,
                payload={"error": error_desc, "razorpay_order_id": razorpay_order_id},
                transaction_id=transaction.id,
                quote_id=transaction.quote_id
            )
            # Publish real-time SSE event
            event_broker.publish_sync(
                AgentExecutionEvent(
                    event_id=f"evt_{uuid.uuid4().hex[:16]}",
                    transaction_id=transaction.id,
                    quote_id=transaction.quote_id,
                    event_type="PAYMENT_FAILED",
                    node="payment_gateway",
                    status="FAILED",
                    timestamp=datetime.now(timezone.utc).isoformat(),
                    explanation=f"Payment failed via gateway: {error_desc}",
                    payload={
                        "transaction_id": transaction.id,
                        "razorpay_order_id": razorpay_order_id,
                        "amount": transaction.amount,
                        "currency": transaction.currency,
                        "status": "FAILED",
                        "error": error_desc,
                        "audit_event_id": audit_event.id if audit_event else None
                    }
                )
            )
            return True, "PAYMENT_FAILED", {"transaction_id": transaction.id, "transaction_status": "FAILED", "reason": error_desc}

        return True, "EVENT_IGNORED", {"event": event_name, "message": "Unhandled webhook event ignored"}
