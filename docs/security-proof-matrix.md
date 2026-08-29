# AgentPay Security Invariant Proof Matrix

> **Razorpay Buildathon — Track 01 (AI Growth & Agentic Commerce)**  
> **Axiom:** *"The LLM proposes; deterministic policies authorize; database state wins; Razorpay executes; the ledger proves."*

---

| Invariant ID | Formal Invariant Principle | Implementation Layer | Attack Vectors Tested | Automated Pytest Target | Observed Result | Failure Behavior |
|---|---|---|---|---|---|---|
| **I1** | **LLM Cannot Directly Authorize Money** | `app.agent.buyer`, `app.guards.policy_engine` | 25 Prompt Injections & Jailbreaks (PI-01 to PI-25) | `test_red_team_200.py::test_red_team_prompt_injection` | `UNAUTHORIZED_MONEY_ACTIONS = 0` | LLM returns proposal; policy gate clamps spend limit |
| **I2** | **Client Cannot Modify Authoritative Amount** | `app.razorpay.service.ExecutionService` | 25 Financial Boundary & Integer Overflows (FIN-01 to FIN-25) | `test_red_team_200.py::test_red_team_financial_manipulation` | Amounts loaded strictly from database Quote | Invalid price fails policy gate to `BLOCK` |
| **I3** | **Policy BLOCK Means Gateway Never Reached** | `app.guards.policy_engine`, `app.razorpay.service` | Spend cap override, restricted category mutation | `test_policy.py`, `test_red_team_200.py::test_red_team_policy_downgrades` | Razorpay Orders API call count = 0 | Transaction rejected with audit log |
| **I4** | **Confirmation Re-evaluates Live State** | `app.api.checkout.confirm_transaction` | Price hike and stock depletion during confirmation | `test_execution_and_ledger.py` | Stale quotes rejected at confirmation | Returns HTTP 400 with stale price notice |
| **I5** | **Inventory Cannot Overdraw (Negative Stock)** | `app.razorpay.service` (Atomic SQL update) | 25 Inventory Overdraws (INV-01 to INV-25) | `test_red_team_200.py::test_red_team_inventory_overdraw` | Stock remains $\ge 0$ | Quote creation fails with HTTP 400 |
| **I6** | **Duplicate Checkouts Cannot Double-Spend** | `app.razorpay.service` (Durable Idempotency) | 20 Concurrent duplicate requests for same quote | `test_red_team_200.py::test_red_team_concurrent_race_and_replays` | Returns existing transaction ID | No duplicate Razorpay order created |
| **I7** | **Forged Webhook Cannot Mutate Payment State** | `app.razorpay.webhooks.RazorpayWebhookProcessor` | 25 Webhook Signature Forgeries (WH-01 to WH-25) | `test_red_team_200.py::test_red_team_webhook_attacks` | All forged signatures rejected | Returns HTTP 400 with invalid signature error |
| **I8** | **Ledger Tampering is Cryptographically Detectable** | `app.ledger.service.AuditLedgerService` | Simulated database payload alteration | `test_red_team_200.py::test_red_team_audit_tamper_detection` | Tampering flagged at exact modified event ID | `GET /ledger/verify-chain` returns `valid: false` |
| **I9** | **Illegal State Transitions are Rejected** | `app.core.state_machine.FormalStateMachine` | Jump from `CREATED` directly to `PAID` | `test_execution_and_ledger.py` | State machine raises `InvalidStateTransitionError` | Transaction status remains unchanged |
| **I10** | **`UNAUTHORIZED_MONEY_ACTIONS = 0`** | End-to-End System Boundary | All 227 Red-Team scenarios + 201 regression tests | `test_red_team_200.py`, `test_adversarial_100.py` | Exactly 0 unauthorized money actions | Hard fail-closed on any authorization exception |
