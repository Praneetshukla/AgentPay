'use client';

import React from 'react';
import { useMission } from '@/lib/mission-context';
import {
  ArrowLeft,
  ShieldCheck,
  Cpu,
  Zap,
  CheckCircle2,
  Plus,
  Lock,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedProductDetail(null)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Sales Store
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-mono text-slate-500 uppercase">{product.category}</span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-bold text-slate-900 truncate max-w-xs">{product.name}</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Server Verified
          </span>
          <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            SKU: {product.sku}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Specifications & Hardware Details */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm space-y-6">
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100">
                <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                {product.category}
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                {product.name}
              </h1>
              <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                {product.description}
              </p>
            </div>

            {/* Hardware Architecture Grid */}
            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider mb-4">
                Verified Hardware Specifications
              </h4>

              {product.attributes && Object.keys(product.attributes).length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(product.attributes).map(([key, val], idx) => {
                    const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                    const formattedVal = Array.isArray(val) ? val.join(', ') : typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val);

                    return (
                      <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">
                          {formattedKey}
                        </div>
                        <div className="text-xs font-bold text-slate-900 truncate" title={formattedVal}>
                          {formattedVal}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Inventory</div>
                    <div className="text-xs font-bold text-slate-900">{product.stock_quantity} units ready</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Settlement</div>
                    <div className="text-xs font-bold text-emerald-600">Instant HMAC lock</div>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Condition</div>
                    <div className="text-xs font-bold text-slate-900">Brand New OEM</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Policy Envelope & Add Action */}
        <div className="lg:col-span-4 space-y-5">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-6">
            <div>
              <div className="text-[10px] font-mono text-slate-400 uppercase">Authoritative Price</div>
              <div className="text-3xl font-bold font-mono text-slate-900 tracking-tight mt-1">
                ₹{priceRupees}
              </div>
            </div>

            {/* Budget Impact Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Headroom Utilization</span>
                <span className="font-mono font-bold text-slate-900">{spendPercentage}%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                  style={{ width: `${spendPercentage}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Remaining Headroom:</span>
                <span className="text-emerald-700 font-bold">₹{remainingRupees}</span>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                onClick={handleAddAndBack}
                disabled={product.stock_quantity <= 0}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition disabled:bg-slate-200 disabled:text-slate-400 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add to Cart & Return
              </button>

              <button
                onClick={() => setSelectedProductDetail(null)}
                className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition cursor-pointer"
              >
                Continue Browsing
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
