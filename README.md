# AgentPay Gateway 💳🤖

> **AI-Native Commerce Gateway & Deterministic Policy Gated Checkout**  
> *Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)*

---

## 🎯 Core Thesis

AgentPay Gateway makes a merchant fully transactable by an AI buyer end-to-end. While the AI buyer can propose actions (discovery, cart creation, quoting), it **never directly authorizes or executes financial transactions**. All money actions are explainable, bounded, gated, cryptographically signed, and recorded to an immutable audit ledger.

```text
AI Buyer (LLM)
      ↓ (Propose Action)
Merchant Catalog & Quote
      ↓ (Authoritative Server Pricing)
Deterministic Policy Gate (Spending Limit, Whitelists, Velocity)
      ↓ (Cart HMAC Integrity Verification)
Deterministic Authorization Engine
      ↓
Razorpay Test Mode (Orders API)
      ↓
Webhook-Driven State Machine
      ↓
Immutable Audit Ledger & Inspector UI
```

---

## 🏛️ Repository Structure

```text
agentpay-gateway/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI Entrypoint & lifespan
│   │   ├── api/                # API Endpoints (catalog, cart, checkout, webhooks, health)
│   │   ├── agent/              # LangGraph state machine, tools, prompts
│   │   ├── guards/             # Deterministic policies, cart HMAC, spending gates
│   │   ├── razorpay/           # Isolated Razorpay client & webhook handlers
│   │   ├── ledger/             # Immutable audit events & transaction history
│   │   ├── db/                 # SQLAlchemy 2.0 Base, Session & Models
│   │   └── core/               # Configuration & Security utilities
│   └── tests/                  # Pytest suite
├── frontend/                   # Next.js 15 App Router & Tailwind CSS UI
├── evaluation/                 # Track 01 evaluation criteria test harnesses & benchmarks
├── data/                       # Seed merchant catalogs, fixtures, and schemas
├── docs/                       # Architecture diagrams & specifications
├── docker-compose.yml          # PostgreSQL service definition
├── .env.example                # Environment variables template
└── README.md
```

---

## 🚀 Quick Start (Phase 1)

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Docker (Optional, for PostgreSQL)

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env
```

Run tests:
```bash
pytest -v
```

Run FastAPI Backend:
```bash
uvicorn app.main:app --reload --port 8000
```
Health Check: `http://127.0.0.1:8000/health`  
API Docs: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` to inspect the UI.

---

## 🛡️ Track 01 Compliance Checklist
1. **Explainable:** Audit ledger captures exact intent, quote payload, and policy evaluation results.
2. **Bounded:** Hard constraints on per-transaction and velocity limits in deterministic code.
3. **Gated:** Policy engine intercepts any order before contacting payment gateway.
4. **Audit Trail:** Append-only transaction event ledger.
5. **Graceful Failure Handling:** Tested rejection branches on cart tampering, limit exceedance, and payment webhook failures.
