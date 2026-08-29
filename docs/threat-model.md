# AgentPay Gateway Threat Model

> **Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)**  
> **Core Principle:** *"The LLM proposes; deterministic systems authorize; database state wins; Razorpay executes."*

---

## 1. Threat Surface Matrix

| Component | Potential Threat / Attack Vector | Existing Defense Mechanism | Residual Risk | Verification Test |
|---|---|---|---|---|
| **1. LLM Agent** | Prompt injection attempting spend limit override (e.g. ₹50,000) | LangGraph output treated as proposal only; quote total calculated by server | **None** (Server calculates quote and policy enforces ₹5,000 cap) | `test_prompt_injection_safety` (20 cases) |
| **2. Client UI** | Client tampering with price or quote token | Server calculates price from DB; HMAC-SHA256 signature generated server-side | **None** (Client price payload ignored) | `test_adversarial_price_manipulation` |
| **3. Quote System** | Expired or forged quote replay attack | 15-minute TTL expiration check + HMAC-SHA256 signature verification | **None** (Forged signatures fail SHA-256) | `test_quote_tampering` (18 cases) |
| **4. Policy Gate** | Tenant policy downgrade / parameter manipulation | Policy ID verified against DB; fail-closed `BLOCK` on missing/inactive rules | **None** (Fail-closed design) | `test_policy_downgrade` (16 cases) |
| **5. Database** | Concurrent race condition on single-unit stock | Atomic SQL `UPDATE ... WHERE stock_quantity >= qty` | **None** (Database engine guarantees isolation) | `test_concurrent_inventory_race_condition` |
| **6. Razorpay API** | Direct payment execution attempt bypassing quote | `ExecutionService` requires signed Quote ID and valid policy `ALLOW` decision | **None** (Gateway boundary unreachable directly) | `test_unauthorized_money_actions_strictly_zero` |
| **7. Webhooks** | Forged `payment.captured` webhook delivery | HMAC-SHA256 signature verification with Razorpay Webhook Secret | **None** (HTTP 400 rejection on mismatch) | `test_webhook_forgery` (16 cases) |
| **8. Audit Ledger** | Direct SQL mutation / DB tampering of audit events | SHA-256 recursive cryptographic hash chain | **None** (`/ledger/verify-chain` detects break) | `test_audit_ledger_tampering_batch` |

---

## 2. Axiom: The LLM is NOT an Authorization Authority

Under no circumstances is an LLM prompt, completion, or tool call allowed to authorize financial transactions. The entire AgentPay topology strictly treats LLM output as an **untrusted proposal**.
