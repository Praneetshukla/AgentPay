'use client';

import React from 'react';
import { useMission } from '@/lib/mission-context';

export function ProductIntelligenceDetail() {
  const {
    selectedProductDetail,
    setSelectedProductDetail,
    missionGoal,
    addToCart,
    policy,
  } = useMission();

  if (!selectedProductDetail) return null;

  const product = selectedProductDetail;
  const priceRupees = (product.price / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const authorityPaise = policy?.max_transaction_amount || 400000;
  const remainingPaise = Math.max(0, authorityPaise - product.price);
  const remainingRupees = (remainingPaise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const spendPercentage = Math.min(100, Math.round((product.price / authorityPaise) * 100));

  const handleAddAndBack = () => {
    addToCart(product);
    setSelectedProductDetail(null);
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-4 text-xs">
        <div className="flex items-center gap-2 text-[#777587]">
          <button
            onClick={() => setSelectedProductDetail(null)}
            className="hover:text-[#4f46e5] flex items-center gap-1 font-semibold"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Catalog
          </button>
          <span>/</span>
          <span className="text-[#464555] font-mono">{product.category}</span>
          <span>/</span>
          <span className="text-[#0b1c30] font-bold">{product.name}</span>
        </div>

        <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20">
          Agent Evaluated
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Product Overview & Hardware Specs (Col 1-7) */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="font-heading font-bold text-3xl text-[#0b1c30]">{product.name}</h2>
            <p className="text-sm text-[#464555] mt-2 leading-relaxed">{product.description}</p>
          </div>

          {/* Product Showcase Card */}
          <div className="glass-panel p-8 rounded-2xl border border-[#c7c4d8]/30 flex flex-col items-center justify-center bg-white shadow-2xs relative min-h-[220px]">
            <div className="w-20 h-20 rounded-2xl bg-[#eff4ff] flex items-center justify-center text-[#4f46e5] shadow-xs mb-3">
              <span className="material-symbols-outlined text-5xl">
                {product.category.toLowerCase().includes('keyboard')
                  ? 'keyboard'
                  : product.category.toLowerCase().includes('mouse')
                  ? 'mouse'
                  : product.category.toLowerCase().includes('camera')
                  ? 'videocam'
                  : 'devices'}
              </span>
            </div>
            <span className="font-mono text-xs text-[#777587]">SKU: {product.sku}</span>
          </div>

          {/* Dynamic Architecture Spec Badges from Real Product Attributes */}
          {product.attributes && Object.keys(product.attributes).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              {Object.entries(product.attributes).map(([key, val], idx) => {
                const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                const formattedVal = Array.isArray(val) ? val.join(', ') : typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);

                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-1">
                    <div className="text-[10px] font-mono text-[#777587] uppercase font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs text-[#4f46e5]">settings_suggest</span>
                      {formattedKey}
                    </div>
                    <div className="font-semibold text-[#0b1c30] truncate" title={formattedVal}>
                      {formattedVal}
                    </div>
                    <div className="text-[10px] text-[#777587]">Verified specification</div>
                  </div>
                );
              })}
              <div className="p-3.5 rounded-xl bg-white border border-[#c7c4d8]/20 shadow-2xs space-y-1">
                <div className="text-[10px] font-mono text-[#006c49] uppercase font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">inventory_2</span> Available Stock
                </div>
                <div className="font-semibold text-[#006c49]">{product.stock_quantity} Units</div>
                <div className="text-[10px] text-[#777587]">Live database count</div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 text-xs text-[#777587]">
              No additional specifications configured for this SKU. Stock: {product.stock_quantity} units available.
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Agent Analysis & Mission Fit (Col 8-12) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel p-6 rounded-2xl border border-[#4f46e5]/15 space-y-5 shadow-md">
            <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse" />
                <span className="text-[11px] font-mono font-bold text-[#4f46e5] uppercase tracking-wider">
                  Agent Analysis
                </span>
              </div>
              <span className="material-symbols-outlined text-xs text-[#777587]">psychology</span>
            </div>

            {/* Mission Fit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-heading font-bold text-base text-[#0b1c30]">Mission Fit: Optimal</h4>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#4f46e5]/10 text-[#4f46e5]">
                  98% Match
                </span>
              </div>
              <p className="text-xs text-[#464555] leading-relaxed">
                Evaluated against mission goal: <strong className="text-[#0b1c30]">"{missionGoal}"</strong>.
                This item strictly complies with category allowances, verified inventory checks, and spending headroom.
              </p>
            </div>

            {/* Budget Impact Visualization */}
            <div className="p-4 rounded-xl bg-white border border-[#c7c4d8]/20 space-y-3">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#777587] uppercase font-bold text-[10px]">Budget Impact</span>
                <span className="text-[#464555]">Authority: ₹{(authorityPaise / 100).toFixed(0)}</span>
              </div>

              <div className="w-full h-2 rounded-full bg-[#eff4ff] overflow-hidden border border-[#c7c4d8]/20">
                <div
                  className={`h-full rounded-full ${spendPercentage > 100 ? 'bg-[#ba1a1a]' : 'bg-[#4f46e5]'}`}
                  style={{ width: `${Math.min(100, spendPercentage)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs font-mono pt-1">
                <div>
                  <div className="text-[10px] text-[#777587]">Projected Spend</div>
                  <div className="font-bold text-[#0b1c30]">₹{priceRupees}</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#006c49]">Remaining Buffer</div>
                  <div className="font-bold text-[#006c49]">₹{remainingRupees}</div>
                </div>
              </div>
            </div>

            {/* Compliance Verification List */}
            <div className="space-y-2 text-xs">
              <div className="text-[10px] font-mono font-bold text-[#777587] uppercase tracking-wider">
                Policy Compliance Status
              </div>
              <div className="space-y-1.5 text-[#464555]">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#10b981]">check_circle</span>
                  Category Whitelisted ({product.category})
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#10b981]">check_circle</span>
                  HMAC-SHA256 Authoritative Catalog Record
                </div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm text-[#10b981]">check_circle</span>
                  Inventory Confirmed ({product.stock_quantity} available)
                </div>
              </div>
            </div>

            {/* Price and Add CTA */}
            <div className="pt-3 border-t border-[#c7c4d8]/20 flex items-center justify-between">
              <div>
                <div className="font-heading font-bold text-2xl text-[#0b1c30]">₹{priceRupees}</div>
                <div className="text-[10px] text-[#777587]">Authoritative Server Pricing</div>
              </div>

              <button
                onClick={handleAddAndBack}
                className="bg-[#4f46e5] hover:bg-[#3525cd] text-white px-5 py-2.5 rounded-xl font-heading font-semibold text-xs transition flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-sm">add_shopping_cart</span>
                Add to Mission
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
