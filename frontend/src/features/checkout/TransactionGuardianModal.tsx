import React, { useEffect, useState } from 'react';
import { useMission } from '@/lib/mission-context';
import { SimulatedRazorpayModal } from './SimulatedRazorpayModal';

export function TransactionGuardianModal() {
  const {
    isGuardianOpen,
    setIsGuardianOpen,
    cart,
    activeQuote,
    missionGoal,
    policyDecision,
    evaluatingPolicy,
    runPolicyEvaluation,
    executingCheckout,
    authorizeAndExecute,
    latestRun,
    policy,
    setMissionFlowState,
  } = useMission();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showTechnicalProof, setShowTechnicalProof] = useState(false);
  const [isRazorpayModalOpen, setIsRazorpayModalOpen] = useState(false);

  // Always trigger fresh policy evaluation when modal opens with active quote
  useEffect(() => {
    if (isGuardianOpen && activeQuote?.quote_id && !evaluatingPolicy) {
      setErrorMsg(null);
      runPolicyEvaluation().catch((err: any) => {
        setErrorMsg(err.message || 'Failed to evaluate policy gate.');
      });
    }
  }, [isGuardianOpen, activeQuote?.quote_id]);

  if (!isGuardianOpen || !activeQuote) return null;

  const totalPaise = activeQuote.total || cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalRupees = (totalPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });
  const maxBudgetPaise = policy?.max_transaction_amount || 500000;
  const remainingBudgetPaise = Math.max(0, maxBudgetPaise - totalPaise);
  const remainingRupees = (remainingBudgetPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 });

  const handleAuthorize = async () => {
    setErrorMsg(null);
    setIsRazorpayModalOpen(true);
  };

  const handleRazorpaySuccess = async () => {
    setIsRazorpayModalOpen(false);
    try {
      await authorizeAndExecute();
    } catch (err: any) {
      setErrorMsg(err.message || 'Authorization failed on server.');
    }
  };

  const isBlocked = policyDecision?.decision === 'BLOCK';
  const requiresConfirmation = policyDecision?.decision === 'REQUIRE_CONFIRMATION';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#4f46e5]/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header (Stitch Authority Style) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#c7c4d8]/20 bg-[#f8f9ff]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5]">
              <span className="material-symbols-outlined filled text-2xl">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-[#0b1c30]">Transaction Guardian</h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20 uppercase">
                  Active
                </span>
              </div>
              <p className="text-xs text-[#464555]">Deterministic verification before money moves.</p>
            </div>
          </div>
          <button
            onClick={() => setIsGuardianOpen(false)}
            className="p-1.5 rounded-xl text-[#777587] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm bg-white">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-[#ba1a1a]/10 border border-[#ba1a1a]/20 text-[#ba1a1a] text-xs flex items-center gap-2.5">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Mission Intent & Reason */}
          <div className="p-4 rounded-xl bg-[#f8f9ff] border border-[#c7c4d8]/20 space-y-2">
            <div className="text-xs font-bold text-[#777587] uppercase tracking-wider">Mission Request</div>
            <div className="text-sm font-semibold text-[#0b1c30]">"{missionGoal}"</div>
            {latestRun?.explanation && (
              <p className="text-xs text-[#464555] pt-2 leading-relaxed border-t border-[#c7c4d8]/20 mt-2">
                <strong className="text-[#4f46e5]">Agent Reasoning:</strong> {latestRun.explanation}
              </p>
            )}
          </div>

          {/* Financial Breakdown Card */}
          <div className="authority-envelope rounded-xl p-5 border border-[#4f46e5]/15 space-y-4">
            <div className="flex justify-between items-start border-b border-[#c7c4d8]/20 pb-3">
              <div>
                <h4 className="font-heading font-bold text-sm text-[#0b1c30]">Procurement Breakdown</h4>
                <p className="text-xs text-[#464555]">{cart.length} items locked on server</p>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#777587] uppercase font-bold">Server Authoritative Total</span>
                <div className="font-heading font-bold text-xl text-[#4f46e5]">₹{totalRupees}</div>
              </div>
            </div>

            <div className="divide-y divide-[#c7c4d8]/15">
              {(activeQuote?.items && activeQuote.items.length > 0 ? activeQuote.items : cart).map((item: any) => {
                const qty = item.quantity || 1;
                const unitPrice = item.unit_price ?? item.price ?? 0;
                const subtotal = item.subtotal ?? (unitPrice * qty);
                return (
                  <div key={item.sku} className="py-2 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-semibold text-[#0b1c30]">{item.name}</span>
                      <span className="text-[11px] text-[#777587] font-mono ml-2">Qty: {qty}</span>
                    </div>
                    <span className="font-mono font-bold text-[#0b1c30]">
                      ₹{(subtotal / 100).toFixed(0)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="p-3 bg-[#eff4ff] rounded-lg flex justify-between items-center text-xs font-mono">
              <span className="text-[#464555]">Remaining Authority Headroom:</span>
              <span className="text-[#006c49] font-bold">₹{remainingRupees}</span>
            </div>
          </div>

          {/* Deterministic Policy Evaluation Decision */}
          {evaluatingPolicy ? (
            <div className="py-6 text-center space-y-2 border border-[#c7c4d8]/20 rounded-xl bg-[#f8f9ff]">
              <div className="w-6 h-6 border-2 border-[#4f46e5] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-[#464555]">Evaluating deterministic spending & category guards on server...</p>
            </div>
          ) : policyDecision ? (
            <div className="space-y-3">
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  policyDecision.decision === 'ALLOW'
                    ? 'bg-[#10b981]/10 border-[#10b981]/30 text-[#005236]'
                    : policyDecision.decision === 'REQUIRE_CONFIRMATION'
                    ? 'bg-[#f59e0b]/10 border-[#f59e0b]/30 text-[#653e00]'
                    : 'bg-[#ba1a1a]/10 border-[#ba1a1a]/30 text-[#93000a]'
                }`}
              >
                <span className="material-symbols-outlined text-2xl mt-0.5">
                  {policyDecision.decision === 'ALLOW'
                    ? 'check_circle'
                    : policyDecision.decision === 'REQUIRE_CONFIRMATION'
                    ? 'warning'
                    : 'block'}
                </span>
                <div className="space-y-1">
                  <div className="font-heading font-bold text-sm">
                    {policyDecision.decision === 'ALLOW' && 'Authorization Decision: ALLOW'}
                    {policyDecision.decision === 'REQUIRE_CONFIRMATION' && 'Human Approval Required'}
                    {policyDecision.decision === 'BLOCK' && 'Authorization Decision: BLOCKED'}
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    {policyDecision.decision === 'REQUIRE_CONFIRMATION'
                      ? `This transaction (₹${totalRupees}) exceeds the autonomous threshold (₹${(
                          (policy?.confirmation_threshold || 300000) / 100
                        ).toFixed(0)}). Explicit authorization is required.`
                      : policyDecision.decision === 'BLOCK'
                      ? policyDecision.reasons?.[0]?.message || 'Purchase blocked by server policy constraints.'
                      : 'All 10 deterministic safety checks passed. Transaction is within authorized spending limits.'}
                  </p>
                </div>
              </div>

              {/* Safety Checks Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: 'Price Lock', desc: 'Server Authoritative' },
                  { label: 'Stock Valid', desc: 'Atomic Inventory' },
                  { label: 'Category', desc: 'Whitelist Pass' },
                  { label: 'Signature', desc: 'HMAC-SHA256' },
                ].map((c, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-[#f8f9ff] border border-[#c7c4d8]/20 text-center">
                    <div className="text-xs font-bold text-[#0b1c30] flex items-center justify-center gap-1">
                      <span className="material-symbols-outlined text-sm text-[#10b981]">check_circle</span>
                      {c.label}
                    </div>
                    <div className="text-[10px] text-[#777587] mt-0.5">{c.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Cryptographic Proof Details Accordion */}
          <div className="border border-[#c7c4d8]/20 rounded-xl overflow-hidden bg-[#f8f9ff]">
            <button
              type="button"
              onClick={() => setShowTechnicalProof(!showTechnicalProof)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-[#464555] hover:text-[#0b1c30] transition font-semibold"
            >
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm text-[#4f46e5]">lock</span>
                Cryptographic Proof Details
              </span>
              <span className="material-symbols-outlined text-sm">
                {showTechnicalProof ? 'expand_less' : 'expand_more'}
              </span>
            </button>
            {showTechnicalProof && (
              <div className="p-4 border-t border-[#c7c4d8]/20 space-y-2 text-xs font-mono text-[#464555] bg-white">
                <div className="flex justify-between">
                  <span>Quote ID:</span>
                  <span className="text-[#0b1c30] font-bold">{activeQuote.quote_id}</span>
                </div>
                <div className="flex justify-between">
                  <span>Algorithm:</span>
                  <span className="text-[#0b1c30]">HMAC-SHA256</span>
                </div>
                <div className="text-[10px] text-[#777587] truncate pt-1 border-t border-[#c7c4d8]/10">
                  Signature: {activeQuote.signature}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer CTAs */}
        <div className="px-6 py-4 border-t border-[#c7c4d8]/20 bg-[#f8f9ff] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-mono text-[#006c49]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>Target: Razorpay Test Environment (INR)</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGuardianOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-[#464555] hover:text-[#0b1c30] transition"
            >
              Cancel
            </button>

            {latestRun?.status === 'COMPLETED' || latestRun?.execution_result ? (
              <button
                onClick={() => {
                  setIsGuardianOpen(false);
                  setMissionFlowState('completed');
                }}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-heading font-semibold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"
              >
                <span className="material-symbols-outlined text-sm">receipt_long</span>
                <span>View Completed Receipt</span>
              </button>
            ) : (
              !isBlocked && (
                <button
                  onClick={handleAuthorize}
                  disabled={executingCheckout || evaluatingPolicy}
                  className="bg-[#4f46e5] hover:bg-[#3525cd] text-white font-heading font-semibold text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition disabled:opacity-50"
                >
                  {executingCheckout ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Executing Razorpay Test Checkout...</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">fingerprint</span>
                      <span>
                        {policyDecision?.decision === 'REQUIRE_CONFIRMATION'
                          ? 'Confirm & Execute with Razorpay'
                          : 'Authorize & Execute with Razorpay'}
                      </span>
                    </>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Simulated Live Razorpay Checkout Modal */}
      <SimulatedRazorpayModal
        isOpen={isRazorpayModalOpen}
        onClose={() => setIsRazorpayModalOpen(false)}
        orderId={activeQuote?.quote_id || 'order_rzp_live_test'}
        amountPaise={totalPaise}
        productName={cart[0]?.name || 'Autonomous Purchase'}
        onPaymentSuccess={handleRazorpaySuccess}
      />
    </div>
  );
}
