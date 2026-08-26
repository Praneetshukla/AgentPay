# Evaluation Harness & Scenarios (Track 01)

This directory contains evaluation scripts, failure scenario benchmarks, and automated security checks for **AgentPay Gateway**:

- `scenario_spending_limit.py`: Verifies deterministic rejection when cart exceeds spending cap.
- `scenario_tampered_cart.py`: Verifies HMAC integrity failure on altered pricing.
- `scenario_unauthorized_sku.py`: Verifies category/SKU restriction gates.
- `scenario_idempotent_webhook.py`: Verifies deduplication and consistency on repeated webhook events.
