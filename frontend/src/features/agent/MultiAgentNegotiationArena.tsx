'use client';

import React, { useState, useEffect } from 'react';
import { OfferComparisonResult, NegotiationRound } from '@/types/agent';

interface MultiAgentNegotiationArenaProps {
  comparison?: OfferComparisonResult | null;
}

export function MultiAgentNegotiationArena({ comparison }: MultiAgentNegotiationArenaProps) {
  const [activeStep, setActiveStep] = useState<number>(0);

  const rounds: NegotiationRound[] = comparison?.negotiation_rounds || [];
  const selectedOffer = comparison?.selected_offer;

  useEffect(() => {
    if (!rounds.length) return;
    setActiveStep(rounds.length - 1);
  }, [rounds.length]);

  if (!comparison || !rounds.length) {
    return null;
  }

  return (
    <div className="glass-panel p-5 rounded-2xl border border-[#4f46e5]/25 bg-linear-to-b from-[#f8faff] to-white shadow-md space-y-4">
      {/* Arena Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#c7c4d8]/20 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#4f46e5] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-lg">forum</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-bold text-sm text-[#0b1c30]">
                Multi-Agent Autonomous Negotiation Arena
              </h3>
              <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10b981]/15 text-[#006c49] border border-[#10b981]/30">
                PROTOCOL: HMAC-BOUNDED
              </span>
            </div>
            <p className="text-[11px] text-[#464555]">
              Real-time bargaining turns executed between Buyer Agent & Merchant Node
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {comparison.actual_savings_paise > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30">
              <span className="material-symbols-outlined text-[#006c49] text-sm">savings</span>
              <span className="text-xs font-mono font-bold text-[#006c49]">
                ₹{(comparison.actual_savings_paise / 100).toFixed(0)} Concession Secured
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Dual Agent Header Badges */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Buyer Agent Persona */}
        <div className="p-3 rounded-xl bg-white border border-[#4f46e5]/20 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#4f46e5]/10 text-[#4f46e5] flex items-center justify-center font-bold text-base shrink-0">
            <span className="material-symbols-outlined text-xl">smart_toy</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#0b1c30]">AgentPay Buyer Agent</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
            </div>
            <p className="text-[10px] text-[#777587] truncate">
              Goal: Maximize spec fit • Zero unauthorized overspend
            </p>
          </div>
        </div>

        {/* Merchant Pricing Agent Persona */}
        <div className="p-3 rounded-xl bg-white border border-[#f59e0b]/30 flex items-center gap-3 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-[#f59e0b]/10 text-[#653e00] flex items-center justify-center font-bold text-base shrink-0">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-[#0b1c30]">
                {selectedOffer?.provider_name || 'Merchant Pricing Node'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse" />
            </div>
            <p className="text-[10px] text-[#777587] truncate">
              Inventory: {selectedOffer?.stock_quantity ?? 0} units • Floor Margin Protected
            </p>
          </div>
        </div>
      </div>

      {/* Dialogue Stream Container */}
      <div className="space-y-3 p-4 rounded-xl bg-slate-900 text-slate-100 font-sans shadow-inner max-h-[320px] overflow-y-auto">
        {rounds.map((r, idx) => {
          const isBuyer = r.speaker === 'BUYER_AGENT';
          return (
            <div
              key={idx}
              className={`flex flex-col ${isBuyer ? 'items-start' : 'items-end'} space-y-1`}
            >
              {/* Speaker Tag */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                <span
                  className={`w-2 h-2 rounded-full ${isBuyer ? 'bg-[#38bdf8]' : 'bg-[#fbbf24]'}`}
                />
                <span className="font-bold text-slate-300">{r.speaker_name}</span>
                <span>• Round {r.round_number}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                  isBuyer
                    ? 'bg-[#1e293b] text-slate-100 rounded-tl-xs border border-[#38bdf8]/30'
                    : 'bg-[#1f2937] text-amber-100 rounded-tr-xs border border-[#fbbf24]/30'
                }`}
              >
                <p>{r.message}</p>
                <div className="mt-2 pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                  <span className="text-slate-400">
                    Strategy: <strong className="text-white">{r.strategy_applied}</strong>
                  </span>
                  <span className="text-emerald-400 font-bold">
                    Target: ₹{(r.proposed_price_paise / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Agreement Status Bar */}
      <div className="p-3 rounded-xl bg-[#eff4ff] border border-[#4f46e5]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4f46e5] text-base">verified_user</span>
          <span className="text-xs font-semibold text-[#0b1c30]">
            Autonomous Concession Agreement Finalized
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-mono">
          <span className="text-[#464555]">Locked Quote Unit Price:</span>
          <span className="font-bold text-[#006c49] text-sm">
            ₹{((selectedOffer?.price_paise || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </div>
  );
}
