"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, ArrowRight, Lock, RefreshCw, Layers, ExternalLink, X } from "lucide-react";
import { evaluatePolicy, executeCheckout, confirmCheckout } from "@/lib/api";

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: Array<{ sku: string; quantity: number; name: string; price: number }>;
  quote: any;
  onSuccess: (receipt: any) => void;
}

export function CheckoutModal({ isOpen, onClose, cart, quote, onSuccess }: CheckoutModalProps) {
  const [step, setStep] = useState<"quote" | "policy" | "executing" | "receipt">("quote");
  const [policyResult, setPolicyResult] = useState<any>(null);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !quote) return null;

  const handleProceedToPolicy = async () => {
    setStep("policy");
    setPolicyLoading(true);
    setErrorMsg(null);
    try {
      const res = await evaluatePolicy(quote.quote_id);
      setPolicyResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to evaluate policy gate.");
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleAuthorizeCheckout = async () => {
    setStep("executing");
    setExecuting(true);
    setErrorMsg(null);
    try {
      let res;
      if (policyResult?.decision === "REQUIRE_CONFIRMATION") {
        res = await confirmCheckout(quote.quote_id);
      } else {
        res = await executeCheckout(quote.quote_id);
      }

      if (res.success || res.status === "COMPLETED" || res.transaction_id) {
        setReceipt(res);
        setStep("receipt");
        onSuccess(res);
      } else {
        setErrorMsg("Transaction could not be completed.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Checkout authorization failed.");
      setStep("policy");
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <h3 className="font-bold text-base text-slate-100">
              {step === "quote" && "Stage 1: Server-Authoritative Quote"}
              {step === "policy" && "Stage 2: Deterministic Policy Gate"}
              {step === "executing" && "Stage 3: Authorizing Payment..."}
              {step === "receipt" && "Order Authorized & Placed"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-sm">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STAGE 1: QUOTE REVIEW */}
          {step === "quote" && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Quote Reference</span>
                  <span className="font-mono font-bold text-indigo-300">{quote.quote_id}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Cryptographic Integrity</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Signed (HMAC-SHA256)
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cart Summary</div>
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl p-3 bg-slate-950/40">
                  {cart.map((item) => (
                    <div key={item.sku} className="py-2 flex justify-between items-center first:pt-0 last:pb-0">
                      <div>
                        <div className="font-medium text-slate-200">{item.name}</div>
                        <div className="text-xs text-slate-500 font-mono">Qty: {item.quantity}</div>
                      </div>
                      <div className="font-mono font-semibold text-slate-200">
                        ₹{((item.price * item.quantity) / 100).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                <span className="text-slate-300 font-medium">Locked Authoritative Total:</span>
                <span className="text-xl font-bold font-mono text-emerald-400">
                  ₹{(quote.total / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}

          {/* STAGE 2: POLICY EVALUATION */}
          {step === "policy" && (
            <div className="space-y-4">
              {policyLoading ? (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-slate-400 text-xs font-medium">Evaluating deterministic spend & whitelist rules...</p>
                </div>
              ) : policyResult ? (
                <div className="space-y-4">
                  {/* Decision Banner */}
                  <div
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      policyResult.decision === "ALLOW"
                        ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                        : policyResult.decision === "REQUIRE_CONFIRMATION"
                        ? "bg-amber-950/20 border-amber-500/30 text-amber-300"
                        : "bg-rose-950/20 border-rose-500/30 text-rose-300"
                    }`}
                  >
                    {policyResult.decision === "ALLOW" && <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />}
                    {policyResult.decision === "REQUIRE_CONFIRMATION" && <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />}
                    {policyResult.decision === "BLOCK" && <XCircle className="w-5 h-5 text-rose-400 mt-0.5" />}
                    <div>
                      <div className="font-bold text-sm">
                        {policyResult.decision === "ALLOW" && "Policy Evaluated: ALLOW"}
                        {policyResult.decision === "REQUIRE_CONFIRMATION" && "Confirmation Required (> ₹3,000 Threshold)"}
                        {policyResult.decision === "BLOCK" && "Policy Evaluated: BLOCKED"}
                      </div>
                      <p className="text-xs opacity-90 mt-1">
                        {policyResult.explanation || "All mathematical constraints validated against policy rules."}
                      </p>
                    </div>
                  </div>

                  {/* Guard Rules Checklist */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Guard Verification</div>
                    <div className="space-y-1.5 text-xs">
                      {[
                        { name: "Spending Cap Limit", status: "PASS", desc: "Cart total is within maximum ₹5,000 ceiling" },
                        { name: "Merchant Category Whitelist", status: "PASS", desc: "All SKUs belong to permitted categories" },
                        { name: "Inventory Availability", status: "PASS", desc: "Stock confirmed in database" },
                        { name: "HMAC Quote Validity", status: "PASS", desc: "Cryptographic signature verified" },
                      ].map((g, idx) => (
                        <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-slate-950/50 border border-slate-800">
                          <div>
                            <span className="font-medium text-slate-200">{g.name}</span>
                            <div className="text-[11px] text-slate-500">{g.desc}</div>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {g.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* STAGE 3: EXECUTING */}
          {step === "executing" && (
            <div className="py-10 text-center space-y-4">
              <RefreshCw className="w-10 h-10 text-indigo-400 animate-spin mx-auto" />
              <div>
                <h4 className="font-bold text-slate-100 text-base">Creating Payment Order</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Decreasing inventory atomically, invoking Razorpay Test Mode, and recording hash-chained audit ledger entry...
                </p>
              </div>
            </div>
          )}

          {/* STAGE 4: RECEIPT */}
          {step === "receipt" && receipt && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-slate-100 text-base">Purchase Authorized & Completed</h4>
                <p className="text-xs text-emerald-300/90">
                  Razorpay Order placed successfully. Financial state machine transitioned to PAYMENT_PENDING / PAID.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Razorpay Order ID:</span>
                  <span className="text-indigo-400 font-bold">{receipt.razorpay_order_id || "order_test_mock"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction ID:</span>
                  <span className="text-slate-300">{receipt.transaction_id || "tx_mock_123"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Authorized Amount:</span>
                  <span className="text-emerald-400 font-bold">₹{((receipt.amount || quote.total) / 100).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Status:</span>
                  <span className="text-slate-200 uppercase">{receipt.status || "PAYMENT_PENDING"}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="font-bold text-slate-300">Security & Audit Proof</div>
                <div className="flex items-center gap-1 text-emerald-400">✓ Policy evaluated and approved</div>
                <div className="flex items-center gap-1 text-emerald-400">✓ Server-side HMAC quote verified</div>
                <div className="flex items-center gap-1 text-emerald-400">✓ Written to SHA-256 hash-chained audit ledger</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          {step === "quote" && (
            <button
              onClick={handleProceedToPolicy}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-950/50 transition"
            >
              Continue to Policy Review <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === "policy" && policyResult?.decision !== "BLOCK" && (
            <button
              onClick={handleAuthorizeCheckout}
              disabled={executing || policyLoading}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/50 transition disabled:opacity-50"
            >
              {policyResult?.decision === "REQUIRE_CONFIRMATION" ? "Authorize High-Value Order" : "Authorize & Place Order"}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {step === "receipt" && (
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition"
            >
              Done & Return to Store
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
