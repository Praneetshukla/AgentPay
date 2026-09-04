'use client';

import React from 'react';
import { ShieldCheck, ShieldAlert, Check, X, Lock } from 'lucide-react';
import { PolicyDefinition, PolicyDecision } from '@/types/policy';

interface PolicyGuardPanelProps {
  policy: PolicyDefinition | null;
  policyDecision?: PolicyDecision | any;
  activeQuote?: any;
}

export function PolicyGuardPanel({ policy, policyDecision, activeQuote }: PolicyGuardPanelProps) {
  if (!policy) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">Deterministic Policy Constraints</h3>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          Server Authoritative
        </span>
      </div>

      {/* Active Rules Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-500">MAX TRANSACTION</div>
          <div className="font-bold text-slate-200 mt-0.5">₹{(policy.max_transaction_amount / 100).toLocaleString('en-IN')}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-500">CONFIRM THRESHOLD</div>
          <div className="font-bold text-amber-300 mt-0.5">₹{(policy.confirmation_threshold / 100).toLocaleString('en-IN')}</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-500">MAX CART ITEMS</div>
          <div className="font-bold text-slate-200 mt-0.5">{policy.max_cart_items} units</div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="text-[10px] text-slate-500">MAX PER SKU</div>
          <div className="font-bold text-slate-200 mt-0.5">{policy.max_quantity_per_sku} units</div>
        </div>
      </div>

      {/* Real-Time Policy Gate Evaluation Result */}
      {policyDecision && (
        <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold text-slate-300">Policy Gate Decision:</span>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded uppercase ${
                policyDecision.decision === 'ALLOW'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                  : policyDecision.decision === 'REQUIRE_CONFIRMATION'
                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
              }`}
            >
              {policyDecision.decision}
            </span>
          </div>

          {/* Individual Checks Checklist */}
          {policyDecision.checks && policyDecision.checks.length > 0 && (
            <div className="divide-y divide-slate-800/60 text-[11px] font-mono">
              {policyDecision.checks.map((c: any, i: number) => (
                <div key={i} className="py-1.5 flex items-center justify-between">
                  <span className="text-slate-400">{c.check_name || c.check}</span>
                  {c.passed ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                      <Check className="w-3.5 h-3.5" /> Passed
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-400 font-semibold">
                      <X className="w-3.5 h-3.5" /> Blocked
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
