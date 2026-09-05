'use client';

import React, { useState, useEffect } from 'react';
import { useMission } from '@/lib/mission-context';
import {
  Sparkles,
  Zap,
  ShoppingBag,
  ShieldCheck,
  Tag,
  Clock,
  ArrowRight,
  TrendingDown,
  Plus,
  Minus,
  CheckCircle,
  Eye,
  SlidersHorizontal,
  Flame,
  Check,
  Package,
} from 'lucide-react';

const CATEGORIES = ['All', 'Keyboards', 'Mice', 'Adapters & Hubs', 'Cameras', 'Audio', 'Desk Accessories'];

const BUNDLE_DEALS = [
  {
    id: 'bundle-creator',
    title: 'Creator Studio Pro Setup',
    badge: 'Popular Bundle',
    discountLabel: 'Save 22%',
    description: 'Keychron K2 Wireless Mechanical Keyboard + 7-in-1 USB-C Multiport Hub',
    skus: ['KB-MECH-001', 'ADP-USB-001'],
    originalPricePaise: 449800,
    bundlePricePaise: 349800,
    savingsPaise: 100000,
    accentColor: 'indigo',
    itemsCount: 2,
  },
  {
    id: 'bundle-ergonomic',
    title: 'Ultra Precision Ergonomic Kit',
    badge: 'Limited Flash Concession',
    discountLabel: 'Save ₹800',
    description: 'Logitech MX Master 3S Wireless Mouse + Anker 4K Webcam 60FPS',
    skus: ['MS-OPT-001', 'CAM-4K-001'],
    originalPricePaise: 679800,
    bundlePricePaise: 599800,
    savingsPaise: 80000,
    accentColor: 'emerald',
    itemsCount: 2,
  },
];

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
  const [sortBy, setSortBy] = useState<'recommended' | 'price_asc' | 'price_desc' | 'stock'>('recommended');
  const [showOnlyInStock, setShowOnlyInStock] = useState(false);
  const [claimedBundleId, setClaimedBundleId] = useState<string | null>(null);

  // Flash Sale Countdown Timer (Simulated Live Engine)
  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 47, seconds: 18 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 3, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const filteredProducts = products
    .filter((p) => {
      const matchesCategory =
        selectedCategory === 'All' ? true : p.category.toLowerCase().includes(selectedCategory.toLowerCase());
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStock = showOnlyInStock ? p.stock_quantity > 0 : true;
      return matchesCategory && matchesSearch && matchesStock;
    })
    .sort((a, b) => {
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'stock') return b.stock_quantity - a.stock_quantity;
      return 0; // recommended default
    });

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const maxBudget = policy?.max_transaction_amount || 500000;
  const remainingHeadroom = Math.max(0, maxBudget - cartSubtotal);
  const budgetUsagePercent = Math.min(100, Math.round((cartSubtotal / maxBudget) * 100));

  const handleClaimBundle = (bundle: typeof BUNDLE_DEALS[0]) => {
    bundle.skus.forEach((sku) => {
      const product = products.find((p) => p.sku === sku);
      if (product) addToCart(product);
    });
    setClaimedBundleId(bundle.id);
    setTimeout(() => setClaimedBundleId(null), 3000);
  };

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
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header & Real-Time Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Autonomous Sales Store
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Inventory
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Direct verified merchant inventory with automated instant-settlement concessions, cryptographic stock holds, and real-time policy headroom validation.
          </p>
        </div>

        {/* Global Live Flash Countdown Banner */}
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-2xl shadow-sm border border-slate-800 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Flash Concession Reset
            </div>
            <div className="text-sm font-mono font-bold tracking-tight text-amber-300">
              {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:
              {String(timeLeft.seconds).padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Bundle & Merchant Concession Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {BUNDLE_DEALS.map((bundle) => {
          const isClaimed = claimedBundleId === bundle.id;
          return (
            <div
              key={bundle.id}
              className={`relative overflow-hidden rounded-3xl border transition-all duration-300 ${
                bundle.accentColor === 'indigo'
                  ? 'border-indigo-100 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-md'
                  : 'border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white shadow-md'
              }`}
            >
              {/* Background ambient lighting */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="p-6 relative z-10 flex flex-col justify-between h-full space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      <Zap className="w-3 h-3 text-indigo-400" />
                      {bundle.badge}
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800/50">
                      {bundle.discountLabel}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold tracking-tight text-white">{bundle.title}</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">{bundle.description}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between gap-4">
                  <div>
                    <div className="text-[10px] font-mono text-slate-400 uppercase">Pre-Negotiated Bundle</div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold font-mono text-emerald-400">
                        ₹{(bundle.bundlePricePaise / 100).toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-mono text-slate-400 line-through">
                        ₹{(bundle.originalPricePaise / 100).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleClaimBundle(bundle)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition flex items-center gap-2 cursor-pointer ${
                      isClaimed
                        ? 'bg-emerald-500 text-white'
                        : 'bg-white text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    {isClaimed ? (
                      <>
                        <Check className="w-4 h-4" />
                        Bundle Added
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                        Claim Bundle
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search, Filter & Mission Context Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Field */}
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-slate-400 text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by hardware name, category, or SKU (e.g. Mechanical, USB-C, KB-MECH-001)..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-slate-600">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
              >
                <option value="recommended">Best Match</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="stock">Stock Level</option>
              </select>
            </div>

            <button
              onClick={() => setShowOnlyInStock(!showOnlyInStock)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 cursor-pointer ${
                showOnlyInStock
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${showOnlyInStock ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              In-Stock Only
            </button>
          </div>
        </div>

        {/* Category Pills & Active Context */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200/80 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {missionGoal && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50/70 px-3 py-1 rounded-lg border border-indigo-100 shrink-0 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              <span>Goal: <strong className="text-slate-900">"{missionGoal}"</strong></span>
            </div>
          )}
        </div>
      </div>

      {/* Main Store Layout: 2 Columns (Products + Real-time Cart Envelope) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Product Cards Grid (Cols 1-8) */}
        <div className="lg:col-span-8">
          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Package className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">No hardware found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No catalog items match your search query "{searchQuery}". Try selecting another category or clear filters.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setShowOnlyInStock(false);
                }}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs hover:bg-slate-800 transition cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filteredProducts.map((product) => {
                const cartItem = cart.find((i) => i.sku === product.sku);
                const isOutOfStock = product.stock_quantity <= 0;
                const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;

                return (
                  <div
                    key={product.sku}
                    className={`group rounded-3xl border transition-all duration-300 flex flex-col justify-between bg-white ${
                      isOutOfStock
                        ? 'border-slate-200/70 bg-slate-50/50 opacity-60'
                        : 'border-slate-200/90 hover:border-indigo-200 hover:shadow-[0_12px_30px_-10px_rgba(79,70,229,0.08)]'
                    }`}
                  >
                    <div className="p-5 space-y-4">
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100/80 px-2.5 py-1 rounded-lg">
                          {product.category}
                        </span>

                        <span
                          className={`text-[10px] font-mono font-medium px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'
                            }`}
                          />
                          {isOutOfStock ? 'Out of Stock' : `${product.stock_quantity} available`}
                        </span>
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3
                          onClick={() => setSelectedProductDetail(product)}
                          className="font-bold text-slate-900 text-sm leading-snug hover:text-indigo-600 cursor-pointer transition line-clamp-1"
                        >
                          {product.name}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed mt-1">
                          {product.description}
                        </p>
                      </div>

                      {/* Headroom / Policy Verification Pill */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Policy Compliant</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400">SKU: {product.sku}</span>
                      </div>
                    </div>

                    {/* Bottom Action Bar */}
                    <div className="p-5 pt-0 mt-auto border-t border-slate-100 flex items-center justify-between pt-4">
                      <div>
                        <div className="text-[10px] font-mono text-slate-400">Authoritative Price</div>
                        <div className="text-lg font-bold font-mono text-slate-900 tracking-tight">
                          ₹{(product.price / 100).toLocaleString('en-IN')}
                        </div>
                      </div>

                      {cartItem ? (
                        <div className="flex items-center gap-2 bg-slate-900 text-white rounded-xl p-1 shadow-xs">
                          <button
                            onClick={() => updateQuantity(product.sku, -1)}
                            className="p-1 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5 text-slate-300" />
                          </button>
                          <span className="text-xs font-mono font-bold px-2 text-white">{cartItem.quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.sku, 1)}
                            disabled={cartItem.quantity >= product.stock_quantity}
                            className="p-1 hover:bg-slate-800 rounded-lg transition disabled:opacity-30 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-slate-300" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedProductDetail(product)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                            title="Inspect Hardware Specs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => addToCart(product)}
                            disabled={isOutOfStock}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add to Cart
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Procurement Cart & Authority Envelope (Cols 9-12) */}
        <div className="lg:col-span-4 sticky top-24 space-y-4">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Procurement Cart</h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    {cart.reduce((s, i) => s + i.quantity, 0)} items selected
                  </p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-700 transition cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <ShoppingBag className="w-5 h-5 opacity-40" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">Your cart is empty</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Select hardware from the catalog or claim a flash bundle to review under policy headroom.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Cart Items List */}
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1 space-y-2">
                  {cart.map((item) => (
                    <div key={item.sku} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs">
                      <div className="space-y-0.5 max-w-[170px]">
                        <div className="font-semibold text-slate-900 truncate" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.quantity} × ₹{(item.price / 100).toFixed(0)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-slate-900">
                          ₹{((item.price * item.quantity) / 100).toLocaleString('en-IN')}
                        </div>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <button
                            onClick={() => updateQuantity(item.sku, -1)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded bg-slate-100"
                          >
                            -
                          </button>
                          <span className="text-[10px] font-mono text-slate-700">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.sku, 1)}
                            className="text-[10px] text-slate-400 hover:text-slate-700 px-1 py-0.5 rounded bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Authority Ceiling & Headroom Progress Gauge */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-medium text-slate-500">Cart Total</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      ₹{(cartSubtotal / 100).toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        budgetUsagePercent > 90
                          ? 'bg-rose-500'
                          : budgetUsagePercent > 70
                          ? 'bg-amber-500'
                          : 'bg-indigo-600'
                      }`}
                      style={{ width: `${budgetUsagePercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                    <span>Ceiling: ₹{(maxBudget / 100).toLocaleString('en-IN')}</span>
                    <span className="text-emerald-700 font-bold">
                      Headroom: ₹{(remainingHeadroom / 100).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Checkout & Guardian Review CTA */}
                <button
                  onClick={handleReviewInGuardian}
                  disabled={quoteLoading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  {quoteLoading ? (
                    <span className="flex items-center gap-2 font-mono">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Locking Cryptographic Quote...
                    </span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Review in Transaction Guardian
                      <ArrowRight className="w-3.5 h-3.5" />
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
