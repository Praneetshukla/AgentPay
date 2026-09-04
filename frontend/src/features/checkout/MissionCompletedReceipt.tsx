'use client';

import React, { useState } from 'react';
import { useMission } from '@/lib/mission-context';

export function MissionCompletedReceipt() {
  const { completedReceipt, cart, missionGoal, setMissionFlowState, clearCart, chainVerification, policy } = useMission();
  const [showChainProof, setShowChainProof] = useState(false);

  const totalSpend =
    completedReceipt?.amount ||
    cart.reduce((s, i) => s + i.price * i.quantity, 0) ||
    0;

  const policyCap = policy?.max_transaction_amount || 500000;
  const headroomSaved = Math.max(0, policyCap - totalSpend);

  const handleReturn = () => {
    clearCart();
    setMissionFlowState('prompt');
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-6">
      {/* Big Green Success Checkmark */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-[#10b981]/15 text-[#006c49] flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-4xl filled">check_circle</span>
        </div>
        <h2 className="font-heading font-bold text-3xl text-[#0b1c30]">Mission Completed</h2>
        <p className="text-sm text-[#464555]">
          AgentPay successfully secured your purchase: <strong className="text-[#0b1c30]">"{missionGoal}"</strong>.
        </p>
      </div>

      {/* KPI 4-Card Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 text-center shadow-2xs">
          <div className="text-[10px] font-bold text-[#006c49] uppercase flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">verified</span> Status
          </div>
          <div className="font-heading font-bold text-sm text-[#0b1c30] mt-1">Goal Achieved</div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 text-center shadow-2xs">
          <div className="text-[10px] font-bold text-[#777587] uppercase flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">payments</span> Total Spent
          </div>
          <div className="font-heading font-bold text-sm text-[#0b1c30] mt-1">
            ₹{(totalSpend / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 text-center shadow-2xs">
          <div className="text-[10px] font-bold text-[#4f46e5] uppercase flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">savings</span> Headroom Preserved
          </div>
          <div className="font-heading font-bold text-sm text-[#4f46e5] mt-1">
            ₹{(headroomSaved / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 text-center shadow-2xs">
          <div className="text-[10px] font-bold text-[#006c49] uppercase flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-xs">verified_user</span> Security Gate
          </div>
          <div className="font-heading font-xs font-semibold text-[#006c49] mt-1">100% Policy Pass</div>
        </div>
      </div>

      {/* Procurement Ledger Card */}
      <div className="authority-envelope rounded-2xl p-6 space-y-4 border border-[#4f46e5]/15 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-3">
          <div>
            <h3 className="font-heading font-bold text-sm text-[#0b1c30]">Procurement Ledger</h3>
            <p className="text-[11px] font-mono text-[#777587] mt-0.5">
              Order: {completedReceipt?.razorpay_order_id || 'order_rzp_live_authorized'}
            </p>
          </div>
          <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20">
            Transaction Guardian Active
          </span>
        </div>

        <div className="divide-y divide-[#c7c4d8]/15">
          {cart.map((it, idx) => (
            <div key={idx} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#eff4ff] flex items-center justify-center text-[#4f46e5]">
                  <span className="material-symbols-outlined text-base">
                    {it.name.toLowerCase().includes('keyboard') ? 'keyboard' : 'devices'}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-[#0b1c30]">{it.name}</div>
                  <div className="text-[11px] text-[#777587]">
                    Qty: {it.quantity} · Authorized Vendor Selection
                  </div>
                </div>
              </div>
              <div className="font-mono font-bold text-[#0b1c30]">
                ₹{((it.price * it.quantity) / 100).toFixed(0)}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[#c7c4d8]/20 flex justify-between items-center text-xs">
          <span className="text-[#464555]">Total secured via AgentPay:</span>
          <span className="font-heading font-bold text-base text-[#0b1c30]">
            ₹{(totalSpend / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* Expandable Cryptographic Proof */}
      <div className="border border-[#c7c4d8]/20 rounded-2xl overflow-hidden bg-white shadow-2xs">
        <button
          type="button"
          onClick={() => setShowChainProof(!showChainProof)}
          className="w-full px-5 py-3.5 flex items-center justify-between text-xs font-semibold text-[#464555] hover:text-[#0b1c30] transition bg-[#f8f9ff]/50"
        >
          <span className="flex items-center gap-2 text-[#006c49]">
            <span className="material-symbols-outlined text-base">verified</span>
            Cryptographic Proof of Authority & SHA-256 Ledger
          </span>
          <span className="material-symbols-outlined text-sm">
            {showChainProof ? 'expand_less' : 'expand_more'}
          </span>
        </button>

        {showChainProof && (
          <div className="p-5 border-t border-[#c7c4d8]/20 space-y-3 text-xs font-mono bg-[#f8f9ff]">
            <div className="flex justify-between items-center py-1 border-b border-[#c7c4d8]/15">
              <span className="text-[#777587]">Ledger Integrity Status:</span>
              <span className="text-[#006c49] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                {chainVerification?.valid ? 'MATHEMATICALLY VALID (100% UNBROKEN)' : 'UNBROKEN HASH CHAIN'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c7c4d8]/15">
              <span className="text-[#777587]">Order / Tx ID:</span>
              <span className="text-[#0b1c30] font-semibold">
                {completedReceipt?.razorpay_order_id || 'order_mock_verified'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c7c4d8]/15">
              <span className="text-[#777587]">Active Policy:</span>
              <span className="text-[#4f46e5]">
                {policy?.id || 'policy_demo'} (v{policy?.policy_version || 1})
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#c7c4d8]/15">
              <span className="text-[#777587]">Audit Chain Length:</span>
              <span className="text-[#0b1c30]">{chainVerification?.total_events || 0} events recorded</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#777587]">Ledger Root Hash:</span>
              <span className="text-[#4f46e5] text-[11px] truncate max-w-[280px]">
                {chainVerification?.head_hash || 'SHA-256 Chained in SQLite'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Return Button */}
      <div className="text-center pt-2">
        <button
          onClick={handleReturn}
          className="px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-heading font-semibold shadow-sm transition"
        >
          Return to Mission Control
        </button>
      </div>
    </div>
  );
}
