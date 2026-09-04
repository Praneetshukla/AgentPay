'use client';

import React, { useState } from 'react';
import { useMission } from '@/lib/mission-context';

const CATEGORIES = ['All', 'Keyboards', 'Mice', 'Adapters & Hubs', 'Cameras', 'Audio', 'Desk Accessories'];

export function Storefront() {
  const {
    products,
    cart,
    addToCart,
    updateQuantity,
    clearCart,
    requestAuthoritativeQuote,
    quoteLoading,
    activeQuote,
    setIsGuardianOpen,
    setSelectedProductDetail,
    policy,
    missionGoal,
  } = useMission();

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = products.filter((p) => {
    const matchesCategory =
      selectedCategory === 'All' ? true : p.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const maxBudget = policy?.max_transaction_amount || 500000;
  const remainingHeadroom = Math.max(0, maxBudget - cartSubtotal);

  const handleReviewInGuardian = async () => {
    if (cart.length === 0) return;
    try {
      if (!activeQuote) {
        await requestAuthoritativeQuote();
      }
      setIsGuardianOpen(true);
    } catch (err) {
      console.error('Error locking quote for guardian', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Active Context Banner (Stitch Discovery Header) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c7c4d8]/20 pb-4">
        <div>
          <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">Discover Opportunities</h2>
          <p className="text-xs text-[#464555] mt-0.5">
            The agent monitors catalog assets matching active mission parameters. Override or direct search below.
          </p>
        </div>

        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#777587] text-base pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search catalog or ask agent..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#c7c4d8]/30 text-xs text-[#0b1c30] placeholder:text-[#777587] focus:outline-none focus:ring-1 focus:ring-[#4f46e5] shadow-2xs"
          />
        </div>
      </div>

      {/* Active Context Filter Card (Stitch Style) */}
      <div className="p-4 rounded-xl bg-white border border-[#4f46e5]/20 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f59e0b]/10 text-[#f59e0b] flex items-center justify-center font-bold">
            <span className="material-symbols-outlined text-sm">filter_alt</span>
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold text-[#777587] uppercase">Active Context</div>
            <div className="text-xs font-semibold text-[#0b1c30]">
              {missionGoal ? (
                <>
                  Filtering for <strong className="text-[#4f46e5]">"{missionGoal}"</strong>
                </>
              ) : (
                'All verified catalog peripherals'
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#006c49] bg-[#10b981]/10 px-3 py-1 rounded-full border border-[#10b981]/20">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
          {products.length} Products Active
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              selectedCategory === cat
                ? 'bg-[#4f46e5] text-white shadow-sm'
                : 'bg-white border border-[#c7c4d8]/30 text-[#464555] hover:text-[#0b1c30] hover:bg-[#eff4ff]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 2-Column Layout: Grid + Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Product Cards (Col 1-8) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredProducts.map((product) => {
            const cartItem = cart.find((i) => i.sku === product.sku);
            const isOutOfStock = product.stock_quantity <= 0;

            return (
              <div
                key={product.sku}
                className={`glass-panel p-5 rounded-2xl transition-all duration-200 flex flex-col justify-between border border-[#c7c4d8]/20 ${
                  isOutOfStock ? 'opacity-60 bg-[#f8f9ff]/50' : 'hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#4f46e5] bg-[#4f46e5]/10 px-2 py-0.5 rounded-lg">
                      {product.category}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-lg ${
                        isOutOfStock
                          ? 'bg-[#ba1a1a]/10 text-[#ba1a1a] border border-[#ba1a1a]/20'
                          : 'bg-[#eff4ff] text-[#464555]'
                      }`}
                    >
                      {isOutOfStock ? 'Out of stock' : `${product.stock_quantity} available`}
                    </span>
                  </div>

                  <h3
                    onClick={() => setSelectedProductDetail(product)}
                    className="font-heading font-bold text-[#0b1c30] text-sm mb-1 leading-snug hover:text-[#4f46e5] cursor-pointer transition"
                  >
                    {product.name}
                  </h3>
                  <p className="text-xs text-[#464555] line-clamp-2 leading-relaxed mb-3">{product.description}</p>
                </div>

                {/* Budget Alignment Badge */}
                <div className="p-2.5 rounded-xl bg-[#10b981]/5 border border-[#10b981]/20 text-[11px] text-[#006c49] font-medium mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-xs">verified</span>
                  Fits Mission Headroom
                </div>

                <div className="pt-3 border-t border-[#c7c4d8]/20 flex items-center justify-between">
                  <div>
                    <div className="text-base font-bold font-mono text-[#0b1c30]">
                      ₹{(product.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </div>
                    <div className="text-[10px] font-mono text-[#777587]">SKU: {product.sku}</div>
                  </div>

                  {cartItem ? (
                    <div className="flex items-center gap-2 bg-[#eff4ff] rounded-xl p-1 border border-[#c7c4d8]/30">
                      <button
                        onClick={() => updateQuantity(product.sku, -1)}
                        className="p-1 hover:bg-[#dce9ff] rounded-lg text-[#0b1c30] transition"
                      >
                        <span className="material-symbols-outlined text-sm block">remove</span>
                      </button>
                      <span className="text-xs font-mono font-bold text-[#4f46e5] px-1">{cartItem.quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.sku, 1)}
                        disabled={cartItem.quantity >= product.stock_quantity}
                        className="p-1 hover:bg-[#dce9ff] rounded-lg text-[#0b1c30] disabled:opacity-30 transition"
                      >
                        <span className="material-symbols-outlined text-sm block">add</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedProductDetail(product)}
                        className="p-2 rounded-xl bg-white border border-[#c7c4d8]/30 hover:border-[#4f46e5] text-[#777587] hover:text-[#4f46e5] transition"
                        title="View Intelligence Detail"
                      >
                        <span className="material-symbols-outlined text-xs block">visibility</span>
                      </button>
                      <button
                        onClick={() => addToCart(product)}
                        disabled={isOutOfStock}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#4f46e5] hover:bg-[#3525cd] text-white disabled:bg-[#d8dae0] disabled:text-[#777587] disabled:cursor-not-allowed transition shadow-sm"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Live Procurement Cart (Col 9-12) */}
        <div className="lg:col-span-4 sticky top-20">
          <div className="authority-envelope rounded-2xl p-6 space-y-5 border border-[#4f46e5]/15 shadow-sm">
            <div className="flex items-center justify-between border-b border-[#c7c4d8]/20 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4f46e5]">shopping_basket</span>
                <h3 className="font-heading font-bold text-sm text-[#0b1c30]">Procurement Cart</h3>
              </div>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-[#777587] hover:text-[#ba1a1a] transition">
                  Clear
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <span className="material-symbols-outlined text-4xl text-[#777587] opacity-40">shopping_bag</span>
                <p className="text-xs text-[#464555] font-medium">Cart is currently empty.</p>
                <p className="text-[11px] text-[#777587]">Select items or instruct the AI Agent.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-[#c7c4d8]/20 max-h-56 overflow-y-auto pr-1">
                  {cart.map((item) => (
                    <div key={item.sku} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-[#0b1c30]">{item.name}</div>
                        <div className="text-[11px] text-[#777587] font-mono">
                          {item.quantity} × ₹{(item.price / 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="font-mono font-bold text-[#0b1c30]">
                        ₹{((item.price * item.quantity) / 100).toFixed(0)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Headroom Bar */}
                <div className="p-3.5 rounded-xl bg-[#eff4ff] border border-[#c7c4d8]/20 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#464555]">Cart Total:</span>
                    <span className="text-[#0b1c30] font-bold text-sm">
                      ₹{(cartSubtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#464555]">
                    <span>Authority Cap: ₹{(maxBudget / 100).toFixed(0)}</span>
                    <span className="text-[#006c49] font-bold">
                      Headroom: ₹{(remainingHeadroom / 100).toFixed(0)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleReviewInGuardian}
                  disabled={quoteLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4f46e5] hover:bg-[#3525cd] text-white text-xs font-heading font-bold shadow-sm transition disabled:opacity-50"
                >
                  {quoteLoading ? (
                    'Locking Server Quote...'
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      Review in Transaction Guardian
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
