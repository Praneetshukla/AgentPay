# AgentPay Gateway Architecture Specification

> **Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)**  
> **Core Architectural Axiom:** *"The AI proposes; deterministic systems authorize; Razorpay executes."*

---

## 1. System Topology & Action Boundaries (Phase 8 Production Hardened)

```text
┌─────────────────────────────────────────────────────────────┐
│                 AUTONOMOUS AI BUYER (LangGraph)             │
│ - Natural language purchase intent parsing                  │
│ - Agent-readable catalog discovery & SKU inspection         │
│ - Deterministic candidate ranking & suitability scoring     │
│ - Cart proposal formulation & multi-strategy recovery       │
│ - Requests authoritative quote (POST /agent/cart/quote)     │
│ - ZERO direct access to Razorpay API or payment credentials │
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
│                 DETERMINISTIC POLICY GATE                   │
│ - Evaluates server-authoritative Quote vs. Policy Rules     │
│ - Zero natural language / LLM overrides permitted           │
│ - Fail-Closed: any error or missing entity -> BLOCK         │
│ - Outputs: ALLOW | BLOCK | REQUIRE_CONFIRMATION             │
└──────────────────────────────┬──────────────────────────────┘
                               │ ALLOW (or human /agent/confirm)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│   FINANCIAL EXECUTION BOUNDARY & CONCURRENCY LAYER          │
│ - POST /agent/checkout/execute (Only quote_id accepted)     │
│ - Atomic DB Stock Deduction: UPDATE ... WHERE stock >= qty  │
│ - Creates Transaction record in CREATED status              │
│ - Creates Razorpay Test Mode Order via Orders API           │
│ - Transitions status to PAYMENT_PENDING                     │
└──────────────────────────────┬──────────────────────────────┘
                               │ Webhook (payment.captured)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│          IDEMPOTENT WEBHOOK & STATE MACHINE                 │
│ - POST /webhooks/razorpay                                   │
│ - Verifies HMAC-SHA256 Razorpay Webhook Signature           │
│ - Validates amount, currency & legal state transition       │
│ - Idempotently updates Transaction status to PAID           │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│         IMMUTABLE TAMPER-EVIDENT AUDIT LEDGER               │
│ - Append-only cryptographic SHA-256 hash-chained trail      │
│ - GET /ledger/events & GET /ledger/verify-chain             │
│ - Detects payload tampering, deletion, or reordering        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Concurrency & Race Condition Strategy

In high-concurrency commerce environments (multiple agents competing for limited stock), optimistic reads in agent memory cannot be trusted. 

**Database-Level Atomic Execution:**
```python
# Atomically decrement stock only if sufficient inventory exists
row_updated = db.query(Product).filter(
    Product.sku == item.sku,
    Product.stock_quantity >= item.quantity,
    Product.active == True
).update({
    Product.stock_quantity: Product.stock_quantity - item.quantity,
    Product.version: Product.version + 1
})

if row_updated == 0:
    db.rollback()
    # Transaction safely fails closed with INSUFFICIENT_STOCK
```
- **Guaranteed Invariant:** `available_stock >= 0` and `successful_purchases <= available_inventory`.

---

## 3. Merchant Revenue Intelligence (`MerchantGrowthEngine`)

- Identifies complementary high-synergy products (e.g. keyboard + USB hub).
- Fits strictly within remaining budget headroom: `Headroom = min(buyer_budget, policy_limit) - current_total`.
- **Advisory Only:** Cannot alter user budget, modify authoritative prices, or force checkout without policy approval.

---

## 4. Evaluation Benchmark (Phase 8 Production Suite)

- **Total Scenarios:** 159+ automated tests (`63 core regression` + `96 adversarial`).
- **Critical Metric:** `UNAUTHORIZED_MONEY_ACTIONS = 0`.
- **Machine-Readable Report:** Generated to `evaluation/benchmark_report.json`.
