# 💳🤖 AgentPay Gateway

> **Autonomous Commerce Engine with Bounded Autonomy, Deterministic Policy Guardrails, Cryptographic Audit Ledger & Real-Time Payment Events**  
> *Track 01: AI Growth & Agentic Commerce — Razorpay Buildathon*

---

## 🎯 Project Overview & Objective

**AgentPay** bridges autonomous AI agents and enterprise financial safety. It enables AI buyers to discover, compare, and procure goods through machine-readable commerce protocols while strictly enforcing server-side mathematical safety boundaries.

### 🛡️ Fundamental Invariant
$$\mathbf{UNAUTHORIZED\_MONEY\_ACTIONS = 0}$$

> **"The AI proposes; deterministic systems authorize; Razorpay executes."**

The LLM is treated as an untrusted reasoning engine for intent parsing and cart planning. It **never** receives Razorpay API credentials, cannot dictate prices or totals, and cannot directly execute or approve payments. Every transaction satisfies 5 core pillars:
1. **Server-Authoritative:** All prices, stock, and totals are computed and signed with HMAC-SHA256 by the backend.
2. **Deterministic Policy Gate:** A 10-point fail-closed policy engine intercepts every order before contacting Razorpay.
3. **Cryptographic Merkle Audit Ledger:** Append-only SHA-256 hash-chained ledger (`Block #ID` $\rightarrow$ `previous_event_hash` $\rightarrow$ `event_hash`) with live tamper-detection.
4. **Real-Time Event Broadcast:** Live Server-Sent Events (SSE) stream payment capture notifications with Web Audio chimes and deduplication.
5. **Bounded Offer Comparison:** Deterministic provider-offer evaluation without fake merchants, fabricated discounts, or synthetic latency.

---

## 🏛️ System Architecture

```
USER DELEGATES AUTHORITY (PIN 1234 Gate)
        ↓
AGENT EXTRACTS INTENT & BUDGET BOUNDARIES (LangGraph)
        ↓
AUTHENTIC CATALOG DISCOVERY (SQLite / Postgres)
        ↓
DETERMINISTIC OFFER COMPARISON (MerchantOfferEngine)
        ↓
SERVER-AUTHORITATIVE HMAC-SHA256 QUOTE (QuoteService)
        ↓
DETERMINISTIC POLICY GUARDIAN (DeterministicPolicyEngine)
        ↓
HUMAN AUTHORIZATION WHEN REQUIRED (TransactionGuardianModal)
        ↓
RAZORPAY TEST MODE EXECUTION (ExecutionService)
        ↓
AUTHENTICATED WEBHOOK & SSE BROADCAST (EventBroker)
        ↓
LIVE UI NOTIFICATION TOAST (PaymentNotificationToast + Web Audio)
        ↓
CRYPTOGRAPHIC AUDIT LEDGER (SHA-256 Merkle Chain Verification)
```

---

## 📂 Repository Structure

```text
AgentPay/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI Entrypoint & Lifespan
│   │   ├── api/               # REST Endpoints (agent, catalog, policy, checkout, ledger, analytics, demo, events)
│   │   ├── agent/             # LangGraph State Machine, Nodes, Tools, Offer Negotiator
│   │   ├── guards/            # 10-point Deterministic Policy Engine
│   │   ├── razorpay/          # Razorpay Test Mode Client, Execution Service, Webhooks
│   │   ├── ledger/            # Cryptographic SHA-256 Merkle Audit Ledger
│   │   ├── db/                # SQLAlchemy 2.0 Base, Session & Models
│   │   └── core/              # Configuration, HMAC Signatures, Event Broker
│   └── tests/                 # Full Pytest Test Suite (All tests passing)
├── frontend/                  # Next.js 15 App Router & Tailwind CSS UI
│   ├── src/
│   │   ├── app/               # Page routes & dashboard layout
│   │   ├── features/          # Feature modules (agent, storefront, policy, ledger, trust, merchant, notifications)
│   │   ├── lib/               # API Client, Mission Context & SSE Listener
│   │   └── types/             # TypeScript type definitions
├── docs/                      # Technical reports & architecture diagrams
├── docker-compose.yml         # Containerized services
└── README.md
```

---

## 🚀 Quickstart & Live Demo Instructions

### 1. Prerequisites
- **Python:** 3.12+
- **Node.js:** 18+ (Node 20+ recommended)

---

### 2. Launch Backend (FastAPI)

```powershell
cd backend
# Activate virtual environment
.venv\Scripts\Activate.ps1
# Run full test suite
python -m pytest -q
# Start FastAPI backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```
- **API Health Check:** `http://127.0.0.1:8000/health`
- **Interactive OpenAPI Docs:** `http://127.0.0.1:8000/docs`
- **Agent Discovery Manifest:** `http://127.0.0.1:8000/.well-known/agent-catalog.json`

---

### 3. Launch Frontend (Next.js 15)

```powershell
cd frontend
# Build production bundle
npm run build
# Start production server
npm run start
```
Open **`http://localhost:3000`** in your browser.

---

## 🔑 Demo Credentials & Showcase Scenarios

| Attribute | Value |
| :--- | :--- |
| **Demo Identity** | `demo_buyer_01` |
| **Master Passcode (Human PIN Gate)** | `1234` |
| **Active Policy Profile** | `policy_demo` (Max item: ₹15,000 \| Daily budget: ₹50,000 \| Auto-approve: ₹5,000) |

### 🎬 High-Impact Demo Walkthrough Scenarios:
1. **Under-Budget Autonomous Procurement:**
   - Prompt: *"I need a wireless mouse under ₹2,000"*
   - Flow: Discovery $\rightarrow$ Offer Comparison $\rightarrow$ HMAC Quote (₹1,299) $\rightarrow$ `ALLOW` $\rightarrow$ Razorpay Order Created $\rightarrow$ Instant Webhook Toast Notification $\rightarrow$ Merkle Block Link.
2. **High-Value Human Approval Step-Up:**
   - Prompt: *"I need a 4K webcam"*
   - Flow: Quote ₹3,499 exceeds threshold $\rightarrow$ `REQUIRE_CONFIRMATION` $\rightarrow$ Transaction Guardian opens $\rightarrow$ Human approves with PIN $\rightarrow$ Order executed.
3. **Over-Budget Autonomous Recovery:**
   - Prompt: *"Build me a workstation with keyboard, mouse, and hub under ₹5,000"*
   - Flow: Initial proposed cart exceeds ₹5,000 $\rightarrow$ `BLOCK` $\rightarrow$ Autonomous self-healing loop drops lowest priority item $\rightarrow$ Re-quotes $\rightarrow$ `ALLOW`.
4. **Real Hostile Attack Lab:**
   - Navigate to **Trust Center** tab.
   - Run live adversarial attacks (Quote Tampering, Prompt Injections, Ledger Tampering) to witness deterministic defense and live integrity re-computation.
