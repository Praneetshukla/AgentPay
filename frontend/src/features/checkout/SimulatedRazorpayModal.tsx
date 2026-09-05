'use client';

import React, { useState } from 'react';
import { ShieldCheck, CheckCircle2, QrCode, CreditCard, Smartphone, Building2, X, Lock, ArrowRight, Loader2 } from 'lucide-react';

interface SimulatedRazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amountPaise: number;
  productName: string;
  onPaymentSuccess: () => void;
}

export function SimulatedRazorpayModal({
  isOpen,
  onClose,
  orderId,
  amountPaise,
  productName,
  onPaymentSuccess,
}: SimulatedRazorpayModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'qr' | 'netbanking'>('upi');
  const [isProcessing, setIsProcessing] = useState(false);
  const [upiId, setUpiId] = useState('demo.buyer@upi');

  if (!isOpen) return null;

  const totalRupees = (amountPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  const handleSimulatePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onPaymentSuccess();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#3395ff] text-white flex items-center justify-center font-bold text-base shadow-xs">
              ₹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm tracking-wide">Razorpay Trusted Gateway</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-400 text-slate-900">
                  TEST MODE
                </span>
              </div>
              <p className="text-[11px] text-slate-300">AgentPay Autonomous Merchant Checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Order Summary Strip */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 text-[11px]">Order: </span>
            <span className="font-mono font-bold text-slate-800">{orderId || 'order_rzp_mock_live'}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 text-[11px]">Amount: </span>
            <span className="font-mono font-bold text-emerald-600 text-sm">₹{totalRupees}</span>
          </div>
        </div>

        {/* Payment Methods Grid */}
        <div className="p-6 space-y-4">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Select Payment Method
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { id: 'upi', label: 'UPI / QR', icon: Smartphone },
              { id: 'card', label: 'Card', icon: CreditCard },
              { id: 'qr', label: 'Scan & Pay', icon: QrCode },
              { id: 'netbanking', label: 'Netbanking', icon: Building2 },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMethod === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMethod(m.id as any)}
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium transition cursor-pointer ${
                    isSelected
                      ? 'border-[#3395ff] bg-blue-50/50 text-[#0c2340] font-bold shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#3395ff]' : 'text-slate-400'}`} />
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Interactive Form for UPI / Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            {selectedMethod === 'upi' && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-slate-600">Enter Virtual Payment Address (VPA)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-[#3395ff]"
                  />
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                    Verified
                  </span>
                </div>
              </div>
            )}

            {selectedMethod === 'card' && (
              <div className="space-y-2 text-[11px]">
                <div>Card: <span className="font-mono font-bold text-slate-800">4111 •••• •••• 1111 (Test Card)</span></div>
                <div className="flex justify-between text-slate-500">
                  <span>Exp: 12/28</span>
                  <span>CVV: •••</span>
                </div>
              </div>
            )}

            {selectedMethod === 'qr' && (
              <div className="text-center py-2 space-y-1">
                <div className="w-20 h-20 bg-slate-900 text-white rounded-lg mx-auto flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-blue-400" />
                </div>
                <p className="text-[10px] text-slate-500">Scan using any UPI App (GPay, PhonePe, Paytm)</p>
              </div>
            )}

            {selectedMethod === 'netbanking' && (
              <div className="text-slate-600 text-[11px] py-1">
                Selected Bank: <strong className="text-slate-900">HDFC / ICICI (Instant Simulator)</strong>
              </div>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="p-6 pt-0 space-y-2">
          <button
            type="button"
            onClick={handleSimulatePayment}
            disabled={isProcessing}
            className="w-full py-3 rounded-xl bg-[#3395ff] hover:bg-[#2080ea] text-white font-heading font-bold text-xs shadow-md transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing with Razorpay Test Engine...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Pay ₹{totalRupees} via Razorpay</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit SSL Encrypted • Zero-Trust Transaction Guardian</span>
          </div>
        </div>
      </div>
    </div>
  );
}
