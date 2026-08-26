import pytest
from app.core.security import (
    canonicalize_payload,
    generate_quote_signature,
    verify_quote_signature
)


def test_canonicalization_determinism():
    payload_a = {"b": 2, "a": 1, "items": [{"sku": "SKU1", "qty": 1}]}
    payload_b = {"a": 1, "b": 2, "items": [{"sku": "SKU1", "qty": 1}]}
    assert canonicalize_payload(payload_a) == canonicalize_payload(payload_b)
    assert generate_quote_signature(payload_a) == generate_quote_signature(payload_b)


def test_quote_signature_tamper_detection():
    quote_payload = {
        "quote_id": "qt_test_123456",
        "merchant_id": "merch_demo_01",
        "currency": "INR",
        "subtotal": 5000,
        "discounts": 0,
        "total": 5000,
        "expires_at": 1700000000,
        "inventory_version": 1,
        "items": [
            {"sku": "KB-MECH-001", "quantity": 1, "unit_price": 5000}
        ]
    }

    sig = generate_quote_signature(quote_payload)
    assert isinstance(sig, str)
    assert len(sig) == 64
    assert verify_quote_signature(quote_payload, sig) is True

    # 1. Tamper with price / total
    tampered_price = quote_payload.copy()
    tampered_price["total"] = 1000
    assert verify_quote_signature(tampered_price, sig) is False

    # 2. Tamper with quantity
    tampered_qty = quote_payload.copy()
    tampered_qty["items"] = [{"sku": "KB-MECH-001", "quantity": 2, "unit_price": 5000}]
    assert verify_quote_signature(tampered_qty, sig) is False

    # 3. Tamper with SKU
    tampered_sku = quote_payload.copy()
    tampered_sku["items"] = [{"sku": "MOUSE-WL-002", "quantity": 1, "unit_price": 5000}]
    assert verify_quote_signature(tampered_sku, sig) is False

    # 4. Tamper with expiry
    tampered_expiry = quote_payload.copy()
    tampered_expiry["expires_at"] = 1799999999
    assert verify_quote_signature(tampered_expiry, sig) is False

    # 5. Tamper with inventory_version
    tampered_version = quote_payload.copy()
    tampered_version["inventory_version"] = 2
    assert verify_quote_signature(tampered_version, sig) is False

    # 6. Tamper with currency
    tampered_curr = quote_payload.copy()
    tampered_curr["currency"] = "USD"
    assert verify_quote_signature(tampered_curr, sig) is False


def test_quote_signature_replay_rejection():
    quote_1 = {"quote_id": "qt_01", "total": 100, "items": []}
    quote_2 = {"quote_id": "qt_02", "total": 100, "items": []}
    sig_1 = generate_quote_signature(quote_1)
    sig_2 = generate_quote_signature(quote_2)
    assert sig_1 != sig_2
    assert verify_quote_signature(quote_2, sig_1) is False
