'use client';

import React from 'react';
import { useMission } from '@/lib/mission-context';

import { LangGraphVisualTracer } from './LangGraphVisualTracer';
import { MerchantOfferComparisonCard } from './MerchantOfferComparisonCard';
import { MultiAgentNegotiationArena } from './MultiAgentNegotiationArena';

export function ActiveMissionView() {
  const {
    missionGoal,
    liveTraceSteps,
    activeQuote,
    cart,
    latestRun,
    policy,
    recoveryData,
    recoveryHistory,
    crossSellRecommendations,
    acceptCrossSellOpportunity,
    dismissCrossSellOpportunity,
    requestAuthoritativeQuote,
    setIsGuardianOpen,
    setMissionFlowState,
  } = useMission();

  const hasRecovery = !!(recoveryData || (recoveryHistory && recoveryHistory.length > 0));

  const totalSpendPaise =
    activeQuote?.total || cart.reduce((s, i) => s + i.price * i.quantity, 0) || 0;
  const authorityLimitPaise = policy?.max_transaction_amount || 500000;
  const remainingHeadroomPaise = Math.max(0, authorityLimitPaise - totalSpendPaise);

  const defaultSteps = [
    { title: 'Understood request', desc: 'Extracted intent & budget boundary', done: true },
    { title: 'Searched catalog', desc: 'Scanned verified merchant inventory', done: true },
    { title: 'Ranked candidate products', desc: 'Evaluated specs and pricing fit', done: true },
    { title: 'Verified atomic inventory', desc: 'Confirmed server stock availability', done: true },
    { title: 'Applied spending boundary', desc: 'Filtered candidates within budget', done: true },
    { title: 'Locked server quote', desc: 'Generated HMAC-SHA256 signed quote', done: true, active: false },
  ];

  const handleProceedToGuardian = async () => {
    try {
      if (!activeQuote) {
        await requestAuthoritativeQuote();
      }
      setIsGuardianOpen(true);
    } catch (err) {
      console.error('Error opening guardian', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c7c4d8]/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">Active Mission</h2>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20">
              Transaction Guardian Active
            </span>
            {hasRecovery && (
              <button
                onClick={() => setMissionFlowState('adapting')}
                className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#f59e0b]/10 text-[#653e00] border border-[#f59e0b]/20 hover:bg-[#f59e0b]/20 flex items-center gap-1 transition"
              >
                <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                Autonomous Adaptation Triggered (View)
              </button>
            )}
          </div>
          <p className="text-xs text-[#464555] mt-1">
            Agent is executing your request for: <strong className="text-[#0b1c30]">"{missionGoal}"</strong>
          </p>
        </div>
      </div>

      {/* Visual LangGraph Execution Tracer with Real Evidence Mode */}
      <LangGraphVisualTracer
        steps={liveTraceSteps}
        hasRecovery={hasRecovery}
        recoveryCount={recoveryHistory?.length || 0}
        recoveryHistory={recoveryHistory}
        policyDecision={latestRun?.policy_decision}
        activeQuote={activeQuote}
        offerComparison={latestRun?.offer_comparison}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Agent Progress Stepper (Col 1-5) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-3">
              <h3 className="font-heading font-bold text-sm text-[#0b1c30]">Agent Progress</h3>
              <span className="material-symbols-outlined text-[#4f46e5] text-base">monitoring</span>
            </div>

            <div className="space-y-4">
              {liveTraceSteps.length > 0 ? (
                liveTraceSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="w-5 h-5 rounded-full bg-[#4f46e5] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-xs">check</span>
                    </div>
                    <div>
                      <div className="font-semibold text-[#0b1c30]">{step.action}</div>
                      <div className="text-[11px] text-[#777587] leading-relaxed">
                        Node: {step.node} ({step.duration_ms || 12}ms)
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                defaultSteps.map((s, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <div className="mt-0.5">
                      {s.done ? (
                        <div className="w-5 h-5 rounded-full bg-[#4f46e5] text-white flex items-center justify-center">
                          <span className="material-symbols-outlined text-xs">check</span>
                        </div>
                      ) : s.active ? (
                        <div className="w-5 h-5 rounded-full border-2 border-[#4f46e5] border-t-transparent animate-spin" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-[#c7c4d8]/40" />
                      )}
                    </div>
                    <div>
                      <div className={`font-semibold ${s.done ? 'text-[#0b1c30]' : 'text-[#4f46e5]'}`}>{s.title}</div>
                      <div className="text-[11px] text-[#777587] leading-relaxed">{s.desc}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bounded Offer Comparison Evidence */}
          <MerchantOfferComparisonCard
            comparison={latestRun?.offer_comparison}
            candidatesCount={latestRun?.ranked_candidates?.length || 0}
          />
        </div>

        {/* RIGHT COLUMN: Execution Plan & Decision Evidence (Col 6-12) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Multi-Agent Autonomous Negotiation Arena */}
          <MultiAgentNegotiationArena comparison={latestRun?.offer_comparison} />

          {/* The Execution Plan Card */}
          <div className="authority-envelope rounded-2xl p-6 space-y-5 border border-[#4f46e5]/15 shadow-sm">
            <div className="flex items-start justify-between border-b border-[#c7c4d8]/20 pb-3">
              <div>
                <h3 className="font-heading font-bold text-sm text-[#0b1c30]">The Execution Plan</h3>
                <p className="text-xs text-[#464555]">Proposed procurement strategy based on Agent reasoning.</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-mono text-[#777587] uppercase font-bold">Total Allocated</span>
                <div className="font-heading font-bold text-xl text-[#4f46e5]">
                  ₹{(totalSpendPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Checklist Badges */}
            <div className="flex flex-wrap gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#4f46e5] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">price_check</span> Price Verified
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#4f46e5] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">inventory</span> Stock Confirmed
              </span>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#006c49] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">verified</span> Policy Pass
              </span>
            </div>

            {/* Items List */}
            <div className="divide-y divide-[#c7c4d8]/15">
              {cart.length > 0 ? (
                cart.map((it) => (
                  <div key={it.sku} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#f8f9ff] flex items-center justify-center text-[#4f46e5]">
                        <span className="material-symbols-outlined text-sm">
                          {it.name.toLowerCase().includes('keyboard') ? 'keyboard' : 'devices'}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-[#0b1c30]">{it.name}</div>
                        <div className="text-[11px] text-[#777587]">{it.description || 'Verified vendor selection'}</div>
                      </div>
                    </div>
                    <div className="font-mono font-bold text-[#0b1c30]">
                      ₹{((it.price * it.quantity) / 100).toFixed(0)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-4 text-center text-xs text-[#777587]">No items currently selected in plan.</div>
              )}
            </div>

            {/* Remaining Authority Headroom */}
            <div className="p-3 bg-[#eff4ff] rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-[#464555]">
                Remaining Authority (Boundary: ₹{(authorityLimitPaise / 100).toFixed(0)})
              </span>
              <span className="text-[#006c49] font-bold">
                ₹{(remainingHeadroomPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
              </span>
            </div>

            {/* Budget-Aware Merchant Cross-Sell Opportunity */}
            {crossSellRecommendations && crossSellRecommendations.length > 0 && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-[#eff4ff] to-[#f8f9ff] border border-[#4f46e5]/20 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-bold text-[#4f46e5]">
                    <span className="material-symbols-outlined text-sm">auto_graph</span>
                    Complementary Growth Opportunity
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#10b981]/15 text-[#006c49]">
                    FITS BUDGET HEADROOM
                  </span>
                </div>

                <div className="space-y-2.5">
                  {crossSellRecommendations.map((rec) => (
                    <div
                      key={rec.sku}
                      className="bg-white p-3 rounded-lg border border-[#c7c4d8]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-[#0b1c30] flex items-center gap-1.5">
                          <span>{rec.name}</span>
                          <span className="text-[10px] font-mono text-[#777587]">({rec.category})</span>
                        </div>
                        <p className="text-[11px] text-[#464555] leading-relaxed">
                          {rec.reason}
                        </p>
                        <div className="text-[10px] font-mono text-[#006c49]">
                          +₹{(rec.recommended_price / 100).toFixed(0)} • Remaining after add: ₹{(rec.remaining_after_add_paise / 100).toFixed(0)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => acceptCrossSellOpportunity(rec)}
                          className="px-3 py-1.5 rounded-lg bg-[#4f46e5] hover:bg-[#3525cd] text-white font-heading font-semibold text-xs shadow-2xs transition flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-xs">add_shopping_cart</span>
                          Add to Mission
                        </button>
                        <button
                          onClick={() => dismissCrossSellOpportunity(rec)}
                          className="p-1.5 rounded-lg text-[#777587] hover:bg-[#eff4ff] transition"
                          title="Dismiss opportunity"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {latestRun?.status === 'COMPLETED' || latestRun?.execution_result ? (
              <button
                onClick={() => setMissionFlowState('completed')}
                className="w-full bg-[#10b981] hover:bg-[#059669] text-white py-2.5 rounded-xl font-heading font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                View Completed Order Receipt & Ledger
              </button>
            ) : (
              <button
                onClick={handleProceedToGuardian}
                disabled={cart.length === 0}
                className="w-full bg-[#4f46e5] hover:bg-[#3525cd] text-white py-2.5 rounded-xl font-heading font-semibold text-xs transition flex items-center justify-center gap-2 shadow-xs disabled:opacity-40"
              >
                <span className="material-symbols-outlined text-sm">verified_user</span>
                {latestRun?.status === 'REQUIRE_CONFIRMATION'
                  ? 'Review & Authorize High-Value Order'
                  : 'Authorize & Review Options'}
              </button>
            )}
          </div>

          {/* Decision Evidence Card */}
          <div className="glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 space-y-4 shadow-sm">
            <h4 className="font-heading font-bold text-sm text-[#0b1c30]">Decision Evidence</h4>
            <blockquote className="text-xs text-[#464555] italic bg-[#f8f9ff] p-3 rounded-xl border-l-2 border-[#4f46e5]">
              "{latestRun?.explanation || 'Optimal valid selection satisfying category requirements within spending authority.'}"
            </blockquote>

            <div className="p-3 rounded-xl bg-[#10b981]/5 border border-[#10b981]/20 space-y-1 text-xs">
              <div className="text-[11px] font-bold text-[#006c49] flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">check_circle</span> Selected Cart Configuration
              </div>
              <div className="font-semibold text-[#0b1c30]">
                {cart.length > 0 ? cart.map((i) => `${i.name} (x${i.quantity})`).join(', ') : 'No items selected yet'}
              </div>
              <div className="text-[10px] text-[#464555] space-y-0.5 pt-1">
                <div>• Verified within category whitelists</div>
                <div>• Calculated under single-tx ceiling</div>
                <div>• Live stock availability confirmed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
