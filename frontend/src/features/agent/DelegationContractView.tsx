'use client';

import React, { useState } from 'react';
import { useMission } from '@/lib/mission-context';
import { MasterPasscodeModal } from '@/features/auth/MasterPasscodeModal';

interface DelegationContractViewProps {
  onBack?: () => void;
}

export function DelegationContractView({ onBack }: DelegationContractViewProps) {
  const {
    missionGoal,
    policy,
    policySummary,
    startMissionWithAgent,
    setMissionFlowState,
    savePolicyUpdates,
    loadInitialData,
  } = useMission();

  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isPasscodeOpen, setIsPasscodeOpen] = useState(false);

  // Editable fields
  const [maxBudgetRupees, setMaxBudgetRupees] = useState(
    ((policy?.max_transaction_amount || 500000) / 100).toString()
  );
  const [confirmationRupees, setConfirmationRupees] = useState(
    ((policy?.confirmation_threshold || 300000) / 100).toString()
  );

  // Permitted action flags
  const [searchFilter, setSearchFilter] = useState(true);
  const [comparePricing, setComparePricing] = useState(true);
  const [substituteBrands, setSubstituteBrands] = useState(true);
  const [optimizeCart, setOptimizeCart] = useState(true);

  const allowedCategories = policy?.allowed_categories || ['Keyboards', 'Mice', 'Adapters & Hubs', 'Cameras'];
  const maxItems = policy?.max_cart_items || 3;

  const handleAuthenticatedLaunch = async () => {
    setIsPasscodeOpen(false);
    setSaving(true);
    setSaveStatus('Saving policy constraints to database...');
    try {
      const budgetPaise = Math.round(parseFloat(maxBudgetRupees) * 100);
      const confirmPaise = Math.round(parseFloat(confirmationRupees) * 100);

      if (!isNaN(budgetPaise) && budgetPaise > 0) {
        await savePolicyUpdates({
          max_transaction_amount: budgetPaise,
          confirmation_threshold: !isNaN(confirmPaise) && confirmPaise > 0 ? confirmPaise : undefined,
        });
      }
      setSaveStatus('Policy Saved. Launching Agent...');
      await startMissionWithAgent(missionGoal);
    } catch (err: any) {
      console.error('Failed to save policy updates', err);
      setSaveStatus('Failed to save policy. Check server connection.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndLaunch = () => {
    setIsPasscodeOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header breadcrumb */}
      <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#006c49] font-bold">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            DELEGATION BOUNDARY
          </div>
          <h2 className="font-heading font-bold text-2xl text-[#0b1c30] mt-1">
            Delegation Contract: <span className="text-[#4f46e5]">{policy?.id || 'policy_demo'} (v{policy?.policy_version || 1})</span>
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-[#c7c4d8]/30 shadow-2xs text-xs font-mono">
          <span className="material-symbols-outlined text-sm text-[#006c49]">shield</span>
          <span className="text-[#464555]">POLICY STATUS:</span>
          <span className="font-bold text-[#006c49]">Enforcing Live</span>
        </div>
      </div>

      {/* Goal Contract Statement */}
      <div className="glass-panel p-6 rounded-2xl border border-[#4f46e5]/15 space-y-4 shadow-sm relative">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-bold text-[#777587] uppercase tracking-wider">
            Procurement Mission Objective
          </span>
          <span className="material-symbols-outlined text-[#4f46e5] text-xl">shield</span>
        </div>

        <blockquote className="text-base font-medium text-[#0b1c30] leading-relaxed italic bg-[#f8f9ff] p-4 rounded-xl border-l-4 border-[#4f46e5]">
          "{missionGoal || 'Procure workstation peripherals within budget.'}"
        </blockquote>

        {/* Contract Limits Editor (Real Database Binding & Interactive Dual Slider) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Hard Spending Ceiling */}
          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#777587] uppercase font-mono">
                <span className="material-symbols-outlined text-sm text-[#4f46e5]">payments</span> Hard Spending Ceiling
              </div>
              <span className="text-[10px] font-mono font-bold text-[#ba1a1a] bg-[#ba1a1a]/10 px-1.5 py-0.5 rounded">
                HARD CAP
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-[#0b1c30]">₹</span>
              <input
                type="number"
                value={maxBudgetRupees}
                min="500"
                max="25000"
                step="250"
                onChange={(e) => setMaxBudgetRupees(e.target.value)}
                className="w-full font-heading font-bold text-xl text-[#4f46e5] border-b border-[#4f46e5]/30 focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
            <input
              type="range"
              min="1000"
              max="25000"
              step="500"
              value={parseFloat(maxBudgetRupees) || 5000}
              onChange={(e) => setMaxBudgetRupees(e.target.value)}
              className="w-full accent-[#4f46e5] cursor-pointer"
            />
            <div className="text-[10px] text-[#777587]">Persisted to database policy: policy_demo</div>
          </div>

          {/* Allowed Categories */}
          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#777587] uppercase font-mono">
                <span className="material-symbols-outlined text-sm text-[#006c49]">category</span> Allowed Categories
              </div>
              <div className="flex flex-wrap gap-1.5 pt-2">
                {allowedCategories.map((cat: string, idx: number) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-[#eff4ff] text-[#4f46e5] border border-[#4f46e5]/20"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-[#777587]">Filtered strictly via Policy Rule 4</div>
          </div>

          {/* Confirmation Gate */}
          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#777587] uppercase font-mono">
                <span className="material-symbols-outlined text-sm text-[#f59e0b]">fingerprint</span> Confirmation Gate
              </div>
              <span className="text-[10px] font-mono font-bold text-[#653e00] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">
                HUMAN GATE
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-base font-bold text-[#0b1c30]">₹</span>
              <input
                type="number"
                value={confirmationRupees}
                min="250"
                max={parseFloat(maxBudgetRupees) || 5000}
                step="250"
                onChange={(e) => setConfirmationRupees(e.target.value)}
                className="w-full font-heading font-bold text-xl text-[#0b1c30] border-b border-[#c7c4d8]/40 focus:outline-none focus:border-[#4f46e5]"
              />
            </div>
            <input
              type="range"
              min="500"
              max={parseFloat(maxBudgetRupees) || 5000}
              step="250"
              value={parseFloat(confirmationRupees) || 3000}
              onChange={(e) => setConfirmationRupees(e.target.value)}
              className="w-full accent-[#f59e0b] cursor-pointer"
            />
            <div className="text-[10px] text-[#777587]">Requires human authorization above this</div>
          </div>
        </div>

        {/* Real-time Dynamic Authority Zone Preview */}
        <div className="p-3.5 bg-white rounded-xl border border-[#c7c4d8]/30 space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-[#464555]">
            <span>Delegated Authority Spectrum:</span>
            <span>Ceiling: ₹{parseFloat(maxBudgetRupees || '0').toLocaleString('en-IN')}</span>
          </div>
          <div className="h-2.5 w-full bg-slate-100 rounded-full flex overflow-hidden border border-slate-200">
            <div
              className="bg-[#10b981] transition-all"
              style={{ width: `${Math.min(100, (parseFloat(confirmationRupees) / (parseFloat(maxBudgetRupees) || 1)) * 100)}%` }}
              title="Green Zone: Autonomous execution under threshold"
            />
            <div
              className="bg-[#f59e0b] transition-all"
              style={{ width: `${Math.max(0, 100 - (parseFloat(confirmationRupees) / (parseFloat(maxBudgetRupees) || 1)) * 100)}%` }}
              title="Amber Zone: Requires explicit human authorization"
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-[#777587]">
            <span className="text-[#006c49] font-bold">🟢 Auto-Approve (&lt; ₹{parseFloat(confirmationRupees || '0').toLocaleString('en-IN')})</span>
            <span className="text-[#653e00] font-bold">🟡 Require Confirmation (&gt; ₹{parseFloat(confirmationRupees || '0').toLocaleString('en-IN')})</span>
            <span className="text-[#ba1a1a] font-bold">🔴 Hard Block (&gt; ₹{parseFloat(maxBudgetRupees || '0').toLocaleString('en-IN')})</span>
          </div>
        </div>
      </div>

      {/* Permitted Autonomous Actions */}
      <div className="glass-panel p-6 rounded-2xl border border-[#c7c4d8]/20 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold font-mono text-[#777587] uppercase tracking-wider">
          <span className="material-symbols-outlined text-sm text-[#4f46e5]">tune</span> Permitted Autonomous Capabilities
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 flex items-center justify-between shadow-2xs">
            <div>
              <div className="font-semibold text-xs text-[#0b1c30]">Search & Filter</div>
              <div className="text-[11px] text-[#777587]">Identify candidates based on specs</div>
            </div>
            <button
              type="button"
              onClick={() => setSearchFilter(!searchFilter)}
              className={`w-10 h-5 rounded-full flex items-center transition p-0.5 ${
                searchFilter ? 'bg-[#4f46e5] justify-end' : 'bg-[#c7c4d8] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 flex items-center justify-between shadow-2xs">
            <div>
              <div className="font-semibold text-xs text-[#0b1c30]">Compare Pricing</div>
              <div className="text-[11px] text-[#777587]">Analyze across vendors and tiers</div>
            </div>
            <button
              type="button"
              onClick={() => setComparePricing(!comparePricing)}
              className={`w-10 h-5 rounded-full flex items-center transition p-0.5 ${
                comparePricing ? 'bg-[#4f46e5] justify-end' : 'bg-[#c7c4d8] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 flex items-center justify-between shadow-2xs">
            <div>
              <div className="font-semibold text-xs text-[#0b1c30]">Substitute Brands</div>
              <div className="text-[11px] text-[#777587]">Autonomous recovery within headroom</div>
            </div>
            <button
              type="button"
              onClick={() => setSubstituteBrands(!substituteBrands)}
              className={`w-10 h-5 rounded-full flex items-center transition p-0.5 ${
                substituteBrands ? 'bg-[#4f46e5] justify-end' : 'bg-[#c7c4d8] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 flex items-center justify-between shadow-2xs">
            <div>
              <div className="font-semibold text-xs text-[#0b1c30]">Optimize Cart</div>
              <div className="text-[11px] text-[#777587]">Maximize headroom preserved</div>
            </div>
            <button
              type="button"
              onClick={() => setOptimizeCart(!optimizeCart)}
              className={`w-10 h-5 rounded-full flex items-center transition p-0.5 ${
                optimizeCart ? 'bg-[#4f46e5] justify-end' : 'bg-[#c7c4d8] justify-start'
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
            </button>
          </div>
        </div>
      </div>

      {/* Contract Sign Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => {
            if (onBack) onBack();
            else setMissionFlowState('prompt');
          }}
          className="px-5 py-2.5 rounded-xl border border-[#c7c4d8]/40 hover:bg-[#eff4ff] text-xs font-semibold text-[#464555] transition"
        >
          Cancel & Edit Goal
        </button>

        <div className="flex items-center gap-3">
          {saveStatus && <span className="text-xs font-mono text-[#006c49]">{saveStatus}</span>}
          <button
            onClick={handleSaveAndLaunch}
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-heading font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              'Persisting Policy...'
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">lock</span>
                Save Policy & Launch Mission
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Human Authorization Gate Modal */}
      <MasterPasscodeModal
        isOpen={isPasscodeOpen}
        onClose={() => setIsPasscodeOpen(false)}
        onSuccess={handleAuthenticatedLaunch}
        actionTitle="Authorize Delegation Contract"
        actionDescription="Enter your Master Commercial PIN to sign policy constraints to database."
      />
    </div>
  );
}
