'use client';

import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, RefreshCw, Link2, CheckCircle2, XCircle } from 'lucide-react';
import { verifyAuditChain } from '@/lib/api';

interface AuditLedgerViewProps {
  events: any[];
  onRefreshEvents: () => void;
}

export function AuditLedgerView({ events, onRefreshEvents }: AuditLedgerViewProps) {
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    error_reason?: string;
    failed_event_id?: number;
    total_events?: number;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleVerify = async () => {
    setVerifying(true);
    try {
      const res = await verifyAuditChain();
      setVerificationResult(res);
    } catch (err) {
      console.error('Verification failed', err);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-indigo-400" />
            Append-Only Hash-Chained Audit Ledger
          </h3>
          <p className="text-[11px] text-slate-400">Cryptographically chained SHA-256 events</p>
        </div>

        <button
          onClick={handleVerify}
          disabled={verifying}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
        >
          {verifying ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          Verify Chain Integrity
        </button>
      </div>

      {/* Verification Result Banner */}
      {verificationResult && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
            verificationResult.valid
              ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
              : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {verificationResult.valid ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            )}
            <div>
              <div className="font-bold">
                {verificationResult.valid
                  ? `CHAIN VALID (${verificationResult.total_events} events verified)`
                  : 'CHAIN TAMPERING DETECTED'}
              </div>
              {verificationResult.error_reason && (
                <div className="text-[11px] text-rose-300/80 mt-0.5">{verificationResult.error_reason}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Audit Event Stream */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {events.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 font-mono">
            No audit events recorded yet.
          </div>
        ) : (
          events.map((evt) => (
            <div
              key={evt.event_id || evt.id}
              className="p-3 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-mono space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-400">{evt.event_type}</span>
                <span className="text-[10px] text-slate-500">{new Date(evt.created_at).toLocaleTimeString()}</span>
              </div>

              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span>Actor: {evt.actor}</span>
                <span className="text-slate-500 truncate max-w-[140px]">ID: {evt.event_id}</span>
              </div>

              <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-800/60">
                <div className="truncate">Prev Hash: {evt.previous_event_hash}</div>
                <div className="truncate text-emerald-400/80">Event Hash: {evt.event_hash}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
