# AgentPay — Merchant Revenue Intelligence Specification

> **Track 01 — AI Growth & Agentic Commerce (Razorpay Buildathon)**  

---

## 1. Overview & Business Value

While security and authorization boundaries ensure zero unauthorized financial actions, merchants require intelligent commerce orchestration to maximize basket sizes and customer lifetime value.

The **Merchant Revenue Intelligence Engine** (`backend/app/services/revenue_intelligence.py`) identifies high-synergy complementary products and bundle opportunities that fit strictly within unspent buyer headroom.

---

## 2. Advisory Recommendation Algorithm

$$\text{Headroom} = \min(\text{BuyerBudget}, \text{PolicyCap}) - \text{CurrentCartTotal}$$

For every in-stock candidate item $c$ where $\text{Price}(c) \le \text{Headroom}$:

$$\text{BudgetFit}(c) = 1.0 - \frac{\text{Price}(c)}{\text{Headroom}}$$

$$\text{RecommendationScore}(c) = 0.60 \times \text{Affinity}(c) + 0.40 \times \text{BudgetFit}(c)$$

---

## 3. Strict Safety Invariants

- **Advisory Invariant:** Recommendations are purely advisory. They NEVER modify authoritative prices, stock, or bypass policy gates.
- **Quote Invariant:** All recommended items must obtain an authoritative server-side quote signed with HMAC-SHA256.
- **Authorization Invariant:** The combined basket is re-evaluated by the `PolicyEngine` against max spend limits and confirmation thresholds before Razorpay checkout.
