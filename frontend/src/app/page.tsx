'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Storefront } from '@/features/storefront/Storefront';
import { AgentBuyerConsole } from '@/features/agent/AgentBuyerConsole';
import { ExecutionGraph } from '@/features/inspector/ExecutionGraph';
import { PolicyGuardPanel } from '@/features/policy/PolicyGuardPanel';
import { AuditLedgerView } from '@/features/ledger/AuditLedgerView';
import { FailureLab } from '@/features/failures/FailureLab';
import { fetchCatalog, fetchPolicy, createQuote, runAIBuyer, fetchAuditEvents, executeCheckout } from '@/lib/api';
import { AgentRunResult, AgentTraceStep } from '@/types/agent';
import { ShieldCheck, Eye, RefreshCw, Terminal, Activity } from 'lucide-react';

export default function InspectorDashboardPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [cart, setCart] = useState<Array<{ sku: string; quantity: number; name: string; price: number }>>([]);
  const [activeQuote, setActiveQuote] = useState<any>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [agentRunning, setAgentRunning] = useState(false);
  const [latestRun, setLatestRun] = useState<AgentRunResult | null>(null);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [liveTraceSteps, setLiveTraceSteps] = useState<AgentTraceStep[]>([]);
  const [activeTab, setActiveTab] = useState<'graph' | 'policy' | 'ledger' | 'failures'>('graph');

  // Load initial catalog, policy, and audit records
  const loadData = useCallback(async () => {
    try {
      const [catalogData, policyData, eventsData] = await Promise.all([
        fetchCatalog(),
        fetchPolicy(),
        fetchAuditEvents(20),
      ]);
      setProducts(catalogData);
      setPolicy(policyData);
      setAuditEvents(eventsData);
    } catch (err) {
      console.error('Initialization error', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Connect to live SSE stream
  useEffect(() => {
    const sseUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000'}/events/stream`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);
      eventSource.addEventListener('execution_event', (e) => {
        try {
          const eventData = JSON.parse(e.data);
          if (eventData.node) {
            setLiveTraceSteps((prev) => [
              ...prev,
              {
                step: prev.length + 1,
                node: eventData.node,
                action: eventData.explanation || eventData.event_type,
                output_summary: eventData.payload,
                timestamp: eventData.timestamp,
              },
            ]);
          }
        } catch (err) {
          console.error('SSE parse error', err);
        }
      });
    } catch (err) {
      console.error('SSE connection error', err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);

  // Storefront cart handlers
  const handleAddToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.sku === product.sku);
      if (existing) {
        return prev.map((i) => (i.sku === product.sku ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { sku: product.sku, quantity: 1, name: product.name, price: product.price }];
    });
  };

  const handleUpdateQuantity = (sku: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => (item.sku === sku ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  };

  const handleClearCart = () => {
    setCart([]);
    setActiveQuote(null);
  };

  const handleRequestQuote = async () => {
    if (cart.length === 0) return;
    setQuoteLoading(true);
    try {
      const quoteRes = await createQuote(cart.map((i) => ({ sku: i.sku, quantity: i.quantity })));
      setActiveQuote(quoteRes);
      loadData();
    } catch (err) {
      console.error('Quote creation error', err);
    } finally {
      setQuoteLoading(false);
    }
  };

  // AI Buyer Run trigger
  const handleRunAIBuyer = async (prompt: string) => {
    setAgentRunning(true);
    setLiveTraceSteps([]);
    try {
      const result = await runAIBuyer(prompt);
      setLatestRun(result);
      if (result.trace_steps) {
        setLiveTraceSteps(result.trace_steps);
      }
      if (result.quote) {
        setActiveQuote(result.quote);
      }
      loadData();
    } catch (err) {
      console.error('AI Buyer run error', err);
    } finally {
      setAgentRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-6 py-3.5 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-base text-slate-100 flex items-center gap-2">
              AgentPay Gateway
              <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Track 01 — AI Commerce
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              AI proposes; deterministic systems authorize; Razorpay executes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg border border-slate-800 bg-slate-900 text-slate-400">
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Razorpay Test Mode</span>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh State
          </button>
        </div>
      </header>

      {/* Main Dual-Surface Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 max-w-7xl mx-auto w-full p-4 lg:p-6 gap-6 lg:gap-0">
        {/* LEFT SURFACE: Merchant Storefront & AI Buyer Console (Col 1-5) */}
        <div className="lg:col-span-5 lg:pr-6 space-y-6">
          <AgentBuyerConsole
            onRunAgent={handleRunAIBuyer}
            isRunning={agentRunning}
            latestRun={latestRun}
          />

          <Storefront
            products={products}
            cart={cart}
            onAddToCart={handleAddToCart}
            onUpdateQuantity={handleUpdateQuantity}
            onClearCart={handleClearCart}
            onRequestQuote={handleRequestQuote}
            quoteLoading={quoteLoading}
            activeQuote={activeQuote}
          />
        </div>

        {/* RIGHT SURFACE: Judge / Execution Inspector (Col 6-12) */}
        <div className="lg:col-span-7 lg:pl-6 space-y-4">
          {/* Inspector Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('graph')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'graph'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                1. Execution Graph
              </button>
              <button
                onClick={() => setActiveTab('policy')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'policy'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                2. Policy Guard
              </button>
              <button
                onClick={() => setActiveTab('ledger')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'ledger'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                3. Audit Ledger
              </button>
              <button
                onClick={() => setActiveTab('failures')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'failures'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4. Failure Lab
              </button>
            </div>

            <span className="text-[10px] font-mono text-slate-500 uppercase">
              Judge View
            </span>
          </div>

          {/* Tab Content Display */}
          <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-md shadow-2xl min-h-[500px]">
            {activeTab === 'graph' && (
              <ExecutionGraph
                traceSteps={liveTraceSteps.length > 0 ? liveTraceSteps : latestRun?.trace_steps || []}
                currentStatus={latestRun?.status || 'IDLE'}
              />
            )}

            {activeTab === 'policy' && (
              <PolicyGuardPanel
                policy={policy}
                policyDecision={latestRun?.policy_decision || null}
              />
            )}

            {activeTab === 'ledger' && (
              <AuditLedgerView
                events={auditEvents}
                onRefreshEvents={loadData}
              />
            )}

            {activeTab === 'failures' && (
              <FailureLab
                onScenarioTriggered={loadData}
                activeRazorpayOrderId={latestRun?.execution_result?.razorpay_order_id}
              />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
