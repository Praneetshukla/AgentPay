'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, ShieldCheck, AlertCircle, ArrowDown } from 'lucide-react';
import { AgentTraceStep } from '@/types/agent';

interface ExecutionGraphProps {
  traceSteps: AgentTraceStep[];
  currentStatus: string;
}

const STEP_LABELS: Record<string, { label: string; desc: string }> = {
  parse_intent: { label: '1. Parse Intent', desc: 'LLM extracts structured intent & budget constraints' },
  discover_catalog: { label: '2. Catalog Discovery', desc: 'Queries merchant agent-readable catalog manifest' },
  plan_cart: { label: '3. Cart Formulation', desc: 'Selects optimal candidates from in-stock inventory' },
  request_quote: { label: '4. Server Quote', desc: 'Generates HMAC-SHA256 authoritative server quote' },
  evaluate_policy: { label: '5. Policy Gate', desc: 'Deterministic spending cap & whitelist evaluation' },
  handle_recovery: { label: 'Recovery Loop', desc: 'Autonomous cart pruning & alternative re-selection' },
  execute_checkout: { label: '6. Execution Boundary', desc: 'Calls Razorpay Test Mode Orders API' },
};

export function ExecutionGraph({ traceSteps, currentStatus }: ExecutionGraphProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Live State Machine Execution Graph
        </h3>
        <span className="text-[10px] font-mono text-slate-400">
          {traceSteps.length} Steps Recorded
        </span>
      </div>

      {traceSteps.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
          Awaiting execution run. Trigger a purchase above or run a test scenario.
        </div>
      ) : (
        <div className="space-y-2 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {traceSteps.map((step, idx) => {
            const info = STEP_LABELS[step.node] || { label: step.node, desc: step.action };
            const isLast = idx === traceSteps.length - 1;

            return (
              <div key={idx} className="relative flex items-start gap-3 pl-8 group">
                {/* Node indicator dot */}
                <div
                  className={`absolute left-2.5 top-2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-all ${
                    isLast && currentStatus === 'COMPLETED'
                      ? 'bg-emerald-500 border-emerald-400 shadow-md shadow-emerald-500/50'
                      : isLast && currentStatus === 'REQUIRE_CONFIRMATION'
                      ? 'bg-amber-500 border-amber-400 shadow-md shadow-amber-500/50'
                      : isLast && currentStatus === 'BLOCKED'
                      ? 'bg-rose-500 border-rose-400 shadow-md shadow-rose-500/50'
                      : 'bg-slate-900 border-slate-700 group-hover:border-indigo-500'
                  }`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                </div>

                <div className="flex-1 p-3 rounded-lg border border-slate-800/80 bg-slate-900/60 hover:bg-slate-900/90 transition text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-semibold text-indigo-300">{info.label}</span>
                    <span className="text-[10px] text-slate-500">{new Date(step.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="text-slate-400">{step.action}</div>

                  {step.output_summary && Object.keys(step.output_summary).length > 0 && (
                    <details className="mt-1 pt-1 border-t border-slate-800/60 text-[11px] text-slate-400 cursor-pointer">
                      <summary className="font-mono text-[10px] text-slate-500 hover:text-indigo-400 transition">
                        View Node Payload Output
                      </summary>
                      <pre className="p-2 mt-1 rounded bg-slate-950/80 font-mono text-[10px] overflow-x-auto text-emerald-400/90 border border-slate-800">
                        {JSON.stringify(step.output_summary, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
