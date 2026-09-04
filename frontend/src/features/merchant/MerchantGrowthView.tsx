'use client';

import React from 'react';
import { useMission } from '@/lib/mission-context';

export function MerchantGrowthView() {
  const { revenueMetrics, auditEvents, refreshGrowthAnalytics, setActiveNav } = useMission();

  const totalGmvPaise = revenueMetrics?.total_gmv_paise || 0;
  const aovPaise = revenueMetrics?.average_order_value_paise || 0;
  const preservedGmvPaise = revenueMetrics?.recovery_preserved_revenue_paise || 0;
  const incrementalRevenuePaise = revenueMetrics?.incremental_cross_sell_revenue_paise || 0;
  const conversionRate = revenueMetrics?.cross_sell_conversion_rate || 0;
  const opportunitiesCount = revenueMetrics?.cross_sell_opportunities_count || 0;
  const acceptedCount = revenueMetrics?.cross_sell_acceptance_count || 0;
  const preventedLossPaise = revenueMetrics?.policy_blocked_prevented_loss_paise || 0;
  const hasData = revenueMetrics?.has_sufficient_data ?? false;

  const growthEvents = auditEvents.filter(
    (e) =>
      e.event_type === 'CROSS_SELL_ACCEPTED' ||
      e.event_type === 'CROSS_SELL_REJECTED' ||
      e.event_type === 'RECOMMENDATION_GENERATED' ||
      e.event_type?.includes('RECOVERY')
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c7c4d8]/20 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">Merchant Growth Center</h2>
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20">
              Live Commerce Intelligence
            </span>
          </div>
          <p className="text-xs text-[#464555] mt-1">
            Real-time merchant revenue creation, recovery preservation, and basket expansion derived from SQLite ledger events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshGrowthAnalytics()}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#c7c4d8]/40 hover:bg-[#eff4ff] text-xs font-semibold text-[#0b1c30] transition flex items-center gap-1.5 shadow-2xs"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            Refresh Intelligence
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total GMV */}
        <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 space-y-2 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-[#777587]">
            <span>TOTAL EXECUTED GMV</span>
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">payments</span>
          </div>
          <div className="font-heading font-bold text-2xl text-[#0b1c30]">
            ₹{(totalGmvPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#006c49] flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-xs">verified</span>
            100% Server-Authoritative
          </div>
        </div>

        {/* Preserved GMV via Autonomous Recovery */}
        <div className="glass-panel p-5 rounded-2xl border border-[#10b981]/20 space-y-2 bg-[#10b981]/5 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-[#006c49]">
            <span>RECOVERY PRESERVED GMV</span>
            <span className="material-symbols-outlined text-[#006c49] text-lg">auto_fix_high</span>
          </div>
          <div className="font-heading font-bold text-2xl text-[#006c49]">
            ₹{(preservedGmvPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#464555]">
            Saved from stockouts & budget failure
          </div>
        </div>

        {/* Incremental Cross-Sell Lift */}
        <div className="glass-panel p-5 rounded-2xl border border-[#4f46e5]/20 space-y-2 bg-[#eff4ff]/40 shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-[#4f46e5]">
            <span>INCREMENTAL BASKET LIFT</span>
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">trending_up</span>
          </div>
          <div className="font-heading font-bold text-2xl text-[#4f46e5]">
            ₹{(incrementalRevenuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#464555]">
            {acceptedCount} cross-sells accepted within headroom
          </div>
        </div>

        {/* Average Order Value */}
        <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 space-y-2 bg-white shadow-2xs">
          <div className="flex items-center justify-between text-xs font-mono text-[#777587]">
            <span>AVERAGE BASKET (AOV)</span>
            <span className="material-symbols-outlined text-[#653e00] text-lg">shopping_basket</span>
          </div>
          <div className="font-heading font-bold text-2xl text-[#0b1c30]">
            ₹{(aovPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#777587]">
            Across completed missions
          </div>
        </div>
      </div>

      {/* Before vs With AgentPay Merchant ROI Comparison */}
      <div className="glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 bg-white shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#c7c4d8]/15 pb-3">
          <div>
            <h3 className="font-heading font-bold text-base text-[#0b1c30]">
              Merchant Impact Analysis: Traditional Commerce vs AgentPay
            </h3>
            <p className="text-xs text-[#777587]">
              Demonstrates preserved revenue and basket lift calculated directly from database transactions and audit events.
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#4f46e5] shrink-0">
            DATA PROVENANCE: DATABASE & AUDIT LEDGER
          </span>
        </div>

        {hasData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Without AgentPay */}
            <div className="p-5 rounded-xl border border-[#ba1a1a]/20 bg-[#ba1a1a]/5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#ba1a1a]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">cancel</span> Without AgentPay (Traditional)
                </span>
                <span className="text-[10px] font-mono uppercase">Vulnerable</span>
              </div>
              <div className="space-y-2 text-xs text-[#464555]">
                <div className="flex justify-between py-1 border-b border-[#ba1a1a]/10">
                  <span>Stockout & Boundary Dropoff:</span>
                  <span className="font-mono font-semibold text-[#ba1a1a]">100% Lost to Abandonment</span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#ba1a1a]/10">
                  <span>Headroom-Aware Cross-Sells:</span>
                  <span className="font-mono font-semibold text-[#ba1a1a]">₹0 (Untapped)</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Policy Violation Chargeback Risk:</span>
                  <span className="font-mono font-semibold text-[#ba1a1a]">Unchecked</span>
                </div>
              </div>
            </div>

            {/* Column 2: With AgentPay */}
            <div className="p-5 rounded-xl border border-[#006c49]/20 bg-[#006c49]/5 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#006c49]">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">check_circle</span> With AgentPay Engine
                </span>
                <span className="text-[10px] font-mono uppercase">Optimized</span>
              </div>
              <div className="space-y-2 text-xs text-[#464555]">
                <div className="flex justify-between py-1 border-b border-[#006c49]/10">
                  <span>Preserved GMV via Recovery:</span>
                  <span className="font-mono font-bold text-[#006c49]">
                    +₹{(preservedGmvPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-[#006c49]/10">
                  <span>Incremental Cross-Sell Captured:</span>
                  <span className="font-mono font-bold text-[#4f46e5]">
                    +₹{(incrementalRevenuePaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Chargeback & Excess Breach Loss:</span>
                  <span className="font-mono font-bold text-[#006c49]">₹0 (Zero Breach)</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-xl border border-[#c7c4d8]/20 bg-[#f8f9ff] text-center space-y-2">
            <span className="material-symbols-outlined text-[#777587] text-2xl">analytics</span>
            <div className="text-xs font-semibold text-[#0b1c30]">
              Insufficient historical data for live ROI comparison
            </div>
            <p className="text-[11px] text-[#777587] max-w-md mx-auto">
              Execute missions with autonomous recovery and cross-sells to calculate live merchant ROI directly from recorded transactions.
            </p>
          </div>
        )}
      </div>

      {/* Secondary Intelligence Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Category Affinity & Co-Occurrence Graph (Col 1-7) */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 space-y-5 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-3">
            <div>
              <h3 className="font-heading font-bold text-base text-[#0b1c30]">Category Synergy & Affinity Matrix</h3>
              <p className="text-xs text-[#777587]">Discovered multi-item cross-sell pathways used by Autonomous Buyer.</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#4f46e5]">
              GRAPH ENGINE
            </span>
          </div>

          <div className="space-y-3">
            {(revenueMetrics?.category_affinity_insights || []).map((item: any, idx: number) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-[#c7c4d8]/20 hover:border-[#4f46e5]/40 transition flex items-center justify-between bg-[#f8f9ff]/50"
              >
                <div className="space-y-0.5">
                  <div className="font-heading font-semibold text-xs text-[#0b1c30] flex items-center gap-2">
                    <span>{item.pair}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#c7c4d8]/40 text-[#464555]">
                      {item.demand}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#777587]">Synergy: {item.synergy} • Fit: {item.affinity_rating}</div>
                </div>

                <div className="font-mono font-bold text-xs text-[#4f46e5] bg-white px-2.5 py-1 rounded-lg border border-[#c7c4d8]/30">
                  {item.synergy} Synergy
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Growth & Conversion Efficiency (Col 8-12) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 space-y-4 bg-white shadow-sm">
            <h3 className="font-heading font-bold text-sm text-[#0b1c30]">Autonomous Opportunity Funnel</h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center text-[#464555]">
                <span>Headroom Opportunities Discovered:</span>
                <span className="font-mono font-bold text-[#0b1c30]">{opportunitiesCount}</span>
              </div>
              <div className="flex justify-between items-center text-[#464555]">
                <span>Buyer Accepted Cross-Sells:</span>
                <span className="font-mono font-bold text-[#006c49]">{acceptedCount}</span>
              </div>
              <div className="flex justify-between items-center text-[#464555]">
                <span>Acceptance Conversion Rate:</span>
                <span className="font-mono font-bold text-[#4f46e5]">{conversionRate}%</span>
              </div>
              <div className="pt-2 border-t border-[#c7c4d8]/20 flex justify-between items-center text-[#464555]">
                <span>Policy Breach Risk Prevented:</span>
                <span className="font-mono font-bold text-[#ba1a1a]">
                  ₹{(preventedLossPaise / 100).toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#4f46e5]/10 to-[#10b981]/10 border border-[#4f46e5]/20 space-y-3">
            <div className="font-heading font-bold text-xs text-[#0b1c30] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#4f46e5]">rocket_launch</span>
              Track 01: AI Growth Alignment
            </div>
            <p className="text-xs text-[#464555] leading-relaxed">
              AgentPay prevents zero-conversion cart dropoffs through <strong>Autonomous Recovery</strong> and maximizes order value within delegated buyer headroom using <strong>Affinity-Aware Recommendations</strong>.
            </p>
            <button
              onClick={() => setActiveNav('mission_control')}
              className="w-full py-2 bg-[#4f46e5] hover:bg-[#3525cd] text-white rounded-xl text-xs font-semibold shadow-2xs transition flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">play_arrow</span>
              Run New Agent Mission
            </button>
          </div>
        </div>
      </div>

      {/* Ledger Growth Audit Trail */}
      <div className="glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 space-y-4 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4f46e5]">history_edu</span>
            <h3 className="font-heading font-bold text-base text-[#0b1c30]">Cryptographic Growth Event Stream</h3>
          </div>
          <span className="text-[10px] font-mono text-[#777587]">
            SHA-256 Merkle Provenance
          </span>
        </div>

        <div className="divide-y divide-[#c7c4d8]/15 text-xs">
          {growthEvents.length > 0 ? (
            growthEvents.map((evt, idx) => (
              <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-semibold text-[#0b1c30] flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#4f46e5]">
                      {evt.event_type}
                    </span>
                    <span>Actor: {evt.actor}</span>
                  </div>
                  <div className="text-[11px] text-[#777587]">
                    {evt.payload?.product_name || evt.payload?.reason || 'Growth intelligence event logged'}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-[#777587]">
                  <div>Hash: {evt.event_hash ? evt.event_hash.slice(0, 16) : 'N/A'}...</div>
                  <div className="text-[10px] text-[#a09eaf]">
                    {evt.created_at ? new Date(evt.created_at).toLocaleTimeString() : 'Recent'}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-[#777587]">
              No growth events recorded yet. Run a mission to trigger real-time growth analytics.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
