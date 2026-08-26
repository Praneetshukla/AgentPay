export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-8 selection:bg-indigo-500 selection:text-white">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 -z-10" />
      
      <div className="max-w-4xl w-full text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Track 01 — AI Growth & Agentic Commerce
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
          AgentPay Gateway
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
          AI-native commerce gateway making merchants fully transactable by AI buyers with deterministic server-side policy gating and immutable audit ledgering.
        </p>

        {/* Core Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mt-12">
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div className="text-indigo-400 font-mono text-sm mb-2">01 / DISCOVERY & QUOTE</div>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">Agent-Readable Catalog</h3>
            <p className="text-sm text-slate-400">
              AI Buyer proposes product selections and receives cryptographic HMAC-signed quotes.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-indigo-500/40 bg-indigo-950/20 backdrop-blur-md shadow-xl shadow-indigo-950/50">
            <div className="text-emerald-400 font-mono text-sm mb-2">02 / DETERMINISTIC GATES</div>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">Zero Blind Execution</h3>
            <p className="text-sm text-slate-400">
              AI proposes, server decides. Strict spending caps, whitelist checks, and cart integrity validation.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-md shadow-xl">
            <div className="text-indigo-400 font-mono text-sm mb-2">03 / RAZORPAY & LEDGER</div>
            <h3 className="font-semibold text-lg text-slate-100 mb-2">State Machine & Ledger</h3>
            <p className="text-sm text-slate-400">
              Razorpay Test Mode integration, idempotent webhook processing, and append-only audit trail.
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-mono">
          <div>PHASE 1 FOUNDATION ACTIVE</div>
          <div className="flex items-center gap-4">
            <span>Backend: <span className="text-emerald-400">http://127.0.0.1:8000</span></span>
            <span>API Docs: <span className="text-indigo-400">/docs</span></span>
          </div>
        </div>
      </div>
    </main>
  );
}
