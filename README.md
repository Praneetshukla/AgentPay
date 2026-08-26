# AgentPay Gateway 💳🤖

> **AI-Native Agentic Commerce Gateway with Deterministic Financial Policy Gating**  
> *Razorpay Buildathon — Track 01 (AI Growth & Agentic Commerce)*

---

## 🎯 Project Overview & Objective

**AgentPay Gateway** makes merchants fully transactable by autonomous AI buyer agents end-to-end through machine-readable commerce interfaces. 

### Core Architectural Principle
> **"LLM proposes; deterministic systems authorize."**

The LLM is an untrusted reasoning engine for discovery and cart proposal. It **never** receives Razorpay API credentials and cannot directly execute or approve payments. Every money action must satisfy Track 01 requirements:
1. **Explainable:** Exact quote payload, buyer intent, and policy evaluations are logged.
2. **Bounded:** Hard constraints on per-transaction and velocity limits enforced in deterministic code.
3. **Gated:** Policy engine intercepts any order before contacting the payment gateway.
4. **Auditable:** Append-only transaction event ledger.
5. **Graceful Failures:** Tested failure branches for cart tampering, budget limit violations, and webhook anomalies.

---

## 📐 Current Scope (Phase 1: Foundation)

Phase 1 establishes the production-grade foundation for the application:
- Modular FastAPI backend scaffold with Pydantic v2 and SQLAlchemy 2.x
- Centralized configuration and environment management (`.env`, `.env.example`)
- Health check API (`GET /health`) returning status, version, and environment
- Initial automated test harness using `pytest` and `httpx`
- Next.js 15 App Router frontend with TypeScript and Tailwind CSS
- Docker Compose definition for local PostgreSQL development

*Note: AI buyer workflows, Razorpay payment execution, policy gate rules, and catalog business logic are intentionally deferred to subsequent phases.*

---

## 📂 Repository Structure

```text
agentpay-gateway/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI Entrypoint & lifespan
│   │   ├── api/                # API Endpoints (health, and future catalog/checkout routes)
│   │   ├── agent/              # [Phase 2] LangGraph state machine, tools, prompts
│   │   ├── guards/             # [Phase 2] Deterministic spending policies, cart HMAC verification
│   │   ├── razorpay/           # [Phase 2] Isolated Razorpay client & webhook handlers
│   │   ├── ledger/             # [Phase 2] Immutable audit events & transaction history
│   │   ├── db/                 # SQLAlchemy 2.0 Base, Session & Models
│   │   └── core/               # Configuration (Pydantic v2) & Security utilities
│   └── tests/                  # Pytest test suite
├── frontend/                   # Next.js 15 App Router & Tailwind CSS UI
├── evaluation/                 # Track 01 evaluation criteria test harnesses & benchmarks
├── data/                       # Seed merchant catalogs, fixtures, and schemas
├── docs/                       # Architecture diagrams & specifications (docs/architecture.md)
├── docker-compose.yml          # Local PostgreSQL container service
├── .env.example                # Global environment variables template
└── README.md
```

---

## ⚙️ Setup & Development Guide

### Prerequisites
- **Python:** 3.12+
- **Node.js:** 18+ (Node 20+ recommended)
- **Docker:** Optional (for PostgreSQL)

---

### 1. PostgreSQL Setup (Docker)

Start the local PostgreSQL container:
```bash
docker-compose up -d postgres
```
Database URL: `postgresql+psycopg://agentpay:agentpay_secret@localhost:5432/agentpay_db`

---

### 2. Backend Setup & Commands

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
```

#### Run Backend Tests
```bash
python -m pytest -v
```

#### Run FastAPI Dev Server
```bash
python -m uvicorn app.main:app --reload --port 8000
```
- **Health Check:** `http://127.0.0.1:8000/health` (`{"status": "ok", "version": "0.1.0", "environment": "development"}`)
- **Interactive OpenAPI Docs:** `http://127.0.0.1:8000/docs`

---

### 3. Frontend Setup & Commands

```bash
cd frontend

# Install dependencies
npm install

# Run Development Server
npm run dev
```
Open `http://localhost:3000` to access the frontend landing interface.

#### Build for Production
```bash
npm run build
```

---

## 🔐 Environment Variables (`.env.example`)

| Variable | Description | Default / Example |
|---|---|---|
| `ENVIRONMENT` | Application stage | `development` |
| `BACKEND_PORT` | Backend port | `8000` |
| `BACKEND_CORS_ORIGINS` | Permitted origins | `http://localhost:3000,http://127.0.0.1:3000` |
| `SECRET_KEY` | Application secret | `<secure_random_key>` |
| `CART_HMAC_SECRET` | Secret for cart integrity hashing | `<secure_hmac_secret>` |
| `DATABASE_URL` | Database connection string | `sqlite:///./agentpay.db` (or PostgreSQL) |
| `RAZORPAY_KEY_ID` | Razorpay Test Key ID | `rzp_test_placeholder_key_id` |
| `RAZORPAY_KEY_SECRET` | Razorpay Test Key Secret | `placeholder_secret_key` |
| `RAZORPAY_WEBHOOK_SECRET` | Razorpay Webhook Secret | `placeholder_webhook_secret` |
