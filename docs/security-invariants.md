# AgentPay Gateway Security Invariants Specification

> **Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)**  
> **Core Principle:** *"The LLM proposes; deterministic systems authorize; database state wins; Razorpay executes."*

---

## 🔒 10 Formal Security Invariants

### Invariant 1 (I1): LLM Cannot Authorize Money
- **Rule:** No natural language completion or tool call directly triggers funds movement.
- **Enforcement:** LangGraph creates a proposal; prices are strictly calculated by the server database.

### Invariant 2 (I2): Client Cannot Supply Authoritative Financial Amount
- **Rule:** Payment amounts are never accepted from the caller or frontend.
- **Enforcement:** `ExecutionService` reads integer paise exclusively from the database-backed signed Quote.

### Invariant 3 (I3): Policy BLOCK Means Razorpay is Never Called
- **Rule:** Any policy violation immediately halts execution.
- **Enforcement:** `ExecutionService` checks `decision == ALLOW` before contacting Razorpay Orders API.

### Invariant 4 (I4): Confirmation is Independently Revalidated
- **Rule:** User-confirmed orders cannot execute with stale prices or expired stock.
- **Enforcement:** `POST /agent/confirm` re-verifies quote signature, item versions, and live inventory.

### Invariant 5 (I5): Inventory Cannot Become Negative
- **Rule:** Two concurrent buyers cannot purchase the same single unit in stock.
- **Enforcement:** Atomic SQL conditional update `UPDATE products SET stock_quantity = stock_quantity - qty WHERE stock_quantity >= qty`.

### Invariant 6 (I6): Duplicate Checkout Cannot Create Duplicate Logical Payment
- **Rule:** Replay checkout requests return the existing transaction idempotently.
- **Enforcement:** Transaction lookup by `quote_id` returns existing transaction record without duplicate order creation.

### Invariant 7 (I7): Forged Webhooks Cannot Mutate State
- **Rule:** Payment webhooks with forged or missing signatures fail closed.
- **Enforcement:** HMAC-SHA256 signature verification rejects fraudulent payloads with HTTP 400.

### Invariant 8 (I8): Ledger Tampering is Cryptographically Detectable
- **Rule:** Database payload mutation breaks the audit chain.
- **Enforcement:** Append-only SHA-256 recursive hash chaining verified by `GET /ledger/verify-chain`.

### Invariant 9 (I9): Illegal State Transitions are Rejected
- **Rule:** Transactions must follow formal state machine lifecycle.
- **Enforcement:** `FormalStateMachine.validate_transaction_transition` enforces valid transitions only.

### Invariant 10 (I10): `UNAUTHORIZED_MONEY_ACTIONS = 0`
- **Rule:** Zero unauthorized money transactions across 200+ adversarial attack vectors.
- **Enforcement:** Verified across the full Red-Team benchmark suite.
