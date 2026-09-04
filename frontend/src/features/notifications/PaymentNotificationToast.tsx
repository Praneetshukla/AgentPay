'use client';

import React, { useEffect, useState, useRef } from 'react';

export interface PaymentNotificationEvent {
  event_id: string;
  transaction_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  amount?: number;
  currency?: string;
  status: string; // PAID, PAYMENT_PENDING, FAILED
  timestamp: string;
  audit_event_id?: number;
  explanation?: string;
}

interface PaymentNotificationToastProps {
  onInspectLedger?: () => void;
}

// Subtle Web Audio Synthesizer (Zero external audio file dependency)
function playSubtleAudioChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    // Respect autoplay policy
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle dual-frequency chime
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.04, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.35);
  } catch {
    // Graceful no-audio fallback
  }
}

export function PaymentNotificationToast({ onInspectLedger }: PaymentNotificationToastProps) {
  const [notifications, setNotifications] = useState<PaymentNotificationEvent[]>([]);
  const processedEventIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Connect to server-authoritative SSE stream
    const eventSource = new EventSource('http://127.0.0.1:8000/events/stream');

    eventSource.addEventListener('execution_event', (event) => {
      try {
        const raw = JSON.parse(event.data);
        const eventType = raw.event_type;
        const payload = raw.payload || {};

        if (
          eventType === 'PAYMENT_CAPTURED' ||
          eventType === 'PAYMENT_INITIATED' ||
          eventType === 'PAYMENT_FAILED'
        ) {
          const uniqueId = raw.event_id || `${raw.transaction_id}_${eventType}`;

          // Deduplication check: Do not show duplicate toasts for the same event/idempotent replay
          if (processedEventIds.current.has(uniqueId)) {
            return;
          }
          processedEventIds.current.add(uniqueId);

          const newNotif: PaymentNotificationEvent = {
            event_id: uniqueId,
            transaction_id: raw.transaction_id || payload.transaction_id,
            razorpay_order_id: payload.razorpay_order_id,
            razorpay_payment_id: payload.razorpay_payment_id,
            amount: payload.amount,
            currency: payload.currency || 'INR',
            status: payload.status || (eventType === 'PAYMENT_CAPTURED' ? 'PAID' : 'PENDING'),
            timestamp: raw.timestamp || new Date().toISOString(),
            audit_event_id: payload.audit_event_id,
            explanation: raw.explanation || `Payment event: ${eventType}`,
          };

          setNotifications((prev) => [newNotif, ...prev.slice(0, 2)]);
          playSubtleAudioChime();

          // Auto dismiss toast after 8 seconds
          setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.event_id !== uniqueId));
          }, 8000);
        }
      } catch (err) {
        console.warn('Could not parse SSE payment notification', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {notifications.map((notif) => {
        const isPaid = notif.status === 'PAID';
        const isPending = notif.status === 'PAYMENT_PENDING' || notif.status === 'PENDING';
        const isFailed = notif.status === 'FAILED';

        return (
          <div
            key={notif.event_id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-slide-in ${
              isPaid
                ? 'bg-white/95 border-[#10b981]/30 text-[#0b1c30]'
                : isPending
                ? 'bg-white/95 border-[#4f46e5]/30 text-[#0b1c30]'
                : 'bg-white/95 border-[#ba1a1a]/30 text-[#0b1c30]'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-white ${
                    isPaid ? 'bg-[#10b981]' : isPending ? 'bg-[#4f46e5]' : 'bg-[#ba1a1a]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isPaid ? 'verified' : isPending ? 'sync' : 'error'}
                  </span>
                </div>
                <div>
                  <h5 className="font-heading font-bold text-xs">
                    {isPaid
                      ? 'Razorpay Payment Captured'
                      : isPending
                      ? 'Razorpay Order Initiated'
                      : 'Payment Failed'}
                  </h5>
                  <span className="text-[10px] font-mono text-[#777587]">
                    {new Date(notif.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <button
                onClick={() =>
                  setNotifications((prev) => prev.filter((n) => n.event_id !== notif.event_id))
                }
                className="text-[#777587] hover:text-[#0b1c30] p-1 text-xs"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 space-y-1 text-xs">
              {notif.amount && (
                <div className="flex justify-between font-mono">
                  <span className="text-[#464555]">Amount:</span>
                  <span className="font-bold text-[#0b1c30]">
                    ₹{(notif.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {notif.transaction_id && (
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-[#777587]">Tx ID:</span>
                  <span className="text-[#0b1c30] truncate max-w-[160px]">{notif.transaction_id}</span>
                </div>
              )}

              {notif.razorpay_payment_id && (
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-[#777587]">Payment ID:</span>
                  <span className="text-[#006c49] font-bold">{notif.razorpay_payment_id}</span>
                </div>
              )}

              {notif.audit_event_id && (
                <div className="flex justify-between font-mono text-[10px]">
                  <span className="text-[#777587]">Merkle Audit:</span>
                  <span className="text-[#4f46e5] font-bold">Block #{notif.audit_event_id}</span>
                </div>
              )}
            </div>

            {onInspectLedger && (
              <button
                onClick={onInspectLedger}
                className="mt-3 w-full py-1.5 px-3 rounded-lg bg-[#eff4ff] hover:bg-[#dbeafe] text-[#4f46e5] font-heading font-semibold text-[11px] flex items-center justify-center gap-1.5 transition"
              >
                <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
                Inspect in Cryptographic Ledger
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
