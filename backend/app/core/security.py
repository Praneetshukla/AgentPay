import hmac
import hashlib
import json
from typing import Any, Dict
from app.core.config import settings


def generate_cart_signature(cart_payload: Dict[str, Any]) -> str:
    """
    Generate a cryptographic HMAC SHA256 signature for a cart payload.
    Ensures client/LLM cannot tamper with prices, items, or totals.
    """
    canonical_payload = json.dumps(cart_payload, sort_keys=True, separators=(",", ":"))
    return hmac.new(
        settings.CART_HMAC_SECRET.encode("utf-8"),
        canonical_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verify_cart_signature(cart_payload: Dict[str, Any], signature: str) -> bool:
    """
    Verify if the provided signature matches the HMAC of the cart payload.
    """
    expected = generate_cart_signature(cart_payload)
    return hmac.compare_digest(expected, signature)
