# Implementation Plan - Phase 19: Merchant Growth & Revenue Intelligence Integration

## 1. Goal Description
Transform AgentPay from purely "Safe autonomous purchasing" into "Safe autonomous commerce that intelligently creates and preserves merchant revenue while remaining strictly bounded by the buyer's delegated authority."

This bridges the existing backend `MerchantGrowthEngine` and `RevenueIntelligenceEngine` into the live user flow and exposes a real, database-backed **Merchant Growth Center**.

---

## 2. Security & Financial Invariants (Strictly Maintained)
- $UNAUTHORIZED\_MONEY\_ACTIONS = 0$
- HMAC-SHA256 Server-Authoritative Quote Signing
- Deterministic Policy Evaluation & Hard Spending Ceiling
- Confirmation Threshold Enforced
- All cross-sell recommendations are strictly **advisory** and require quote signing $\rightarrow$ policy gate $\rightarrow$ guardian review before money moves.

---

## 3. Proposed Changes

### Backend Components
1. **Refine Revenue Intelligence (`backend/app/services/revenue_intelligence.py`):**
   - Compute honest metrics directly from the database:
     - `total_gmv_paise`: Sum of all `PAID` transactions.
     - `average_order_value_paise`: `total_gmv / count` (or 0 if empty).
     - `recovery_preserved_revenue_paise`: Total value of successful transactions that had autonomous recovery.
     - `incremental_revenue_paise`: Value added through accepted complementary recommendations.
     - `cross_sell_opportunities_count` & `acceptance_count`.
     - `category_affinity_insights`: Real category co-occurrence matrix from transaction history.
2. **Expose Dedicated Growth API Endpoints (`backend/app/api/analytics.py`):**
   - `GET /analytics/revenue/metrics`: Returns real database-calculated revenue metrics.
   - `POST /analytics/revenue/cross-sell-recommendations`: Takes active cart SKUs, current total, and buyer budget; returns valid in-stock complementary cross-sell opportunities fitting within remaining headroom.
   - `POST /analytics/revenue/record-recommendation-decision`: Emits `CROSS_SELL_ACCEPTED` or `CROSS_SELL_REJECTED` audit event to the cryptographic ledger.
3. **Backend Unit & Integration Tests (`backend/tests/test_phase19_merchant_growth.py`):**
   - Test revenue calculation with 0 transactions (honest empty state).
   - Test headroom cross-sell filtering (guaranteeing price $\le$ headroom).
   - Test policy constraints on cross-sells (category whitelist, ceiling bounds).
   - Test audit ledger event emission for growth decisions.

### Frontend Components
1. **API Client Integration (`frontend/src/lib/api.ts`):**
   - Add `fetchRevenueMetrics()`, `fetchCrossSellRecommendations()`, `recordGrowthDecision()`.
2. **Context & State (`frontend/src/lib/mission-context.tsx`):**
   - Add state for cross-sell recommendations and merchant analytics data.
   - Provide helper to accept a cross-sell: dynamically appends the item to the cart, requests a fresh server quote, and triggers policy re-evaluation.
3. **Plan Integration (`frontend/src/features/agent/ActiveMissionView.tsx`):**
   - Render a high-agency **"Complementary Growth Opportunity"** card right under the cart plan when remaining authority $> 0$ and high-affinity products exist.
   - Display product name, price, affinity reason, and remaining authority after add.
   - Single-click **"Add to Mission"** updates the cart, requests a fresh server-authoritative quote, and seamlessly prepares for Guardian review.
4. **Merchant Growth Center Screen (`frontend/src/features/merchant/MerchantGrowthView.tsx`):**
   - New dedicated navigation tab: **"Merchant Growth"** (`activeNav === 'growth'`).
   - Displays:
     - Real Total Executed GMV & AOV
     - Revenue Preserved via Autonomous Recovery
     - Incremental Revenue from Cross-Sells
     - Category Affinity Distribution
     - Live Conversion & Opportunity Efficiency
     - Cryptographic Audit Integration
5. **Main Navigation (`frontend/src/app/page.tsx`):**
   - Add "Merchant Growth" sidebar item with growth icon.
   - Render `MerchantGrowthView` when `activeNav === 'growth'`.

---

## 4. Verification Plan

### Automated Tests
```powershell
# Run backend pytest suite including new phase 19 tests
d:\Projects\AI\backend\.venv\Scripts\python.exe -m pytest tests/test_phase19_merchant_growth.py tests/test_agent_buyer.py tests/test_policy.py -v

# Run Next.js production build
npm run build (in frontend)
```

### Manual & Demo Verification
1. **Scenario 1: Budget-Aware Upsell Flow**
   - Delegate ₹5,000 budget for a keyboard (₹2,499).
   - Verify that the Active Plan displays a cross-sell opportunity for a mouse (₹1,299) with "Fits within remaining ₹2,501 headroom".
   - Click "Add to Mission" $\rightarrow$ Verify quote updates to ₹3,798 $\rightarrow$ Open Guardian $\rightarrow$ Execute Razorpay test payment.
2. **Scenario 2: Merchant Growth Center**
   - Open the "Merchant Growth" tab $\rightarrow$ Verify that the new transaction, preserved revenue, and incremental lift are reflected immediately with zero fabricated constants.
3. **Scenario 3: Audit Trail**
   - Verify that `CROSS_SELL_ACCEPTED` and `RECOVERY_REVENUE_PRESERVED` are immutably logged with valid SHA-256 Merkle hashes.
