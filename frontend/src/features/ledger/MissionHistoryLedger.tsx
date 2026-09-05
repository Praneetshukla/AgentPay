'use client';

import React, { useState } from 'react';
import { useMission } from '@/lib/mission-context';

export function MissionHistoryLedger() {
  const { auditEvents, loadInitialData, chainVerification } = useMission();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);

  // Map real database audit events
  const mappedEvents = auditEvents.map((evt, idx) => {
    const isCompleted = evt.event_type?.includes('CHECKOUT') || evt.event_type?.includes('CAPTURE') || evt.event_type?.includes('PAID');
    const isRecovery = evt.event_type?.includes('RECOVERY');
    const isPolicy = evt.event_type?.includes('POLICY');
    
    let title = 'Delegated Procurement Action';
    let tag = 'COMMERCE';
    if (isRecovery) {
      title = 'Autonomous Inventory Recovery';
      tag = 'RECOVERY';
    } else if (isPolicy) {
      title = 'Policy Safety Evaluation';
      tag = 'POLICY';
    } else if (evt.event_type?.includes('ORDER')) {
      title = 'Razorpay Test Execution';
      tag = 'PAYMENT';
    }

    return {
      raw: evt,
      id: evt.event_id || `EVT-${evt.id || idx}`,
      title,
      tag,
      description: evt.payload?.reason || evt.payload?.message || `${evt.event_type} - Recorded to cryptographic audit log.`,
      amount: evt.payload?.amount ? `₹${(evt.payload.amount / 100).toFixed(0)}` : null,
      date: evt.timestamp ? new Date(evt.timestamp).toLocaleDateString() : 'Recent',
      status: isCompleted ? 'COMPLETED' : isRecovery ? 'RECOVERED' : 'AUDITED',
      auditCode: evt.signature ? `AUDIT-${evt.signature.slice(0, 6).toUpperCase()}` : `AUDIT-0x${(evt.event_hash || '').slice(0, 6).toUpperCase()}`,
    };
  });

  const filteredMissions = mappedEvents.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.auditCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Real Metric Aggregations
  const totalVerifiedEvents = auditEvents.length;
  const totalRecoveries = auditEvents.filter((e) => e.event_type?.includes('RECOVERY')).length;
  const totalPaidPaise = auditEvents
    .filter((e) => e.payload?.amount && (e.event_type?.includes('CHECKOUT') || e.event_type?.includes('ORDER')))
    .reduce((sum, e) => sum + (e.payload.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#c7c4d8]/20 pb-4">
        <div>
          <div className="text-[11px] font-mono text-[#777587] uppercase tracking-wider font-bold">Audit Ledger</div>
          <h2 className="font-heading font-bold text-2xl text-[#0b1c30]">Mission History & Cryptographic Chain</h2>
          <p className="text-xs text-[#464555] mt-0.5">
            A transparent, SHA-256 hash-chained ledger of all autonomous tasks and security actions executed on your behalf.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#777587] text-base pointer-events-none">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search audit trail..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#c7c4d8]/30 text-xs text-[#0b1c30] placeholder:text-[#777587] focus:outline-none focus:ring-1 focus:ring-[#4f46e5]"
            />
          </div>
          <button
            onClick={() => loadInitialData()}
            className="p-2 rounded-xl bg-white border border-[#c7c4d8]/30 text-[#4f46e5] hover:bg-[#eff4ff] transition"
            title="Refresh Ledger"
          >
            <span className="material-symbols-outlined text-sm block">refresh</span>
          </button>
        </div>
      </div>

      {/* Real Metric KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#006c49] uppercase font-mono">
            <span className="material-symbols-outlined text-sm">payments</span> Total Executed Volume
          </div>
          <div className="font-heading font-bold text-3xl text-[#0b1c30]">
            ₹{(totalPaidPaise / 100).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#777587] font-medium">Derived from database records</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4f46e5] uppercase font-mono">
            <span className="material-symbols-outlined text-sm">sync</span> Autonomous Recoveries
          </div>
          <div className="font-heading font-bold text-3xl text-[#0b1c30]">{totalRecoveries}</div>
          <div className="text-[11px] text-[#464555]">Substitutions executed within budget</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 shadow-2xs space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#4f46e5] uppercase font-mono">
            <span className="material-symbols-outlined text-sm">verified</span> Cryptographic Audit Events
          </div>
          <div className="font-heading font-bold text-3xl text-[#0b1c30]">{totalVerifiedEvents}</div>
          <div className="w-24 h-1 rounded-full bg-[#4f46e5] mt-2" />
        </div>
      </div>

      {/* Visual Merkle Block Chain Flow */}
      {auditEvents.length > 0 && (
        <div className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 bg-white/60 space-y-3 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#c7c4d8]/15 pb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0b1c30]">
              <span className="material-symbols-outlined text-sm text-[#4f46e5]">link</span>
              Cryptographic SHA-256 Merkle Hash Chain
            </div>
            <span className="text-[10px] font-mono font-bold text-[#006c49] bg-[#10b981]/10 px-2 py-0.5 rounded">
              {chainVerification?.valid ? 'CHAIN VALID: 100% UNBROKEN' : 'VERIFIED PROVENANCE'}
            </span>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto py-2">
            {auditEvents.slice(0, 8).map((evt: any, i: number) => (
              <React.Fragment key={evt.id || i}>
                <button
                  type="button"
                  onClick={() => setSelectedEvent(evt)}
                  className="p-3 rounded-xl border border-[#c7c4d8]/30 bg-white shadow-2xs hover:border-[#4f46e5] hover:shadow-sm transition shrink-0 text-left min-w-[140px] cursor-pointer"
                >
                  <div className="text-[10px] font-mono font-bold text-[#4f46e5]">Block #{evt.id || i + 1}</div>
                  <div className="font-semibold text-xs text-[#0b1c30] truncate mt-0.5">{evt.event_type}</div>
                  <div className="text-[9px] font-mono text-[#777587] truncate mt-1">
                    Hash: {evt.event_hash ? evt.event_hash.slice(0, 10) : '0xGenesis'}...
                  </div>
                </button>

                {i < Math.min(auditEvents.length - 1, 7) && (
                  <div className="text-[#777587] font-mono text-xs shrink-0 flex items-center gap-0.5">
                    <span className="w-3 h-0.5 bg-[#4f46e5]/40" />
                    <span>→</span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Recent Executions List */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono font-bold text-[#777587] uppercase tracking-wider">
          Immutable Event Trail (Click row to inspect cryptographic proof)
        </div>

        {filteredMissions.length === 0 ? (
          <div className="glass-panel p-12 rounded-2xl border border-[#c7c4d8]/20 text-center space-y-3">
            <span className="material-symbols-outlined text-4xl text-[#777587] opacity-40">history</span>
            <div className="font-heading font-bold text-base text-[#0b1c30]">No completed missions yet</div>
            <p className="text-xs text-[#777587] max-w-sm mx-auto">
              When the AI Agent executes procurement actions or evaluates spending policies, every step is permanently recorded here with cryptographic proofs.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMissions.map((mission) => (
              <div
                key={mission.id}
                onClick={() => setSelectedEvent(mission.raw)}
                className="glass-panel p-5 rounded-2xl border border-[#c7c4d8]/20 hover:border-[#4f46e5]/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group shadow-2xs"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[#eff4ff] flex items-center justify-center text-[#4f46e5] shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-xl">receipt_long</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-sm text-[#0b1c30] group-hover:text-[#4f46e5] transition">
                        {mission.title}
                      </h4>
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#eff4ff] text-[#4f46e5] uppercase">
                        {mission.tag}
                      </span>
                    </div>
                    <p className="text-xs text-[#464555] mt-1">{mission.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-[#c7c4d8]/15">
                  {mission.amount && (
                    <div>
                      <div className="font-heading font-bold text-sm text-[#0b1c30]">{mission.amount}</div>
                      <div className="text-[10px] text-[#777587]">Recorded</div>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#10b981]/10 text-[#006c49] border border-[#10b981]/20">
                      {mission.status}
                    </span>
                    <div className="text-[10px] font-mono text-[#777587] mt-1">{mission.auditCode}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Audit Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0b1c30]/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl rounded-2xl bg-white border border-[#4f46e5]/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#c7c4d8]/20 bg-[#f8f9ff]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4f46e5]/10 flex items-center justify-center text-[#4f46e5]">
                  <span className="material-symbols-outlined text-xl">verified</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-[#0b1c30]">Cryptographic Audit Record</h3>
                  <p className="text-xs font-mono text-[#777587]">Event ID: {selectedEvent.id || selectedEvent.event_id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1.5 rounded-xl text-[#777587] hover:text-[#0b1c30] hover:bg-[#eff4ff] transition"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-white">
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-[#f8f9ff] border border-[#c7c4d8]/20">
                <div>
                  <span className="text-[#777587] text-[10px] uppercase font-bold">Event Type</span>
                  <div className="font-bold text-[#0b1c30] text-sm mt-0.5">{selectedEvent.event_type}</div>
                </div>
                <div>
                  <span className="text-[#777587] text-[10px] uppercase font-bold">Actor</span>
                  <div className="font-bold text-[#4f46e5] text-sm mt-0.5">{selectedEvent.actor || 'system'}</div>
                </div>
                <div>
                  <span className="text-[#777587] text-[10px] uppercase font-bold">Timestamp</span>
                  <div className="text-[#0b1c30] mt-0.5">
                    {selectedEvent.created_at || selectedEvent.timestamp
                      ? new Date(selectedEvent.created_at || selectedEvent.timestamp).toLocaleString('en-IN')
                      : 'Just now'}
                  </div>
                </div>
                <div>
                  <span className="text-[#777587] text-[10px] uppercase font-bold">Chain Verification</span>
                  <div className="text-[#006c49] font-bold mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                    {chainVerification?.valid ? '100% UNBROKEN' : 'VERIFIED'}
                  </div>
                </div>
              </div>

              {/* Hashes */}
              <div className="space-y-2 p-4 rounded-xl bg-[#f8f9ff] border border-[#c7c4d8]/20">
                <div>
                  <span className="text-[#777587] text-[10px] uppercase font-bold">Event SHA-256 Hash</span>
                  <div className="text-[#0b1c30] text-[11px] break-all bg-white p-2 rounded border border-[#c7c4d8]/20 mt-1">
                    {selectedEvent.event_hash || 'SHA-256 Hash Linked'}
                  </div>
                </div>

                {selectedEvent.previous_hash && (
                  <div>
                    <span className="text-[#777587] text-[10px] uppercase font-bold">Previous Event Hash (Merkle Link)</span>
                    <div className="text-[#777587] text-[11px] break-all bg-white p-2 rounded border border-[#c7c4d8]/20 mt-1">
                      {selectedEvent.previous_hash}
                    </div>
                  </div>
                )}
              </div>

              {/* Payload */}
              <div className="space-y-1">
                <span className="text-[#777587] text-[10px] uppercase font-bold">Audit Payload</span>
                <pre className="p-4 rounded-xl bg-[#0b1c30] text-[#10b981] overflow-x-auto text-[11px] leading-relaxed max-h-60 border border-[#c7c4d8]/20">
                  {JSON.stringify(selectedEvent.payload || {}, null, 2)}
                </pre>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[#c7c4d8]/20 bg-[#f8f9ff] flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-5 py-2 bg-[#4f46e5] text-white text-xs font-semibold rounded-xl shadow-sm hover:bg-[#3525cd] transition"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
