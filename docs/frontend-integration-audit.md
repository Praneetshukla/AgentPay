# Frontend Integration Audit — AgentPay

**Date:** 2026-08-30  
**Phase:** Phase 14 Product Integration & Real Functionality  
**Invariant:** `UNAUTHORIZED_MONEY_ACTIONS = 0`

---

## 1. Executive Summary

This audit maps every screen of the **10-screen Stitch UI design** to the active **FastAPI backend endpoints**, identifying live API connections, state dependencies, and required wiring to ensure zero mock data, unified commerce state, and complete browser end-to-end execution.

---

## 2. Screen & Endpoint Mapping Matrix

| # | Screen Name | User Action | Frontend Component | Backend API Endpoint | Backend Response | UI State Change |
|---|---|---|---|---|---|---|
| **1** | **Mission Control** | Submit purchase goal (e.g. "Mechanical keyboard & mouse < ₹4,000") | [`AgentBuyerConsole.tsx`](file:///d:/Projects/AI/frontend/src/features/agent/AgentBuyerConsole.tsx) | `POST /agent/buy` | `{run_id, status, selected_items, quote, trace_steps, ranked_candidates, recovery_history}` | Populates active mission state, updates cart with selected items, transitions view to **Agent Plan & Execution**. |
| **2** | **Delegation Contract** | Review spending cap, category whitelist, quantity constraints & authorize | [`DelegationContractView.tsx`](file:///d:/Projects/AI/frontend/src/features/agent/DelegationContractView.tsx) | `GET /agent/policy/policy_demo` | `{id, max_transaction_amount, confirmation_threshold, allowed_categories, max_cart_items}` | Reads server-authoritative policy boundaries. On click "Authorize", launches `POST /agent/buy`. |
| **3** | **Agent Plan & Execution** | View live LangGraph node progression, selected items, and candidate comparison | [`ActiveMissionView.tsx`](file:///d:/Projects/AI/frontend/src/features/agent/ActiveMissionView.tsx) | Populated from `POST /agent/buy` trace / quote | `{trace_steps, ranked_candidates, quote, explanation}` | Displays live step checkmarks, authoritative quote total, and Decision Evidence (Selected vs Rejected items). |
| **4** | **Autonomous Recovery** | Review item substitution when stock is 0 or price shifted | [`AutonomousRecoveryView.tsx`](file:///d:/Projects/AI/frontend/src/features/agent/AutonomousRecoveryView.tsx) | Populated from `recovery_history` in `POST /agent/buy` | `[{strategy, reason, before_total_paise, after_total_paise, affected_skus}]` | Displays Before/After card, price diff, remaining headroom, and CTA to proceed to Transaction Guardian. |
| **5** | **Transaction Guardian** | Pre-payment deterministic safety review & signature verification | [`TransactionGuardianModal.tsx`](file:///d:/Projects/AI/frontend/src/features/checkout/TransactionGuardianModal.tsx) | `POST /agent/cart/quote` & `POST /agent/policy/evaluate` | `{quote_id, signature, total}` & `{decision: ALLOW/REQUIRE_CONFIRMATION/BLOCK, checks: [...]}` | Validates server quote and deterministic policy checks. If `ALLOW` or `REQUIRE_CONFIRMATION`, displays execution CTA. |
| **6** | **Verified Result** | Successful execution receipt & cryptographic proof | [`MissionCompletedReceipt.tsx`](file:///d:/Projects/AI/frontend/src/features/checkout/MissionCompletedReceipt.tsx) | `POST /agent/checkout/execute` or `POST /agent/confirm` & `GET /ledger/verify-chain` | `{status, transaction_id, razorpay_order_id, amount}` & `{valid: true, total_events: N}` | Shows green success banner, Razorpay Order ID, Transaction ID, and verified SHA-256 ledger proof. |
| **7** | **Catalog & Discovery** | Browse real hardware inventory, filter categories, search | [`Storefront.tsx`](file:///d:/Projects/AI/frontend/src/features/storefront/Storefront.tsx) | `GET /agent/catalog` | `[{sku, name, description, category, price, stock_quantity, active}]` | Renders product grid with live stock counts, integer prices in Rupees, and interactive cart drawer. |
| **8** | **Product Intelligence Detail** | Inspect specific product specs, security tier, and mission fit | [`ProductIntelligenceDetail.tsx`](file:///d:/Projects/AI/frontend/src/features/storefront/ProductIntelligenceDetail.tsx) | `GET /agent/products/{sku}` | `{sku, name, description, price, stock_quantity, attributes}` | Renders hardware specs (ISO-27001, HMAC, Stock) and budget headroom impact bar. |
| **9** | **Spending & Policy Center** | Inspect spending budget, confirmation limit, and category restrictions | [`SpendingPolicyView.tsx`](file:///d:/Projects/AI/frontend/src/features/policy/SpendingPolicyView.tsx) | `GET /agent/policy/{policy_id}` & `GET /analytics/revenue` | `{max_transaction_amount, confirmation_threshold, allowed_categories}` | Renders policy cards (`₹5,000` max spend, `₹3,000` confirmation threshold) and behavioral simulation table. |
| **10** | **Mission History & Ledger** | View past completed missions and verifiable ledger audits | [`MissionHistoryLedger.tsx`](file:///d:/Projects/AI/frontend/src/features/ledger/MissionHistoryLedger.tsx) | `GET /ledger/events?limit=50` & `GET /agent/runs` | `[{event_type, payload, signature, previous_hash, timestamp}]` | Renders searchable historical execution list with audit codes, statuses (`COMPLETED`, `RECOVERED`), and totals. |

---

## 3. Disconnected State & Gap Analysis

1. **State Isolation:** Currently, individual components held local state copies of cart and active quote. A centralized `MissionContext` is required to ensure that `Mission Control`, `Catalog`, `Delegation Contract`, `Agent Plan`, `Guardian`, and `Receipt` share 1 authoritative quote and cart.
2. **Dynamic Policy Boundaries:** The Delegation Contract should read active limits directly from `policy_demo` via `GET /agent/policy/policy_demo`.
3. **Execution Flow Integration:** When a user initiates a mission from Mission Control, the mission context must store the prompt, transition to `Delegation Contract` or `Active Mission Plan`, invoke `POST /agent/buy`, update the live quote, and seamlessly open `Transaction Guardian` for checkout.
4. **Ledger Integrity Proof:** Verified Result must fetch `GET /ledger/verify-chain` to display live cryptographic integrity proof.

---

## 4. Remediation Plan

- **Step 1:** Create `frontend/src/lib/mission-context.tsx` providing single authoritative state (`missionGoal`, `budgetPaise`, `cart`, `activeQuote`, `policyDecision`, `agentRun`, `traceSteps`, `receipt`).
- **Step 2:** Update all 10 feature components to consume and mutate the unified `MissionContext`.
- **Step 3:** Wire `GET /ledger/verify-chain` into `MissionCompletedReceipt` and `MissionHistoryLedger`.
- **Step 4:** Execute full end-to-end user journeys (Standard Purchase, Policy Confirmation, Autonomous Recovery, Manual Catalog Addition).
