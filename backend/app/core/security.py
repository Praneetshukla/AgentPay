import hmac
import hashlib
import json
from typing import Any, Dict
from app.core.config import settings


def canonicalize_payload(payload: Dict[str, Any]) -> str:
    """
    Produce a deterministic canonical string representation of a payload dictionary.
    Keys are sorted and compact JSON separators are enforced.
    """
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def generate_quote_signature(canonical_dict: Dict[str, Any]) -> str:
    """
    Generate a cryptographic HMAC SHA-256 signature for an authoritative quote dictionary.
    
    IMPORTANT SECURITY BOUNDARY:
    - This is a server-side cryptographic primitive.
    - Signing ensures tamper-evidence for quotes calculated by the server.
    - Signing ALONE does not grant authorization or substitute server-side state checks.
    """
    canonical_str = canonicalize_payload(canonical_dict)
    return hmac.new(
        settings.CART_HMAC_SECRET.encode("utf-8"),
        canonical_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


def verify_quote_signature(canonical_dict: Dict[str, Any], signature: str) -> bool:
    """
    Verify if the provided hex signature matches the expected HMAC of the quote payload
    using constant-time string comparison (hmac.compare_digest).
    """
    if not signature or not isinstance(signature, str):
        return False
    expected_signature = generate_quote_signature(canonical_dict)
    return hmac.compare_digest(expected_signature, signature)


# Backwards compatibility alias for phase 1 tests
def generate_cart_signature(cart_payload: Dict[str, Any]) -> str:
    return generate_quote_signature(cart_payload)


def verify_cart_signature(cart_payload: Dict[str, Any], signature: str) -> bool:
    return verify_quote_signature(cart_payload, signature)
