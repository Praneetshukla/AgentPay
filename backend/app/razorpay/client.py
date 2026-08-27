import hmac
import hashlib
import uuid
from typing import Dict, Any, Optional, Protocol
from app.core.config import settings
from app.razorpay.errors import RazorpayConfigError, RazorpayAPIError, WebhookSignatureError
from app.razorpay.models import RazorpayOrderCreate, RazorpayOrderResponse


class RazorpayClientInterface(Protocol):
    """Protocol for Razorpay client implementations (production and test fakes)."""
    def create_order(self, order_data: RazorpayOrderCreate) -> RazorpayOrderResponse:
        ...

    def verify_webhook_signature(self, webhook_body: str, webhook_signature: str) -> bool:
        ...


class RazorpayTestClient:
    """
    Official Razorpay Test Mode Client wrapper.
    Isolated from agent/LLM layer.
    """

    def __init__(
        self,
        key_id: Optional[str] = None,
        key_secret: Optional[str] = None,
        webhook_secret: Optional[str] = None
    ):
        self.key_id = key_id or settings.RAZORPAY_KEY_ID
        self.key_secret = key_secret or settings.RAZORPAY_KEY_SECRET
        self.webhook_secret = webhook_secret or settings.RAZORPAY_WEBHOOK_SECRET

    def _get_sdk_client(self):
        try:
            import razorpay
            return razorpay.Client(auth=(self.key_id, self.key_secret))
        except Exception as e:
            raise RazorpayConfigError(f"Failed to initialize Razorpay SDK client: {str(e)}")

    def create_order(self, order_data: RazorpayOrderCreate) -> RazorpayOrderResponse:
        # Check for placeholder credentials in local dev
        if self.key_id.startswith("rzp_test_placeholder") or not self.key_secret:
            # Safe mock fallback for non-credential local testing
            order_id = f"order_mock_{uuid.uuid4().hex[:14]}"
            return RazorpayOrderResponse(
                id=order_id,
                amount=order_data.amount,
                currency=order_data.currency,
                receipt=order_data.receipt,
                status="created",
                created_at=int(uuid.uuid1().time),
                notes=order_data.notes
            )

        client = self._get_sdk_client()
        try:
            payload = {
                "amount": order_data.amount,
                "currency": order_data.currency,
                "receipt": order_data.receipt,
                "notes": order_data.notes
            }
            order = client.order.create(data=payload)
            return RazorpayOrderResponse(
                id=order["id"],
                amount=order["amount"],
                currency=order["currency"],
                receipt=order.get("receipt", order_data.receipt),
                status=order.get("status", "created"),
                created_at=order.get("created_at", 0),
                notes=order.get("notes", {})
            )
        except Exception as e:
            raise RazorpayAPIError(f"Razorpay Orders API call failed: {str(e)}")

    def verify_webhook_signature(self, webhook_body: str, webhook_signature: str) -> bool:
        if not self.webhook_secret or not webhook_signature:
            return False
        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            webhook_body.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, webhook_signature)


class FakeRazorpayClient:
    """
    In-memory deterministic Razorpay client for hermetic unit & contract testing.
    """

    def __init__(self, webhook_secret: str = "test_webhook_secret_123"):
        self.webhook_secret = webhook_secret
        self.created_orders: Dict[str, RazorpayOrderResponse] = {}
        self.should_fail = False

    def create_order(self, order_data: RazorpayOrderCreate) -> RazorpayOrderResponse:
        if self.should_fail:
            raise RazorpayAPIError("Simulated Razorpay network gateway failure", status_code=502)

        order_id = f"order_test_{uuid.uuid4().hex[:14]}"
        resp = RazorpayOrderResponse(
            id=order_id,
            amount=order_data.amount,
            currency=order_data.currency,
            receipt=order_data.receipt,
            status="created",
            created_at=1700000000,
            notes=order_data.notes
        )
        self.created_orders[order_id] = resp
        return resp

    def verify_webhook_signature(self, webhook_body: str, webhook_signature: str) -> bool:
        if not self.webhook_secret or not webhook_signature:
            return False
        expected_sig = hmac.new(
            self.webhook_secret.encode("utf-8"),
            webhook_body.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return hmac.compare_digest(expected_sig, webhook_signature)
