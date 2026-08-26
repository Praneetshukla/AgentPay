# AgentPay Gateway Architecture Specification

## Financial Action Isolation

The system separates intelligence (LLM) from authorization (Deterministic Guard):

```
┌─────────────────┐       Propose Action        ┌───────────────────────┐
│  AI Buyer (LLM) │ ──────────────────────────> │ Catalog / Quote Engine│
└─────────────────┘                             └──────────┬────────────┘
                                                           │ Cart & Quote (HMAC Signed)
                                                           ▼
                                                ┌───────────────────────┐
                                                │ Deterministic Policy  │
                                                │ Gate (Spending/SKU)   │
                                                └──────────┬────────────┘
                                                           │ Validated
                                                           ▼
                                                ┌───────────────────────┐
                                                │ Razorpay Test Mode API│
                                                └──────────┬────────────┘
                                                           │ Webhook Event
                                                           ▼
                                                ┌───────────────────────┐
                                                │ Immutable Audit Ledger│
                                                └───────────────────────┘
```
