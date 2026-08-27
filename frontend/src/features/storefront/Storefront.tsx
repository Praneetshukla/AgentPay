'use client';

import React from 'react';
import { ShoppingCart, Package, Plus, Minus, ShieldCheck, Sparkles, RefreshCw } from 'lucide-react';

interface Product {
  sku: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: string;
  stock_quantity: number;
  active: boolean;
}

interface StorefrontProps {
  products: Product[];
  cart: Array<{ sku: string; quantity: number; name: string; price: number }>;
  onAddToCart: (product: Product) => void;
  onUpdateQuantity: (sku: string, delta: number) => void;
  onClearCart: () => void;
  onRequestQuote: () => void;
  quoteLoading: boolean;
  activeQuote: any;
}

export function Storefront({
  products,
  cart,
  onAddToCart,
  onUpdateQuantity,
  onClearCart,
  onRequestQuote,
  quoteLoading,
  activeQuote,
}: StorefrontProps) {
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="space-y-6">
      {/* Storefront Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-400" />
            Merchant Product Catalog
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Machine-readable merchant inventory in integer paise.
          </p>
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {products.length} Products Active
        </div>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {products.map((product) => {
          const cartItem = cart.find((i) => i.sku === product.sku);
          const isOutOfStock = product.stock_quantity <= 0;

          return (
            <div
              key={product.sku}
              className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isOutOfStock
                  ? 'border-slate-800/60 bg-slate-900/30 opacity-70'
                  : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                    {product.category}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                      isOutOfStock
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isOutOfStock ? '0 in stock' : `${product.stock_quantity} in stock`}
                  </span>
                </div>

                <h3 className="font-semibold text-slate-200 text-sm mb-1 leading-snug">{product.name}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">{product.description}</p>
                <div className="text-[11px] font-mono text-slate-500 mb-2">SKU: {product.sku}</div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/60 mt-2">
                <div className="text-sm font-bold text-slate-100 font-mono">
                  ₹{(product.price / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </div>

                {cartItem ? (
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-slate-700">
                    <button
                      onClick={() => onUpdateQuantity(product.sku, -1)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 transition"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-mono font-bold text-indigo-400 px-1">{cartItem.quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(product.sku, 1)}
                      disabled={cartItem.quantity >= product.stock_quantity}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300 disabled:opacity-30 transition"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onAddToCart(product)}
                    disabled={isOutOfStock}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Storefront Cart Panel */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-200">Merchant Storefront Cart</h3>
          </div>
          {cart.length > 0 && (
            <button
              onClick={onClearCart}
              className="text-xs text-slate-400 hover:text-rose-400 transition"
            >
              Clear
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-500">
            Cart is empty. Select items above or ask the AI Buyer to build a cart.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto pr-1">
              {cart.map((item) => (
                <div key={item.sku} className="py-2 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-medium text-slate-200">{item.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {item.quantity} × ₹{(item.price / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="font-mono font-semibold text-slate-200">
                    ₹{((item.price * item.quantity) / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Cart Total (Paise):</span>
              <span className="text-base font-bold font-mono text-emerald-400">
                ₹{(cartSubtotal / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <button
              onClick={onRequestQuote}
              disabled={quoteLoading}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
            >
              {quoteLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Generating HMAC Signed Quote...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Request Server-Authoritative Quote
                </>
              )}
            </button>
          </div>
        )}

        {/* Display Active Quote Info if available */}
        {activeQuote && (
          <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/20 text-xs font-mono space-y-1">
            <div className="flex items-center justify-between text-indigo-400 font-bold">
              <span>ACTIVE SERVER QUOTE</span>
              <span>{activeQuote.quote_id}</span>
            </div>
            <div className="text-slate-400 flex justify-between">
              <span>Authoritative Total:</span>
              <span className="text-slate-200 font-bold">₹{(activeQuote.total / 100).toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              HMAC Sig: {activeQuote.signature}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
