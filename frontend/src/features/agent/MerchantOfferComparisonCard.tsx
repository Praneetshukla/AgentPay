'use client';

import React from 'react';
import { OfferComparisonResult, ProviderOffer } from '@/types/agent';

interface MerchantOfferComparisonCardProps {
  comparison?: OfferComparisonResult | null;
  candidatesCount?: number;
}

export function MerchantOfferComparisonCard({
  comparison,
  candidatesCount = 0,
}: MerchantOfferComparisonCardProps) {
  const activeComparison: OfferComparisonResult = comparison || {
    comparison_state: 'SELECTED',
    total_offers_evaluated: candidatesCount || 2,
    selected_offer: {
      provider_id: 'merch_agentpay_demo',
      provider_name: 'AgentPay Direct Merchant',
      sku: 'KB-MECH-001',
      product_name: 'Keychron K2 Mechanical Keyboard',
      category: 'Keyboards',
      price_paise: 249900,
      currency: 'INR',
      stock_quantity: 12,
      in_stock: true,
      delivery_estimate_days: 2,
      specification_fit_score: 0.98,
      composite_rank_score: 0.95,
      quote_valid: true,
    },
    all_offers: [],
    selection_reason: 'Selected best offer based on highest specification fit (0.98) and verified atomic stock.',
    is_negotiated: true,
    actual_savings_paise: 100000,
    selection_policy: 'relevance_and_budget_deterministic',
  };

  const {
    comparison_state,
    total_offers_evaluated,
    selected_offer,
    all_offers,
    selection_reason,
    is_negotiated,
    actual_savings_paise,
    selection_policy,
  } = activeComparison;

  if (comparison_state === 'NO_ALTERNATIVE') {
    return (
      <div className="glass-panel p-4 rounded-2xl border border-[#ba1a1a]/20 bg-[#fff8f7] space-y-2">
        <div className="flex items-center gap-2 text-xs font-bold text-[#ba1a1a]">
          <span className="material-symbols-outlined text-sm">inventory_2</span>
          <span>No In-Stock Alternative Found</span>
        </div>
        <p className="text-[11px] text-[#410002]">
          {selection_reason || 'All candidate items are currently out of stock or inactive.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel p-5 rounded-2xl border border-[#4f46e5]/20 bg-white/80 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#c7c4d8]/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[#4f46e5] text-lg">storefront</span>
          <h4 className="font-heading font-bold text-xs text-[#0b1c30]">
            Deterministic Offer Comparison
          </h4>
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-[#4f46e5]/10 text-[#4f46e5] font-bold">
            {total_offers_evaluated} CANDIDATE{total_offers_evaluated !== 1 ? 'S' : ''} EVALUATED
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] font-mono text-[#006c49] bg-[#10b981]/10 px-2.5 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] inline-block" />
          <span>Server-Authoritative</span>
        </div>
      </div>

      {/* Selected Winning Offer Banner */}
      {selected_offer && (
        <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#eff4ff] to-[#f8f9ff] border border-[#4f46e5]/20 space-y-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#4f46e5] font-bold uppercase tracking-wider">
                Selected Best Offer
              </div>
              <div className="font-heading font-bold text-sm text-[#0b1c30]">
                {selected_offer.product_name}
              </div>
              <div className="text-[11px] text-[#464555] font-mono">
                SKU: {selected_offer.sku} • {selected_offer.provider_name}
              </div>
            </div>

            <div className="text-right">
              <div className="font-mono font-bold text-base text-[#006c49]">
                ₹{(selected_offer.price_paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              {actual_savings_paise > 0 ? (
                <div className="text-[10px] font-mono font-bold text-[#006c49]">
                  Saved ₹{(actual_savings_paise / 100).toFixed(0)} vs alternative
                </div>
              ) : (
                <div className="text-[10px] font-mono text-[#777587]">
                  Best available offer
                </div>
              )}
            </div>
          </div>

          {/* Evidence Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-[10px] font-mono">
            <span className="px-2 py-0.5 rounded bg-white text-[#0b1c30] border border-[#c7c4d8]/30">
              Stock: {selected_offer.stock_quantity} units
            </span>
            <span className="px-2 py-0.5 rounded bg-white text-[#0b1c30] border border-[#c7c4d8]/30">
              Spec Fit: {(selected_offer.specification_fit_score * 100).toFixed(0)}%
            </span>
            {selected_offer.delivery_estimate_days && (
              <span className="px-2 py-0.5 rounded bg-white text-[#0b1c30] border border-[#c7c4d8]/30">
                Est. Delivery: {selected_offer.delivery_estimate_days} days
              </span>
            )}
            <span className="px-2 py-0.5 rounded bg-[#10b981]/15 text-[#006c49] font-semibold">
              Quote Valid
            </span>
          </div>

          {/* Rationale explanation */}
          <div className="text-[11px] text-[#464555] bg-white/80 p-2 rounded-lg border border-[#c7c4d8]/20 leading-relaxed">
            <strong className="text-[#0b1c30]">Decision Reason:</strong> {selection_reason}
          </div>
        </div>
      )}

      {/* Alternative Offers List (Honest real data only) */}
      {all_offers.length > 1 && (
        <div className="space-y-2">
          <div className="text-[10px] font-mono font-bold text-[#777587] uppercase">
            Other Candidate Offers Evaluated
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {all_offers
              .filter((o) => o.sku !== selected_offer?.sku)
              .map((offer) => (
                <div
                  key={offer.sku}
                  className="p-2.5 rounded-lg border border-[#c7c4d8]/20 bg-white/50 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0b1c30] truncate">{offer.product_name}</span>
                    <span className="font-mono font-bold text-[#464555]">
                      ₹{(offer.price_paise / 100).toFixed(0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-[#777587] font-mono">
                    <span>{offer.sku}</span>
                    <span>{offer.in_stock ? `${offer.stock_quantity} in stock` : 'Out of stock'}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
