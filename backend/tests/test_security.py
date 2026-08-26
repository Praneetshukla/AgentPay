from app.core.security import generate_cart_signature, verify_cart_signature


def test_cart_signature_generation_and_verification():
    cart_payload = {
        "merchant_id": "merchant_123",
        "items": [
            {"sku": "SKU_A", "quantity": 2, "unit_price": 500},
            {"sku": "SKU_B", "quantity": 1, "unit_price": 1000}
        ],
        "total_amount": 2000,
        "currency": "INR"
    }

    sig = generate_cart_signature(cart_payload)
    assert isinstance(sig, str)
    assert len(sig) == 64  # SHA256 hex string

    # Valid check
    assert verify_cart_signature(cart_payload, sig) is True

    # Tampered amount check
    tampered_cart = cart_payload.copy()
    tampered_cart["total_amount"] = 500
    assert verify_cart_signature(tampered_cart, sig) is False
