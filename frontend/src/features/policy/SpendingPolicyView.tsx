'use client';

import React, { useState } from 'react';
import { useMission } from '@/lib/mission-context';

export function SpendingPolicyView() {
  const { policy, policySummary, loadInitialData, savePolicyUpdates } = useMission();
  const [editingCap, setEditingCap] = useState(false);
  const [newCapRupees, setNewCapRupees] = useState('');
  const [saving, setSaving] = useState(false);

  const maxSpendPaise = policySummary?.max_transaction_amount || policy?.max_transaction_amount || 500000;
  const requireApprovalPaise = policySummary?.confirmation_threshold || policy?.confirmation_threshold || 300000;
  const spentPaise = policySummary?.total_spent_paise || 0;
  const remainingPaise = policySummary?.available_headroom_paise ?? Math.max(0, maxSpendPaise - spentPaise);
  const percentUsed = maxSpendPaise > 0 ? Math.min(100, Math.round((spentPaise / maxSpendPaise) * 100)) : 0;

  const formatINR = (paise: number) =>
    (paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const handleUpdateCap = async () => {
    const rupees = parseFloat(newCapRupees);
    if (isNaN(rupees) || rupees <= 0) return;
    setSaving(true);
    try {
      await savePolicyUpdates({ max_transaction_amount: Math.round(rupees * 100) });
      setEditingCap(false);
      setNewCapRupees('');
    } catch (e) {
      console.error('Failed to update cap', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="border-b border-[#c7c4d8]/20 pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">Spending & Policy</h2>
          <p className="text-xs text-[#464555] mt-0.5">
            Database-backed constraints that govern autonomous purchases.
          </p>
        </div>
        <button
          onClick={() => loadInitialData()}
          className="p-1.5 rounded-xl bg-white border border-[#c7c4d8]/30 hover:border-[#4f46e5] text-[#4f46e5] text-xs font-semibold flex items-center gap-1 shadow-2xs transition"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Sync Rules
        </button>
      </div>

      {/* Main Policy Header Card */}
      <div className="glass-panel p-6 rounded-2xl border border-[#4f46e5]/15 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4f46e5] text-lg">shield</span>
            <span className="font-mono text-xs font-bold text-[#0b1c30] tracking-wider">
              {policy?.id || 'policy_demo'} (v{policy?.policy_version || 1})
            </span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20 uppercase">
            {policy?.active ? 'Enforcing Live' : 'Active'}
          </span>
        </div>

        {/* Financial Metrics Grid (Derived from Database) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs">
            <div className="text-[11px] font-medium text-[#777587] uppercase tracking-wider">Max Transaction Cap</div>
            <div className="font-heading font-bold text-2xl text-[#0b1c30] mt-1">₹{formatINR(maxSpendPaise)}</div>
            <div className="text-[10px] text-[#777587] mt-1">Server Policy Ceiling</div>
          </div>

          <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs">
            <div className="text-[11px] font-medium text-[#777587] uppercase tracking-wider">Total Executed Spend</div>
            <div className="font-heading font-bold text-2xl text-[#4f46e5] mt-1">₹{formatINR(spentPaise)}</div>
            <div className="text-[10px] text-[#777587] mt-1">
              {spentPaise === 0 ? 'No completed transactions yet' : `${percentUsed}% of ceiling executed`}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#10b981]/5 border border-[#10b981]/20 shadow-2xs">
            <div className="text-[11px] font-medium text-[#006c49] uppercase tracking-wider">Available Single-Tx Buffer</div>
            <div className="font-heading font-bold text-2xl text-[#006c49] mt-1">₹{formatINR(remainingPaise)}</div>
            <div className="text-[10px] text-[#006c49]/80 mt-1">Available for authorized missions</div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between text-xs font-mono text-[#464555]">
            <span>Spend Velocity: {percentUsed}%</span>
            <span className="font-bold text-[#006c49]">₹{formatINR(remainingPaise)} Available Headroom</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#eff4ff] overflow-hidden border border-[#c7c4d8]/20">
            <div className="h-full bg-[#4f46e5] rounded-full transition-all" style={{ width: `${percentUsed}%` }} />
          </div>
        </div>
      </div>

      {/* Active Policies & Rules */}
      <div className="space-y-4">
        <h3 className="font-heading font-bold text-base text-[#0b1c30]">Active Rules</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-panel p-5 rounded-xl border border-[#c7c4d8]/20 space-y-3 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#0b1c30]">Maximum Spend Limit</h4>
                <p className="text-xs text-[#464555]">Hard ceiling on single procurement orders</p>
              </div>
              <button
                onClick={() => setEditingCap(!editingCap)}
                className="text-xs text-[#4f46e5] hover:underline font-semibold"
              >
                {editingCap ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editingCap ? (
              <div className="flex gap-2 pt-1">
                <input
                  type="number"
                  placeholder="e.g. 5000"
                  value={newCapRupees}
                  onChange={(e) => setNewCapRupees(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#c7c4d8]/40"
                />
                <button
                  onClick={handleUpdateCap}
                  disabled={saving}
                  className="px-4 py-1.5 bg-[#4f46e5] text-white text-xs font-semibold rounded-lg shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            ) : (
              <div className="font-mono font-bold text-xl text-[#0b1c30]">₹{formatINR(maxSpendPaise)}</div>
            )}
          </div>

          <div className="glass-panel p-5 rounded-xl border border-[#c7c4d8]/20 space-y-3 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#0b1c30]">Confirmation Threshold</h4>
                <p className="text-xs text-[#464555]">Human fingerprint authorization required above this</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#10b981]/10 text-[#006c49]">
                Active
              </span>
            </div>
            <div className="font-mono font-bold text-xl text-[#4f46e5]">₹{formatINR(requireApprovalPaise)}</div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-[#c7c4d8]/20 space-y-3 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#0b1c30]">Allowed Categories</h4>
                <p className="text-xs text-[#464555]">
                  {policy?.allowed_categories?.length || 0} Whitelisted Domain Groups
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#10b981]/10 text-[#006c49]">
                Active
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {(policy?.allowed_categories || []).map((cat: string) => (
                <span
                  key={cat}
                  className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#eff4ff] text-[#4f46e5] border border-[#4f46e5]/20"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-panel p-5 rounded-xl border border-[#c7c4d8]/20 space-y-3 shadow-2xs">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#0b1c30]">Max Quantity</h4>
                <p className="text-xs text-[#464555]">Hard limit per item SKU</p>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#10b981]/10 text-[#006c49]">
                Active
              </span>
            </div>
            <div className="font-mono font-bold text-xl text-[#0b1c30]">
              {policy?.max_quantity_per_sku || 2} Items per SKU
            </div>
          </div>
        </div>
      </div>

      {/* Spending Behavior / Simulation Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-heading font-bold text-base text-[#0b1c30]">Policy Rule Simulation Examples</h3>
          <span className="text-[10px] font-mono text-[#777587] uppercase">Simulation Only</span>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-[#c7c4d8]/20 divide-y divide-[#c7c4d8]/15 shadow-2xs">
          <div className="py-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-[#0b1c30]">Keyboard · ₹2,499</div>
              <p className="text-[11px] text-[#006c49]">Under ₹3,000 threshold - Auto-approved</p>
            </div>
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-[#10b981]/10 text-[#006c49] font-bold">
              ALLOW
            </span>
          </div>

          <div className="py-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-[#0b1c30]">4K Webcam · ₹3,499</div>
              <p className="text-[11px] text-[#653e00]">Exceeds ₹3,000 threshold - Hold for Human Authorization</p>
            </div>
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-[#f59e0b]/10 text-[#653e00] font-bold">
              HOLD
            </span>
          </div>

          <div className="py-3 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-[#0b1c30]">Enterprise Server · ₹12,450</div>
              <p className="text-[11px] text-[#ba1a1a]">Exceeds hard ₹5,000 budget cap - Transaction Blocked</p>
            </div>
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-full bg-[#ba1a1a]/10 text-[#ba1a1a] font-bold">
              BLOCK
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
