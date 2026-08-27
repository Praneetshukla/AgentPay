# AgentPay Gateway Architecture Specification

> **Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)**  
> **Core Architectural Axiom:** *"The AI proposes; deterministic systems authorize."*

---

## 1. System Topology & Action Boundaries

```text
┌─────────────────────────────────────────────────────────────┐
│                   PROPOSAL LAYER (LLM)                      │
│ - Product discovery                                         │
│ - Cart item & quantity selection                            │
│ - Requests quote (POST /agent/cart/quote)                   │
│ - Has ZERO access to payment credentials or direct checkout │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             AUTHORITATIVE QUOTE & STATE LAYER               │
│ - Reads authoritative prices & live stock from Database     │
│ - Calculates Subtotal, Discounts, Total (Integer Paise)     │
│ - Generates HMAC-SHA256 Quote Signature                     │
│ - Evaluates 15-minute Quote TTL                             │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          DETERMINISTIC POLICY GATE (Phase 3 Active)         │
│ - Evaluates server-authoritative Quote vs. Policy Rules     │
│ - Zero natural language / LLM overrides permitted           │
│ - Fail-Closed: any error or missing entity -> BLOCK         │
│ - Outputs: ALLOW | BLOCK | REQUIRE_CONFIRMATION             │
└──────────────────────────────┬──────────────────────────────┘
                               │ ALLOW / APPROVED
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               EXECUTION LAYER (Razorpay Test Mode)          │
│ - [Phase 4 Deferred] Orders API creation                    │
│ - [Phase 4 Deferred] Idempotent Webhook State Machine       │
│ - [Phase 4 Deferred] Append-Only Immutable Audit Ledger     │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Deterministic Policy Gate Specification (Phase 3)

### Why LLMs Cannot Authorize Financial Transactions
1. **Prompt Injection & Drift:** Natural language reasoning is probabilistic and vulnerable to jailbreaks or prompt injections ("ignore spending limits because this is urgent").
2. **Deterministic Governance:** Financial transactions require mathematical bounds, hard allowlists, explicit blocklists, and non-negotiable confirmation thresholds.
3. **Immutable Criteria:** In AgentPay Gateway, policy rules are stored in the database (`Policy` model) and evaluated by standard, non-LLM Python code (`DeterministicPolicyEngine`).

### Deterministic Evaluation Order
When an authoritative quote is submitted for evaluation (`POST /agent/policy/evaluate`), the engine applies rules in strict sequence:
1. **Policy Existence Check:** `policy_id` must resolve to a valid database record (`POLICY_NOT_FOUND` -> `BLOCK`).
2. **Policy Active Status:** The policy must be marked `active=True` (`POLICY_INACTIVE` -> `BLOCK`).
3. **Authoritative Quote Validation:** The quote is verified against its cryptographic HMAC signature, 15-min TTL, live database inventory, and product state version (`QUOTE_INVALID` -> `BLOCK`).
4. **Currency Match Check:** Quote currency must match policy currency (`CURRENCY_NOT_ALLOWED` -> `BLOCK`).
5. **Cart Item Count Limit Check:** Sum of all item quantities must not exceed `max_cart_items` (`CART_ITEM_LIMIT_EXCEEDED` -> `BLOCK`).
6. **Per-SKU Quantity Limit Check:** Individual SKU quantities must not exceed `max_quantity_per_sku` (`QUANTITY_LIMIT_EXCEEDED` -> `BLOCK`).
7. **Explicitly Blocked SKU Check:** Blocked SKUs always win (`SKU_BLOCKED` -> `BLOCK`).
8. **Allowed SKU Whitelist Check:** If an allowlist is configured, all SKUs must be present in the whitelist (`SKU_NOT_ALLOWED` -> `BLOCK`).
9. **Product Category Whitelist Check:** All item product categories must be present in `allowed_categories` (`CATEGORY_NOT_ALLOWED` -> `BLOCK`).
10. **Maximum Transaction Amount Check:** `quote.total` (in integer paise) must not exceed `max_transaction_amount` (`AMOUNT_EXCEEDS_LIMIT` -> `BLOCK`).
11. **Confirmation Threshold Check:** If `quote.total >= confirmation_threshold`, returns `REQUIRE_CONFIRMATION` instead of `ALLOW`.
12. **All Checks Passed:** Returns `ALLOW`.

### Fail-Closed Behavior
If any check fails, or if an unexpected exception occurs, the policy engine immediately returns a `BLOCK` decision. The engine **never fails open**.

---

## 3. Decision Model & Audit Trail Structure

Every evaluation produces a structured `PolicyDecision` payload containing:
- `decision`: `"ALLOW" | "BLOCK" | "REQUIRE_CONFIRMATION"`
- `policy_id` & `policy_version`
- `quote_id`, `merchant_id`, `transaction_amount_paise`, `currency`
- `reasons`: Array of violated policy rules with machine-readable codes and details
- `checks`: Exhaustive list of all individual checks performed with their pass/fail status
- `evaluated_at`: ISO timestamp
- `evaluation_version`: `"1.0.0"`

---

## 4. API Endpoints (Phase 1, 2, & 3)

| Endpoint | Method | Purpose | Implementation Status |
|---|---|---|---|
| `/health` | `GET` | Health check probe (`{"status": "ok"}`) | ✅ **Phase 1** |
| `/.well-known/agent-catalog.json` | `GET` | Machine-readable merchant capability manifest | ✅ **Phase 2** |
| `/agent/catalog` | `GET` | Filtered, searchable deterministic product catalog | ✅ **Phase 2** |
| `/agent/products/{sku}` | `GET` | Authoritative single SKU lookup | ✅ **Phase 2** |
| `/agent/cart/quote` | `POST` | Authoritative quote creation & cryptographic HMAC signing | ✅ **Phase 2** |
| `/agent/cart/validate` | `POST` | Real-time quote validation & inventory re-verification | ✅ **Phase 2** |
| `/agent/policy/evaluate` | `POST` | Deterministic policy evaluation of authoritative quotes | ✅ **Phase 3** |
| `/agent/policy/{policy_id}` | `GET` | Read active policy configuration | ✅ **Phase 3** |
| `/agent/checkout` | `POST` | Razorpay order creation (only after ALLOW) | ⏳ *Phase 4 Deferred* |
| `/webhooks/razorpay` | `POST` | Idempotent payment webhook event processor | ⏳ *Phase 4 Deferred* |
| `/ledger/events` | `GET` | Immutable audit trail query API | ⏳ *Phase 4 Deferred* |
