'use client';

import React from 'react';
import { MissionProvider, useMission } from '@/lib/mission-context';
import { Storefront } from '@/features/storefront/Storefront';
import { ProductIntelligenceDetail } from '@/features/storefront/ProductIntelligenceDetail';
import { AgentBuyerConsole } from '@/features/agent/AgentBuyerConsole';
import { DelegationContractView } from '@/features/agent/DelegationContractView';
import { ActiveMissionView } from '@/features/agent/ActiveMissionView';
import { AutonomousRecoveryView } from '@/features/agent/AutonomousRecoveryView';
import { MissionHistoryLedger } from '@/features/ledger/MissionHistoryLedger';
import { SpendingPolicyView } from '@/features/policy/SpendingPolicyView';
import { MissionCompletedReceipt } from '@/features/checkout/MissionCompletedReceipt';
import { TransactionGuardianModal } from '@/features/checkout/TransactionGuardianModal';
import { MerchantGrowthView } from '@/features/merchant/MerchantGrowthView';
import { RealHostileAttackLab } from '@/features/trust/RealHostileAttackLab';
import { PaymentNotificationToast } from '@/features/notifications/PaymentNotificationToast';

function AgentPayContent() {
  const {
    activeNav,
    setActiveNav,
    missionFlowState,
    setMissionFlowState,
    selectedProductDetail,
    setSelectedProductDetail,
    loadInitialData,
    policy,
    policySummary,
    auditEvents,
  } = useMission();

  // Dynamic values calculated from backend database state
  const maxSpendPaise = policySummary?.max_transaction_amount || policy?.max_transaction_amount || 500000;
  const spentPaise = policySummary?.total_spent_paise || 0;
  const headroomPaise = policySummary?.available_headroom_paise ?? Math.max(0, maxSpendPaise - spentPaise);
  const percentUsed = maxSpendPaise > 0 ? Math.min(100, Math.round((spentPaise / maxSpendPaise) * 100)) : 0;

  const recentTransactions = auditEvents.filter(
    (e) => e.event_type?.includes('ORDER') || e.event_type?.includes('CHECKOUT') || e.event_type?.includes('PAID')
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f8f9ff]">
      {/* SideNavBar (Stitch Layout) */}
      <aside className="hidden md:flex flex-col h-screen py-6 px-4 bg-white w-64 fixed left-0 top-0 border-r border-[#c7c4d8]/20 z-40">
        {/* Brand Header */}
        <div className="mb-6 px-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4f46e5] flex items-center justify-center text-white shadow-sm">
            <span className="material-symbols-outlined filled text-2xl">shield</span>
          </div>
          <div>
            <h1 className="font-heading font-bold text-lg text-[#0b1c30] leading-tight">AgentPay</h1>
            <p className="text-[11px] text-[#006c49] font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block animate-pulse" />
              Bounded Autonomy
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={() => {
            setActiveNav('mission_control');
            setMissionFlowState('prompt');
            setSelectedProductDetail(null);
          }}
          className="w-full bg-[#4f46e5] hover:bg-[#3525cd] text-white py-2.5 rounded-xl mb-6 font-heading font-semibold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          New Mission
        </button>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1.5 text-xs font-semibold">
          <button
            onClick={() => {
              setActiveNav('mission_control');
              setSelectedProductDetail(null);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeNav === 'mission_control'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-base">dashboard</span>
            Mission Control
          </button>

          <button
            onClick={() => {
              setActiveNav('catalog');
              setSelectedProductDetail(null);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeNav === 'catalog'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-base">explore</span>
            Catalog
          </button>

          <button
            onClick={() => {
              setActiveNav('missions');
              setSelectedProductDetail(null);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeNav === 'missions'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-base">task_alt</span>
            Missions
          </button>

          <button
            onClick={() => {
              setActiveNav('spending');
              setSelectedProductDetail(null);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeNav === 'spending'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-base">policy</span>
            Spending & Policies
          </button>

          <button
            onClick={() => {
              setActiveNav('growth');
              setSelectedProductDetail(null);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeNav === 'growth'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-base">trending_up</span>
            Merchant Growth
          </button>

          <button
            onClick={() => {
              setActiveNav('trust');
              setSelectedProductDetail(null);
            }}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              activeNav === 'trust'
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'text-[#464555] hover:bg-[#eff4ff] hover:text-[#0b1c30]'
            }`}
          >
            <span className="material-symbols-outlined text-base">verified_user</span>
            Trust Center
          </button>
        </nav>

        {/* Footer Navigation */}
        <div className="mt-auto pt-4 border-t border-[#c7c4d8]/20 space-y-1 text-xs text-[#777587]">
          <button
            onClick={() => setActiveNav('spending')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#eff4ff] hover:text-[#0b1c30] transition"
          >
            <span className="material-symbols-outlined text-base">settings</span>
            Settings
          </button>
          <button
            onClick={() => setActiveNav('missions')}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#eff4ff] hover:text-[#0b1c30] transition"
          >
            <span className="material-symbols-outlined text-base">shield</span>
            Security Ledger
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-y-auto bg-pattern relative">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[#c7c4d8]/20 px-8 py-3 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <span className="font-heading font-bold text-sm text-[#0b1c30]">
              {activeNav === 'mission_control' && 'Mission Control'}
              {activeNav === 'catalog' && (selectedProductDetail ? 'Product Intelligence' : 'Hardware & Peripherals Catalog')}
              {activeNav === 'missions' && 'Mission History & Audit Ledger'}
              {activeNav === 'spending' && 'Spending & Policy Control'}
              {activeNav === 'trust' && 'Trust & Security Center'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#006c49] bg-[#10b981]/10 px-3 py-1 rounded-full border border-[#10b981]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              Razorpay Test Mode
            </div>

            {/* Authenticated Identity Pill */}
            <div className="flex items-center gap-2 bg-[#f8f9ff] border border-[#c7c4d8]/30 px-3 py-1 rounded-full text-xs font-medium text-[#0b1c30] shadow-2xs">
              <div className="w-5 h-5 rounded-full bg-[#4f46e5] text-white flex items-center justify-center text-[10px] font-bold">
                AP
              </div>
              <span className="font-mono text-[11px] text-[#464555]">demo_buyer_01</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" title="Authenticated Identity" />
            </div>

            <button
              onClick={() => loadInitialData()}
              title="Refresh State from Database"
              className="p-1.5 rounded-xl bg-[#eff4ff] hover:bg-[#dce9ff] text-[#4f46e5] transition"
            >
              <span className="material-symbols-outlined text-sm block">refresh</span>
            </button>
          </div>
        </header>

        {/* Content Body */}
        <div className="max-w-6xl mx-auto w-full p-8 space-y-8">
          {/* VIEW 1: MISSION CONTROL */}
          {activeNav === 'mission_control' && (
            <div className="space-y-8">
              {/* SUB-FLOW 1: PROMPT ASSIGNMENT */}
              {missionFlowState === 'prompt' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  <div className="lg:col-span-8 space-y-6">
                    <div>
                      <h2 className="font-heading font-bold text-3xl text-[#0b1c30] leading-tight">
                        What do you want AgentPay to accomplish?
                      </h2>
                      <p className="text-xs text-[#464555] mt-1.5">
                        Delegate procurement securely. Set your parameters, and the agent handles the rest within policy.
                      </p>
                    </div>

                    <AgentBuyerConsole />
                  </div>

                  {/* Right Sidebar Column (Dynamic Database-Backed State) */}
                  <div className="lg:col-span-4 space-y-5">
                    {/* Real Available Authority Widget */}
                    <div className="p-6 rounded-2xl bg-[#3525cd] text-white space-y-4 shadow-md">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-white/80">Available Authority</span>
                        <span className="material-symbols-outlined text-white/80 text-lg">account_balance</span>
                      </div>
                      <div>
                        <div className="font-heading font-bold text-2xl">
                          ₹{(spentPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}{' '}
                          <span className="text-sm font-normal text-white/70">
                            / ₹{(maxSpendPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-white/20 rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-[#10b981] rounded-full transition-all" style={{ width: `${percentUsed}%` }} />
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px] font-mono text-white/80 pt-1">
                        <span>Database Policy: {policy?.id || 'policy_demo'}</span>
                        <span className="font-bold text-[#10b981]">
                          ₹{(headroomPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })} Headroom
                        </span>
                      </div>
                    </div>

                    {/* Real Recent Security Ledger */}
                    <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#0b1c30]">
                          <span className="material-symbols-outlined text-sm text-[#4f46e5]">shield</span> Security Ledger
                        </div>
                        <button
                          onClick={() => setActiveNav('missions')}
                          className="text-[11px] text-[#4f46e5] hover:underline font-semibold"
                        >
                          View All
                        </button>
                      </div>

                      {recentTransactions.length === 0 ? (
                        <div className="py-4 text-center text-xs text-[#777587]">
                          No completed spending activity yet.
                        </div>
                      ) : (
                        <div className="space-y-2 text-xs">
                          {recentTransactions.slice(0, 3).map((evt, idx) => (
                            <div key={idx} className="flex justify-between items-center py-1">
                              <div>
                                <div className="font-semibold text-[#0b1c30]">
                                  {evt.payload?.actor || 'Autonomous Procurement'}
                                </div>
                                <div className="text-[10px] text-[#777587]">
                                  {new Date(evt.timestamp).toLocaleDateString()}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-[#ba1a1a]">
                                -₹{((evt.payload?.amount || 0) / 100).toFixed(0)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Active Delegation Policies */}
                    <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 space-y-3 shadow-2xs">
                      <div className="text-[10px] font-mono font-bold text-[#777587] uppercase tracking-wider">
                        Active Delegation Constraints
                      </div>
                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#4f46e5]">verified</span>
                            <span>
                              Require Approval &gt; ₹{((policy?.confirmation_threshold || 300000) / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#006c49]">
                            ENFORCING
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-t border-[#c7c4d8]/15 pt-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-[#4f46e5]">category</span>
                            <span>Whitelisted Categories: {policy?.allowed_categories?.length || 4}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#10b981]/10 text-[#006c49]">
                            ENFORCING
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-FLOW 2: DELEGATION CONTRACT */}
              {missionFlowState === 'contract' && <DelegationContractView />}

              {/* SUB-FLOW 3: AGENT PLAN & EXECUTION */}
              {missionFlowState === 'active_plan' && <ActiveMissionView />}

              {/* SUB-FLOW 4: AUTONOMOUS RECOVERY */}
              {missionFlowState === 'adapting' && <AutonomousRecoveryView />}

              {/* SUB-FLOW 5: COMPLETED RECEIPT */}
              {missionFlowState === 'completed' && <MissionCompletedReceipt />}
            </div>
          )}

          {/* VIEW 2: CATALOG & PRODUCT INTELLIGENCE */}
          {activeNav === 'catalog' && (
            selectedProductDetail ? <ProductIntelligenceDetail /> : <Storefront />
          )}

          {/* VIEW 3: MISSIONS / AUDIT LEDGER */}
          {activeNav === 'missions' && <MissionHistoryLedger />}

          {/* VIEW 4: SPENDING & POLICIES */}
          {activeNav === 'spending' && <SpendingPolicyView />}

          {/* VIEW 5: MERCHANT GROWTH CENTER */}
          {activeNav === 'growth' && <MerchantGrowthView />}

          {/* VIEW 6: TRUST CENTER */}
          {activeNav === 'trust' && (
            <div className="space-y-8">
              <div className="glass-panel rounded-2xl p-8 space-y-4 shadow-sm">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#4f46e5] font-bold">
                  Financial Safety Boundary
                </span>
                <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">
                  How AgentPay Protects Every Purchase
                </h2>
                <p className="text-sm text-[#464555] max-w-2xl leading-relaxed">
                  Autonomous agents can search and optimize products, but they never obtain direct financial authority over money.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                  <div className="p-5 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-[#4f46e5] font-bold text-sm">
                      <span className="material-symbols-outlined">smart_toy</span> 1. AI Proposes
                    </div>
                    <p className="text-xs text-[#464555]">
                      Discovers products, compares specs, and formulates candidate carts within headroom.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-[#10b981]/5 border border-[#10b981]/20 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-[#006c49] font-bold text-sm">
                      <span className="material-symbols-outlined">gpp_good</span> 2. Guardian Authorizes
                    </div>
                    <p className="text-xs text-[#464555]">
                      Evaluates deterministic spending limits, category whitelists, and stock before moving money.
                    </p>
                  </div>
                  <div className="p-5 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-2">
                    <div className="flex items-center gap-2 text-[#0b1c30] font-bold text-sm">
                      <span className="material-symbols-outlined">payments</span> 3. Razorpay Executes
                    </div>
                    <p className="text-xs text-[#464555]">
                      Decreases inventory atomically and records each step in a SHA-256 hash-chained ledger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Real Hostile Attack Lab */}
              <RealHostileAttackLab />
            </div>
          )}
        </div>
      </main>

      {/* Unified Transaction Guardian Modal */}
      <TransactionGuardianModal />

      {/* Real-time Payment & Webhook SSE Notifications */}
      <PaymentNotificationToast
        onInspectLedger={() => {
          setActiveNav('missions');
          setSelectedProductDetail(null);
        }}
      />
    </div>
  );
}

export default function AgentPayApp() {
  return (
    <MissionProvider>
      <AgentPayContent />
    </MissionProvider>
  );
}
