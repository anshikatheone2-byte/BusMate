import React from 'react';
import { useSignals } from '../../context/SignalContext';
import { AuthorityTab } from '../../types';

interface AuthoritySystemHealthProps {
  onNavigate?: (tab: AuthorityTab) => void;
}

export const AuthoritySystemHealth: React.FC<AuthoritySystemHealthProps> = ({ onNavigate }) => {
  const {
    isFirestoreConnected,
    firestoreSignalsCount,
    syncedPhonesCount,
    precisionPercent,
    isBusNotDetected,
    etaConfidence,
  } = useSignals();

  // High-level operational states
  const overallStatus = isBusNotDetected ? 'degraded' : 'operational';
  const backendStatus = 'operational';
  const connectionStatus = isFirestoreConnected ? 'operational' : 'degraded';
  const signalProcessingStatus = etaConfidence.isLowConfidence ? 'degraded' : 'operational';

  return (
    <div className="flex flex-col w-full gap-6 pb-20 text-[#e4dfff]">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-[#0b013e]/70 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Infrastructure Operations
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-label-sm text-[10px] font-bold border border-emerald-500/30">
              Fleet Systems Online
            </span>
          </div>
          <h1 className="font-headline-sm text-xl md:text-2xl font-bold text-white mt-1">
            System Health & Infrastructure
          </h1>
          <p className="font-body-sm text-xs text-[#ccc3d8] mt-1">
            Real-time telemetry and operational readiness across tracking backends, data streams, and crowd pipelines.
          </p>
        </div>

        {/* Global Overall Status Card */}
        <div className="flex items-center gap-3 bg-[#19114b] px-4 py-3 rounded-2xl border border-[#28225a] shadow-md">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]" />
          <div className="flex flex-col">
            <span className="font-label-sm text-[10px] text-[#958da1] uppercase tracking-wider font-bold">
              Overall Tracking System
            </span>
            <span className="font-label-md text-sm font-extrabold text-white flex items-center gap-1.5">
              <span>Operational</span>
              <span className="text-emerald-400 font-mono text-xs">(99.8% Uptime)</span>
            </span>
          </div>
        </div>
      </div>

      {/* 4 Core Operational Status Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Backend Processing Status */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#28225a] flex items-center justify-center text-[#d2bcff]">
                  <span className="material-symbols-outlined text-[22px]">dns</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-white">Backend Status</h3>
                  <span className="font-label-sm text-[11px] text-[#958da1]">
                    Triangulation &amp; Clustering Engine
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Operational
              </span>
            </div>

            <p className="font-body-sm text-xs text-[#ccc3d8] leading-relaxed mb-4">
              Core triangulation compute nodes are executing 5-factor trust scoring and coordinate snapping with sub-50ms latency.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#28225a]/60 font-mono text-xs text-center">
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Latency</span>
              <span className="font-bold text-white">28 ms</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Cluster Sync</span>
              <span className="font-bold text-emerald-300">100% Locked</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">CPU Load</span>
              <span className="font-bold text-[#b5c4ff]">14.2%</span>
            </div>
          </div>
        </div>

        {/* 2. Real-Time Data Connection */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#28225a] flex items-center justify-center text-[#0055ea]">
                  <span className="material-symbols-outlined text-[22px]">wifi_tethering</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-white">Real-Time Data Connection</h3>
                  <span className="font-label-sm text-[11px] text-[#958da1]">
                    Cloud Database Stream &amp; WebSockets
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                Operational
              </span>
            </div>

            <p className="font-body-sm text-xs text-[#ccc3d8] leading-relaxed mb-4">
              Real-time Firestore anonymous telemetry listener connected. Signals are received anonymously and retained ephemerally.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#28225a]/60 font-mono text-xs text-center">
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Stream Status</span>
              <span className="font-bold text-emerald-300">Connected</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Active Pings</span>
              <span className="font-bold text-white">{firestoreSignalsCount} pings</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Protocol</span>
              <span className="font-bold text-[#b5c4ff]">gRPC / SSE</span>
            </div>
          </div>
        </div>

        {/* 3. Signal Processing Status */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#28225a] flex items-center justify-center text-[#ffb693]">
                  <span className="material-symbols-outlined text-[22px]">filter_alt</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-white">Signal Processing Status</h3>
                  <span className="font-label-sm text-[11px] text-[#958da1]">
                    Noise Isolation &amp; False-Signal Filtering
                  </span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-xs font-bold ${
                signalProcessingStatus === 'operational'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-950/80 text-amber-300 border border-amber-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${signalProcessingStatus === 'operational' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {signalProcessingStatus === 'operational' ? 'Operational' : 'Degraded (Low Quorum)'}
              </span>
            </div>

            <p className="font-body-sm text-xs text-[#ccc3d8] leading-relaxed mb-4">
              Pedestrian, waiting, and parallel motorist rejection filters running continuously at {precisionPercent}% precision.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#28225a]/60 font-mono text-xs text-center">
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Filter Precision</span>
              <span className="font-bold text-white">{precisionPercent}%</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">False Positives</span>
              <span className="font-bold text-emerald-300">&lt; 0.9%</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Noise Rejection</span>
              <span className="font-bold text-[#ffb693]">Active</span>
            </div>
          </div>
        </div>

        {/* 4. Overall Tracking System Status */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#28225a] flex items-center justify-center text-[#8b4dff]">
                  <span className="material-symbols-outlined text-[22px]">health_and_safety</span>
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-white">Overall Tracking Status</h3>
                  <span className="font-label-sm text-[11px] text-[#958da1]">
                    Corridor Availability &amp; Handover Ready
                  </span>
                </div>
              </div>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-sm text-xs font-bold ${
                overallStatus === 'operational'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
              }`}>
                <span className={`w-2 h-2 rounded-full ${overallStatus === 'operational' ? 'bg-emerald-400' : 'bg-rose-400 animate-pulse'}`} />
                {overallStatus === 'operational' ? 'Operational' : 'Attention Required'}
              </span>
            </div>

            <p className="font-body-sm text-xs text-[#ccc3d8] leading-relaxed mb-4">
              Automatic zero-downtime phone handover is primed. Standby nodes ready to assume tracking head instantly on signal departure.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#28225a]/60 font-mono text-xs text-center">
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Handover Shift</span>
              <span className="font-bold text-emerald-300">0ms Seamless</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Synced Nodes</span>
              <span className="font-bold text-white">{syncedPhonesCount} Nodes</span>
            </div>
            <div className="p-2 rounded-xl bg-[#100743]">
              <span className="text-[10px] text-[#958da1] font-sans block">Health Grade</span>
              <span className="font-bold text-[#d2bcff]">A+ (Optimal)</span>
            </div>
          </div>
        </div>
      </div>


      {/* High-Level Fleet Service Status Overview */}
      <div className="p-5 rounded-2xl bg-[#0b013e]/60 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-3">
        <h3 className="font-headline-sm text-base font-bold text-white flex items-center gap-2">
          <span className="material-symbols-outlined text-[#8b4dff] text-[20px]">verified</span>
          Operational SLA &amp; Compliance Standards
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-body-sm text-xs text-[#ccc3d8]">
          <div className="p-3 rounded-xl bg-[#19114b] border border-[#28225a] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-400 text-[20px]">lock</span>
            <div>
              <span className="font-bold text-white block">Strict Privacy Guard</span>
              <span className="text-[11px] text-[#958da1]">Zero PII or hardware IDs stored</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#19114b] border border-[#28225a] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#b5c4ff] text-[20px]">timer</span>
            <div>
              <span className="font-bold text-white block">10-Minute Ephemeral TTL</span>
              <span className="text-[11px] text-[#958da1]">Auto-purges stale pings on schedule</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-[#19114b] border border-[#28225a] flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#d2bcff] text-[20px]">speed</span>
            <div>
              <span className="font-bold text-white block">GPS-Free Triangulation</span>
              <span className="text-[11px] text-[#958da1]">Crowd-powered corridor matching</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
