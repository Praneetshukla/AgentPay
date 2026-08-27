'use client';

import React, { useState } from 'react';
import { FlaskConical, AlertTriangle, ShieldAlert, Sparkles, RefreshCw, Zap } from 'lucide-react';
import { simulateStockChange, simulateWebhook, simulateTamperLedger } from '@/lib/api';

interface FailureLabProps {
  onScenarioTriggered: () => void;
  activeRazorpayOrderId?: string;
}

export function FailureLab({ onScenarioTriggered, activeRazorpayOrderId }: FailureLabProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  const handleStockLoss = async () => {
    setLoadingAction('stock');
    try {
      const res = await simulateStockChange('HEADSET-ANC-006', 0);
      setSimulationMessage(`Simulated inventory loss for ${res.sku} (Stock set to 0)`);
      onScenarioTriggered();
    } catch (err: any) {
      setSimulationMessage(`Simulation error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleTamperLedger = async () => {
    setLoadingAction('tamper');
    try {
      const res = await simulateTamperLedger();
      setSimulationMessage(`Tampered event ID ${res.tampered_event_id}. Click 'Verify Chain Integrity' above to detect failure.`);
      onScenarioTriggered();
    } catch (err: any) {
      setSimulationMessage(`Simulation error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSimulateWebhook = async (tamperSig: boolean = false) => {
    if (!activeRazorpayOrderId) {
      setSimulationMessage('No active Razorpay order available. Execute a checkout first.');
      return;
    }
    setLoadingAction(tamperSig ? 'bad_webhook' : 'good_webhook');
    try {
      const res = await simulateWebhook(activeRazorpayOrderId, 'payment.captured', tamperSig);
      setSimulationMessage(
        tamperSig
          ? `Fraudulent webhook rejected with code: ${res.code}`
          : `Webhook processed. Transaction status updated to: ${res.transaction_status}`
      );
      onScenarioTriggered();
    } catch (err: any) {
      setSimulationMessage(`Webhook simulation error: ${err.message}`);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold text-slate-100">Failure Simulation Lab</h3>
        </div>
        <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          Demo Mode
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <button
          onClick={handleStockLoss}
          disabled={loadingAction === 'stock'}
          className="p-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-left transition flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-200">1. Simulate Out of Stock</div>
            <div className="text-[11px] text-slate-400">Forces stock to 0 to test inventory recovery</div>
          </div>
        </button>

        <button
          onClick={handleTamperLedger}
          disabled={loadingAction === 'tamper'}
          className="p-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-left transition flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-200">2. Tamper Audit Ledger</div>
            <div className="text-[11px] text-slate-400">Mutates DB record to break hash chain</div>
          </div>
        </button>

        <button
          onClick={() => handleSimulateWebhook(false)}
          disabled={loadingAction === 'good_webhook'}
          className="p-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-left transition flex items-start gap-2.5"
        >
          <Zap className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-200">3. Simulate Valid Webhook</div>
            <div className="text-[11px] text-slate-400">Sends valid HMAC signature payment.captured</div>
          </div>
        </button>

        <button
          onClick={() => handleSimulateWebhook(true)}
          disabled={loadingAction === 'bad_webhook'}
          className="p-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-left transition flex items-start gap-2.5"
        >
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-slate-200">4. Fraudulent Webhook</div>
            <div className="text-[11px] text-slate-400">Sends invalid signature to verify rejection</div>
          </div>
        </button>
      </div>

      {simulationMessage && (
        <div className="p-2.5 rounded-lg border border-indigo-500/30 bg-indigo-950/20 text-xs font-mono text-indigo-300">
          {simulationMessage}
        </div>
      )}
    </div>
  );
}
