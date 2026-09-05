'use client';

import React from 'react';
import { useMission } from '@/lib/mission-context';

export function AutonomousRecoveryView() {
  const { recoveryData, recoveryHistory, setMissionFlowState, setIsGuardianOpen, policy, latestRun } = useMission();

  // Honest Empty State if no autonomous recovery was needed
  if (!recoveryData && (!recoveryHistory || recoveryHistory.length === 0)) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[#10b981]/15 text-[#006c49] flex items-center justify-center mx-auto shadow-sm">
          <span className="material-symbols-outlined text-4xl">verified_user</span>
        </div>
        <div className="space-y-2">
          <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">No Recovery Required</h2>
          <p className="text-xs text-[#464555] max-w-md mx-auto leading-relaxed">
            All candidate items in your active plan satisfied live inventory checks and budget policy constraints on the first pass. No substitutions were triggered.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => setMissionFlowState('prompt')}
            className="px-6 py-2.5 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-heading font-semibold shadow-sm transition"
          >
            Return to Mission Control
          </button>
        </div>
      </div>
    );
  }

  const { originalItem, recoveredItem, originalTotal, newTotal, remainingAuthority } = recoveryData || {
    originalItem: { name: 'Original Candidate', price: 0 },
    recoveredItem: { name: 'Recovered Candidate', price: 0, reason: 'Autonomous adaptation' },
    originalTotal: 0,
    newTotal: 0,
    remainingAuthority: policy?.max_transaction_amount || 500000,
  };

  const impact = newTotal - originalTotal;
  const isBlocked = latestRun?.status === 'BLOCKED';

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {/* Interrupted Pill Banner */}
      <div className="flex flex-col items-center text-center space-y-3">
        <span className={`text-[11px] font-mono font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${
          isBlocked 
            ? 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20'
            : 'bg-[#f59e0b]/10 text-[#653e00] border border-[#f59e0b]/20'
        }`}>
          <span className="material-symbols-outlined text-xs">{isBlocked ? 'block' : 'sync_problem'}</span>
          AUTONOMOUS ADAPTATION
        </span>
        <h2 className="font-heading font-bold text-3xl text-[#0b1c30]">
          {isBlocked ? 'Recovery Halted: Unsafe Boundary' : 'Plan Adapted Autonomously'}
        </h2>
        <p className="text-sm text-[#464555] max-w-xl">
          {isBlocked
            ? 'The agent attempted bounded recovery, but no alternatives satisfied policy limits and inventory requirements.'
            : 'The original procurement plan changed because real-world constraints or inventory conditions required adaptation.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Substitution Progression / History (Col 1-7) */}
        <div className="md:col-span-7 space-y-4">
          {/* Detailed Recovery Action Sequence */}
          {recoveryHistory && recoveryHistory.length > 0 ? (
            <div className="space-y-4">
              <div className="text-[11px] font-mono font-bold text-[#777587] uppercase tracking-wider">
                Autonomous Recovery Sequence ({recoveryHistory.length} {recoveryHistory.length === 1 ? 'Attempt' : 'Attempts'})
              </div>

              {recoveryHistory.map((act, idx) => (
                <div key={idx} className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/30 space-y-3 bg-white shadow-2xs">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-[#4f46e5] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">tune</span> Attempt #{act.attempt}: {act.strategy}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#eff4ff] text-[#4f46e5]">
                      AUTO RESOLVED
                    </span>
                  </div>

                  <div className="text-xs text-[#0b1c30] bg-[#f8f9ff] p-3 rounded-xl border border-[#c7c4d8]/20">
                    <div className="font-semibold text-[#006c49] mb-1">► Reason & Action:</div>
                    <p className="text-[#464555] leading-relaxed">{act.reason}</p>
                    {act.affected_skus && act.affected_skus.length > 0 && (
                      <div className="text-[11px] font-mono text-[#777587] mt-2">
                        Affected SKUs: {act.affected_skus.join(', ')}
                      </div>
                    )}
                  </div>

                  {(act.before_total_paise !== undefined || act.after_total_paise !== undefined || newTotal > 0) && (
                    <div className="flex justify-between items-center text-xs font-mono pt-1 text-[#777587]">
                      <span>Before: ₹{((act.before_total_paise || originalTotal) / 100).toFixed(0)}</span>
                      <span className="material-symbols-outlined text-xs">arrow_forward</span>
                      <span className="font-bold text-[#0b1c30]">
                        After: ₹{(((act.after_total_paise && act.after_total_paise > 0) ? act.after_total_paise : newTotal) / 100).toFixed(0)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Single Substitution Card */
            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/30 opacity-75 relative bg-white">
                <div className="flex items-center justify-between text-xs text-[#777587] font-mono mb-2">
                  <span>ORIGINAL CANDIDATE</span>
                  <span className="text-[#ba1a1a] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">block</span> UNAVAILABLE / OVER BUDGET
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-base text-[#777587] line-through">
                    {originalItem.name}
                  </h3>
                  <span className="font-mono text-sm text-[#777587] line-through">
                    ₹{(originalItem.price / 100).toFixed(0)}
                  </span>
                </div>
              </div>

              <div className="flex justify-center text-[#4f46e5]">
                <span className="material-symbols-outlined text-2xl">arrow_downward</span>
              </div>

              <div className="p-6 rounded-2xl bg-[#10b981]/5 border border-[#10b981]/30 space-y-3 relative shadow-sm">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[#006c49] font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">auto_fix_high</span> ADAPTED SELECTION
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10b981]/20 text-[#006c49]">
                    AI ADAPTED
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-lg text-[#0b1c30]">{recoveredItem.name}</h3>
                  <span className="font-mono font-bold text-base text-[#4f46e5]">
                    ₹{(recoveredItem.price / 100).toFixed(0)}
                  </span>
                </div>

                <p className="text-xs text-[#464555] bg-white/70 p-3 rounded-xl border border-[#10b981]/20 leading-relaxed">
                  <strong className="text-[#006c49]">► Adaptation Logic:</strong> {recoveredItem.reason}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Financial Impact & Navigation Box (Col 8-12) */}
        <div className="md:col-span-5 glass-panel p-6 rounded-2xl border border-[#4f46e5]/15 space-y-5 shadow-md">
          <div className="flex items-center gap-2 border-b border-[#c7c4d8]/20 pb-3">
            <span className="material-symbols-outlined text-[#4f46e5]">calculate</span>
            <h3 className="font-heading font-bold text-sm text-[#0b1c30]">Financial Realignment</h3>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div className="flex justify-between text-[#464555]">
              <span>Initial Allocated:</span>
              <span className="text-[#0b1c30]">₹{(originalTotal / 100).toFixed(0)}</span>
            </div>
            <div className="flex justify-between text-[#464555]">
              <span>Adapted Total:</span>
              <span className="text-[#0b1c30] font-bold">₹{(newTotal / 100).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center text-[#464555]">
              <span>Net Variance:</span>
              <span className="text-[#4f46e5] font-bold text-xs">
                {impact >= 0 ? `+₹${(impact / 100).toFixed(0)}` : `-₹${Math.abs(impact / 100).toFixed(0)}`} (Complies with cap)
              </span>
            </div>
            <div className="pt-2 border-t border-[#c7c4d8]/20 flex justify-between items-center">
              <span className="text-xs font-bold text-[#0b1c30]">Remaining Headroom:</span>
              <span className="text-[#006c49] font-bold text-sm">
                ₹{Math.max(0, ((policy?.max_transaction_amount || 500000) - newTotal) / 100).toFixed(0)}
              </span>
            </div>
          </div>

          {/* Action CTAs: Step to Review & Guardian */}
          <div className="space-y-2 pt-2">
            {!isBlocked ? (
              <button
                onClick={() => {
                  if (latestRun?.status === 'COMPLETED' || latestRun?.execution_result) {
                    setMissionFlowState('completed');
                  } else {
                    setMissionFlowState('active_plan');
                  }
                }}
                className="w-full bg-[#4f46e5] hover:bg-[#3525cd] text-white py-2.5 rounded-xl font-heading font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">
                  {latestRun?.status === 'COMPLETED' || latestRun?.execution_result ? 'receipt_long' : 'visibility'}
                </span>
                {latestRun?.status === 'COMPLETED' || latestRun?.execution_result
                  ? 'View Completed Order Receipt'
                  : 'Review Adapted Plan & Authorize'}
              </button>
            ) : null}

            <button
              onClick={() => setMissionFlowState('prompt')}
              className="w-full bg-white hover:bg-[#eff4ff] border border-[#c7c4d8]/40 text-[#464555] py-2 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Return to Mission Prompt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
