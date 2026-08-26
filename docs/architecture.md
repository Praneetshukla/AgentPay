# AgentPay Gateway Architecture Specification

> **Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)**  
> **Core Architectural Axiom:** *"LLM proposes; deterministic systems authorize."*

---

## 1. Core Architectural Axiom

The central security tenet of **AgentPay Gateway** is that an LLM / AI buyer agent may reason, discover products, negotiate, and **propose** actions, but it **NEVER directly authorizes or executes financial transactions**.

```text
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

---

## 2. Component Breakdown & Implementation Status

| Component | Responsibility | Status |
|---|---|---|
| **Core & Settings (`backend/app/core/`)** | Centralized configuration, environment validation via Pydantic v2 Settings, and cryptographic signature primitives. | ✅ **Phase 1 Implemented** |
| **Database Session & Base (`backend/app/db/`)** | SQLAlchemy 2.0 connection engine, session factory, declarative base, and PostgreSQL/SQLite support. | ✅ **Phase 1 Implemented** |
| **Health API (`backend/app/api/`)** | Base routing, `/health` and `/` endpoints for orchestration probes and status checks. | ✅ **Phase 1 Implemented** |
| **Frontend Foundation (`frontend/`)** | Next.js 15 App Router, TypeScript, Tailwind CSS with modular component architecture. | ✅ **Phase 1 Implemented** |
| **Agent State Machine (`backend/app/agent/`)** | LangGraph agent loop, tool bindings, context memory, and action proposal generation. | ⏳ *Phase 2 Deferred* |
| **Deterministic Guards (`backend/app/guards/`)** | Server-side spending limits, whitelist checks, velocity throttles, and HMAC cart validation. | ⏳ *Phase 2 Deferred* |
| **Razorpay Gateway Client (`backend/app/razorpay/`)** | Isolated Razorpay Orders API client, payment signature verification, and idempotent webhook processors. | ⏳ *Phase 2 Deferred* |
| **Audit Ledger (`backend/app/ledger/`)** | Immutable, append-only event trail of all proposals, decisions, gates, and payment confirmations. | ⏳ *Phase 2 Deferred* |
| **Evaluation Harness (`evaluation/`)** | Automated stress tests for policy gating, cart tampering, and payment failure scenarios. | ⏳ *Phase 2 Deferred* |

---

## 3. Financial Action Pipeline (Future Phases)

1. **Discovery & Quoting:** AI Buyer interacts with machine-readable catalog endpoints. The server generates an authoritative quote and signs it with a cryptographic SHA-256 HMAC.
2. **Policy Evaluation:** Before any order is placed, the proposed purchase passes through a deterministic Python policy engine (verifying budget bounds, SKU whitelists, merchant status, and velocity limits).
3. **Cart Integrity Verification:** The server re-calculates the HMAC of the cart items and prices. If client/LLM tampered with line-item prices or totals, authorization fails immediately.
4. **Order Execution:** Only server-side authorized orders invoke the Razorpay Orders API in Test Mode. The LLM never sees or touches API credentials.
5. **Webhook State Machine & Ledger:** Razorpay webhooks trigger state updates idempotently. All events are recorded in an append-only audit ledger.
