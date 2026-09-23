import React, { useState } from 'react';
import { useSignals } from '../../context/SignalContext';
import { INITIAL_SECTORS } from '../../data/transitData';
import { SectorHealth, AuthorityTab } from '../../types';

interface AuthorityDemoModeProps {
  onNavigate?: (tab: AuthorityTab) => void;
}

export const AuthorityDemoMode: React.FC<AuthorityDemoModeProps> = ({ onNavigate }) => {
  const {
    signals,
    acceptedSignals,
    rejectedSignals,
    signalsReceivedCount,
    signalsRemovedCount,
    syncedPhonesCount,
    precisionPercent,
    activeTrackingPhone,
    primaryAcceptedSignal,
    latestRejectedSignal,
    rejectionReasonCounts,
    estimatedBusPosition,
    etaConfidence,
    stoppedBusSignals,
    waitingAtStopSignals,
    walkingSignals,
    handoverCount,
    handoverLogs,
    isBusNotDetected,
    secondsSinceLastSeen,
    addSyncedPhone,
    removeSyncedPhone,
    passengerLeavesBus,
    injectStrayPing,
    shiftTrackingPhone,
    simulate30sTimeout,
    restoreAcceptedSignals,
    testStopDwellPhone,
    testWaitingAtStopPhone,
    verifySignal,
  } = useSignals();

  const [activeDemoSection, setActiveDemoSection] = useState<'sandbox' | 'diagnostics' | 'noise-filter' | 'handovers' | 'sectors'>('sandbox');
  const [inspectedSignalId, setInspectedSignalId] = useState<string>(primaryAcceptedSignal.id);
  const [sectors] = useState<SectorHealth[]>(INITIAL_SECTORS);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const inspectedSignal =
    signals.find((s) => s.id === inspectedSignalId) || primaryAcceptedSignal;

  const handleAddPassengers = () => {
    addSyncedPhone();
    showToast(`Simulator: +2 Passenger phones ingested into Bus 21A cluster (${syncedPhonesCount + 1} synchronized — ${etaConfidence.confidenceDisplay})`);
  };

  const handlePassengerLeavesBus = () => {
    passengerLeavesBus();
  };

  const handleDropPassengerPhone = () => {
    removeSyncedPhone();
    showToast(`Simulator: Phone dropped from Bus 21A — cluster now has ${Math.max(1, etaConfidence.trustedPhoneCount - 1)} phones (low confidence triggered)`);
  };

  const handleInjectFalseSignals = () => {
    const rejected = injectStrayPing();
    showToast(`Simulator: Stray ${rejected.speedKmh} km/h signal rejected as "${rejected.rejectionReason}" with ${precisionPercent}% precision`);
  };

  const handleSimulateTimeout = () => {
    simulate30sTimeout();
    showToast('Simulator: 30s timeout triggered — Bus not detected, position latched, ETA hidden');
  };

  const handleRestoreSignals = () => {
    restoreAcceptedSignals();
    showToast('Simulator: Commuter signals restored — Bus 21A cluster re-established with high confidence');
  };

  const handleShiftTrackingPhone = () => {
    shiftTrackingPhone();
    showToast('Simulator: Tracking phone shifted — 0ms seamless handover executed');
  };

  return (
    <div className="flex flex-col w-full gap-5 pb-20 text-[#e4dfff]">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2.5 rounded-xl bg-[#8b4dff] text-white font-label-sm text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">science</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Demo Header */}
      <div className="p-5 rounded-2xl bg-[#0b013e]/70 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#8b4dff]/30 text-[#d2bcff] font-label-sm text-[10px] uppercase font-bold tracking-wider border border-[#8b4dff]/40">
              Hackathon Evaluation &amp; Developer Tools
            </span>
            <span className="font-mono text-xs text-emerald-300 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sandbox Active
            </span>
          </div>
          <h1 className="font-headline-sm text-xl md:text-2xl font-bold text-white mt-1">
            Demo &amp; Innovation Testbench
          </h1>
          <p className="font-body-sm text-xs text-[#ccc3d8] mt-1">
            Dedicated environment for judges: test passenger pings, noise rejection, auto-handover, dwell detection, and algorithmic proof.
          </p>
        </div>

        {/* Real-time Status Badge */}
        <div className="flex items-center gap-3 bg-[#19114b] p-3 rounded-2xl border border-[#28225a]">
          <div className="text-center font-mono pr-3 border-r border-[#28225a]">
            <span className="text-[10px] text-[#958da1] block font-sans">Synced Phones</span>
            <span className="text-sm font-bold text-emerald-400">{syncedPhonesCount} Nodes</span>
          </div>
          <div className="text-center font-mono pr-3 border-r border-[#28225a]">
            <span className="text-[10px] text-[#958da1] block font-sans">Handover Shifts</span>
            <span className="text-sm font-bold text-[#b5c4ff]">{handoverCount} Total</span>
          </div>
          <div className="text-center font-mono">
            <span className="text-[10px] text-[#958da1] block font-sans">Filter Precision</span>
            <span className="text-sm font-bold text-white">{precisionPercent}%</span>
          </div>
        </div>
      </div>

      {/* Sub-navigation for Demo Sections */}
      <div className="flex items-center gap-2 bg-[#0b013e] p-1.5 rounded-2xl border border-[#28225a] overflow-x-auto no-scrollbar">
        {[
          { id: 'sandbox', label: 'Interactive Simulator', icon: 'tune' },
          { id: 'diagnostics', label: 'Sensor Trust Math', icon: 'find_in_page' },
          { id: 'noise-filter', label: 'Noise Rejection Stream', icon: 'filter_alt' },
          { id: 'handovers', label: 'Handover Log', icon: 'hub' },
          { id: 'sectors', label: 'Coverage Gaps & Sectors', icon: 'analytics' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveDemoSection(tab.id as any)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-label-sm text-xs whitespace-nowrap transition-all ${
              activeDemoSection === tab.id
                ? 'bg-[#8b4dff] text-white font-bold shadow-md'
                : 'text-[#ccc3d8] hover:text-white hover:bg-[#19114b]'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* SECTION 1: INTERACTIVE SIMULATOR */}
      {activeDemoSection === 'sandbox' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Controls Left Column */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <h2 className="font-headline-sm text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8b4dff]">science</span>
                  Simulation Controls
                </h2>
                <span className="text-xs font-mono text-[#b5c4ff] px-2.5 py-0.5 rounded-full bg-[#28225a]">
                  Instant Pipeline Response
                </span>
              </div>

              <p className="font-body-sm text-xs text-[#ccc3d8]">
                Trigger specific transit conditions to demonstrate BusMate's resilient crowd tracking to hackathon evaluators:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Add Passenger */}
                <button
                  onClick={handleAddPassengers}
                  className="p-3.5 rounded-xl bg-[#1d164f] hover:bg-[#28225a] border border-[#332d65] text-left transition-all active:scale-95 group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-emerald-400 text-[20px]">person_add</span>
                    <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      High Confidence
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-xs text-white font-bold block">+ Add Passengers</span>
                    <span className="font-body-sm text-[11px] text-[#958da1]">
                      Ingests +2 passenger phones into Bus 21A quorum
                    </span>
                  </div>
                </button>

                {/* 2. Passenger Leaves Bus (Auto Handover) */}
                <button
                  onClick={handlePassengerLeavesBus}
                  className="p-3.5 rounded-xl bg-[#1d164f] hover:bg-[#28225a] border border-emerald-500/40 text-left transition-all active:scale-95 group flex flex-col justify-between gap-2 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-emerald-400 text-[20px]">exit_to_app</span>
                    <span className="font-mono text-[10px] text-emerald-300 font-bold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                      0ms Shift
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-xs text-white font-bold block">Passenger Leaves Bus</span>
                    <span className="font-body-sm text-[11px] text-emerald-200">
                      Drops highest-trust phone to test instant auto-handover
                    </span>
                  </div>
                </button>

                {/* 3. Drop Phone (<3) */}
                <button
                  onClick={handleDropPassengerPhone}
                  className="p-3.5 rounded-xl bg-[#1d164f] hover:bg-[#28225a] border border-amber-500/30 text-left transition-all active:scale-95 group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-amber-400 text-[20px]">person_remove</span>
                    <span className="font-mono text-[10px] text-amber-300 font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      Low Crowd
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-xs text-white font-bold block">- Drop Node (&lt;3 Phones)</span>
                    <span className="font-body-sm text-[11px] text-[#958da1]">
                      Triggers low-confidence warning tier &amp; explanatory note
                    </span>
                  </div>
                </button>

                {/* 4. Inject Noise Ping */}
                <button
                  onClick={handleInjectFalseSignals}
                  className="p-3.5 rounded-xl bg-[#1d164f] hover:bg-[#28225a] border border-[#ffb693]/30 text-left transition-all active:scale-95 group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#ffb693] text-[20px]">warning</span>
                    <span className="font-mono text-[10px] text-[#ffb693] font-bold bg-[#be581e]/30 px-2 py-0.5 rounded border border-[#be581e]/40">
                      Noise Filter
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-xs text-white font-bold block">Inject Stray False Signal</span>
                    <span className="font-body-sm text-[11px] text-[#958da1]">
                      Spawns a highway motorist ping to test active rejection
                    </span>
                  </div>
                </button>

                {/* 5. Simulate 30s Timeout */}
                <button
                  onClick={handleSimulateTimeout}
                  className="p-3.5 rounded-xl bg-[#1d164f] hover:bg-[#28225a] border border-rose-500/40 text-left transition-all active:scale-95 group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-rose-400 text-[20px]">sensors_off</span>
                    <span className="font-mono text-[10px] text-rose-300 font-bold bg-rose-950/60 px-2 py-0.5 rounded border border-rose-500/40">
                      30s Inactive
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-xs text-white font-bold block">Simulate 30s Timeout</span>
                    <span className="font-body-sm text-[11px] text-rose-200">
                      Tests "Bus Not Detected" latch and ETA suppression
                    </span>
                  </div>
                </button>

                {/* 6. Restore Signals */}
                <button
                  onClick={handleRestoreSignals}
                  className="p-3.5 rounded-xl bg-[#1d164f] hover:bg-[#28225a] border border-[#332d65] text-left transition-all active:scale-95 group flex flex-col justify-between gap-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="material-symbols-outlined text-[#b5c4ff] text-[20px]">restart_alt</span>
                    <span className="font-mono text-[10px] text-[#b5c4ff] font-bold bg-[#28225a] px-2 py-0.5 rounded">
                      Reset
                    </span>
                  </div>
                  <div>
                    <span className="font-label-md text-xs text-white font-bold block">Restore Test Signals</span>
                    <span className="font-body-sm text-[11px] text-[#958da1]">
                      Resets 5 high-confidence quorum phones on Bus 21A
                    </span>
                  </div>
                </button>
              </div>

              {/* Dwell Differentiation Quick Tests */}
              <div className="p-3.5 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col gap-2 mt-1">
                <span className="font-label-sm text-[11px] text-[#d2bcff] uppercase tracking-wider font-bold">
                  Stop Dwell Discrimination Tests
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      testStopDwellPhone();
                      showToast('Simulator: Bus at stop dwell test ping ingested (NOT rejected)');
                    }}
                    className="p-2.5 rounded-lg bg-[#19114b] hover:bg-[#28225a] border border-emerald-500/30 text-left text-xs font-semibold text-emerald-300 transition-all flex items-center justify-between"
                  >
                    <span>✓ Bus at Stop (Grouped Dwell)</span>
                    <span className="font-mono text-[10px] text-emerald-400">Accepted</span>
                  </button>
                  <button
                    onClick={() => {
                      testWaitingAtStopPhone();
                      showToast('Simulator: Solitary phone at stop ingested (REJECTED)');
                    }}
                    className="p-2.5 rounded-lg bg-[#19114b] hover:bg-[#28225a] border border-amber-500/30 text-left text-xs font-semibold text-amber-300 transition-all flex items-center justify-between"
                  >
                    <span>✕ Solitary at Stop (Waiting)</span>
                    <span className="font-mono text-[10px] text-amber-400">Rejected</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Real-Time Result & Effect Right Column */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Live Bus 21A State Card */}
            <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0055ea] animate-pulse"></span>
                  <h3 className="font-headline-sm text-base font-bold text-white">
                    Live Telemetry Output (Bus 21A)
                  </h3>
                </div>
                <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                  isBusNotDetected ? 'bg-rose-950 text-rose-300 border border-rose-500/40' : 'bg-emerald-950 text-emerald-300'
                }`}>
                  {isBusNotDetected ? 'Not Detected' : 'Online'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs font-label-sm">
                  <span className="text-[#958da1]">Tracking Phone:</span>
                  <span className="font-mono font-bold text-white">
                    {isBusNotDetected ? 'Offline' : activeTrackingPhone} ({primaryAcceptedSignal.trustScore}/100 Trust)
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-label-sm">
                  <span className="text-[#958da1]">ETA &amp; Confidence:</span>
                  <span className={`font-mono font-bold ${
                    isBusNotDetected
                      ? 'text-rose-400'
                      : etaConfidence.isLowConfidence
                      ? 'text-amber-400'
                      : 'text-emerald-300'
                  }`}>
                    {isBusNotDetected
                      ? `Last seen ${secondsSinceLastSeen}s ago (ETA Hidden)`
                      : etaConfidence.confidenceDisplay}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-label-sm">
                  <span className="text-[#958da1]">Synced Nodes:</span>
                  <span className="font-mono font-bold text-[#b5c4ff]">
                    {syncedPhonesCount} Commuter Phones
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-label-sm">
                  <span className="text-[#958da1]">Estimated Speed:</span>
                  <span className="font-mono font-bold text-white">
                    {isBusNotDetected ? '0 km/h' : `${estimatedBusPosition.speedKmh} km/h`}
                  </span>
                </div>

                {etaConfidence.isLowConfidence && !isBusNotDetected && (
                  <div className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-[11px] flex items-center gap-1.5 mt-1">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    <span><strong>Why:</strong> {etaConfidence.whyNote}</span>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-xl bg-[#0b013e] border border-[#28225a] flex flex-col gap-1.5 text-xs">
                <span className="font-label-sm text-[10px] text-[#958da1] uppercase font-bold">
                  Quorum Status
                </span>
                <p className="font-body-sm text-[11px] text-[#ccc3d8] leading-relaxed">
                  3 or more synchronized phones within 50m along the transit route confirm bus presence. Single devices are rejected to prevent false alerts.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: SENSOR DIAGNOSTICS & TRUST MATH */}
      {activeDemoSection === 'diagnostics' && (
        <div className="flex flex-col gap-4">
          <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-headline-sm text-base font-bold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#8b4dff]">find_in_page</span>
                  5-Factor Signal Trust Score Breakdown
                </h2>
                <p className="font-body-sm text-xs text-[#ccc3d8]">
                  Mathematical decomposition applied to every candidate phone signal in the corridor.
                </p>
              </div>
              <button
                onClick={() => {
                  verifySignal();
                  showToast('Signals verified against route centerline and speed thresholds');
                }}
                className="px-3 py-1.5 rounded-xl bg-[#28225a] hover:bg-[#8b4dff] text-white text-xs font-bold font-label-sm transition-all flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Verify All Nodes</span>
              </button>
            </div>

            {/* Candidate Selector */}
            <div className="flex flex-wrap gap-2 pt-1">
              {stoppedBusSignals[0] && (
                <button
                  onClick={() => setInspectedSignalId(stoppedBusSignals[0].id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    inspectedSignal.id === stoppedBusSignals[0].id
                      ? 'bg-emerald-500 text-black shadow-md'
                      : 'bg-[#19114b] text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  ✓ {stoppedBusSignals[0].phoneLabel} (Bus at Stop)
                </button>
              )}
              {waitingAtStopSignals[0] && (
                <button
                  onClick={() => setInspectedSignalId(waitingAtStopSignals[0].id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    inspectedSignal.id === waitingAtStopSignals[0].id
                      ? 'bg-amber-400 text-black shadow-md'
                      : 'bg-[#19114b] text-amber-300 border border-amber-500/40'
                  }`}
                >
                  ✕ {waitingAtStopSignals[0].phoneLabel} (Waiting at Stop)
                </button>
              )}
              {walkingSignals[0] && (
                <button
                  onClick={() => setInspectedSignalId(walkingSignals[0].id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                    inspectedSignal.id === walkingSignals[0].id
                      ? 'bg-rose-400 text-black shadow-md'
                      : 'bg-[#19114b] text-rose-300 border border-rose-500/40'
                  }`}
                >
                  ✕ {walkingSignals[0].phoneLabel} (Walking / Stray)
                </button>
              )}
              <button
                onClick={() => setInspectedSignalId(primaryAcceptedSignal.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  inspectedSignal.id === primaryAcceptedSignal.id
                    ? 'bg-[#8b4dff] text-white shadow-md'
                    : 'bg-[#19114b] text-[#d2bcff] border border-[#8b4dff]/40'
                }`}
              >
                ★ {primaryAcceptedSignal.phoneLabel} (Current Head)
              </button>
            </div>

            {/* Inspected Signal Deep-Dive Card */}
            <div className={`p-4 rounded-xl border flex flex-col gap-3 ${
              inspectedSignal.status === 'accepted'
                ? 'bg-[#100743] border-emerald-500/40'
                : 'bg-rose-950/20 border-rose-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={`w-3 h-3 rounded-full ${
                    inspectedSignal.status === 'accepted' ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-400'
                  }`} />
                  <div>
                    <span className="font-headline-sm text-base font-bold text-white block">
                      {inspectedSignal.phoneLabel}
                    </span>
                    <span className="text-xs text-[#ccc3d8]">
                      {inspectedSignal.status === 'accepted' ? 'Cluster Node Accepted' : `Rejected Candidate: ${inspectedSignal.rejectionReason}`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white px-3 py-1 rounded-full bg-[#19114b] border border-[#28225a]">
                    {inspectedSignal.trustScore} / 100 Trust Score
                  </span>
                  <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                    inspectedSignal.status === 'accepted' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-300'
                  }`}>
                    {inspectedSignal.status}
                  </span>
                </div>
              </div>

              {/* 5 Weighted Bars */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-mono pt-2">
                <div className="p-2.5 rounded-lg bg-[#19114b] flex flex-col gap-1">
                  <span className="text-[10px] text-[#958da1] font-sans">Route Match (30%)</span>
                  <span className="font-bold text-white">{inspectedSignal.routeMatchScore}%</span>
                  <div className="w-full bg-[#332d65] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0055ea] h-full" style={{ width: `${inspectedSignal.routeMatchScore}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#19114b] flex flex-col gap-1">
                  <span className="text-[10px] text-[#958da1] font-sans">Speed Pattern (20%)</span>
                  <span className="font-bold text-white">{inspectedSignal.speedPatternScore}%</span>
                  <div className="w-full bg-[#332d65] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0055ea] h-full" style={{ width: `${inspectedSignal.speedPatternScore}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#19114b] flex flex-col gap-1">
                  <span className="text-[10px] text-[#958da1] font-sans">Direction (20%)</span>
                  <span className="font-bold text-white">{inspectedSignal.directionScore}%</span>
                  <div className="w-full bg-[#332d65] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0055ea] h-full" style={{ width: `${inspectedSignal.directionScore}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#19114b] flex flex-col gap-1">
                  <span className="text-[10px] text-[#958da1] font-sans">Consistency (15%)</span>
                  <span className="font-bold text-white">{inspectedSignal.consistencyScore}%</span>
                  <div className="w-full bg-[#332d65] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#0055ea] h-full" style={{ width: `${inspectedSignal.consistencyScore}%` }} />
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-[#19114b] flex flex-col gap-1 col-span-2 md:col-span-1">
                  <span className="text-[10px] text-[#958da1] font-sans">Group Match (15%)</span>
                  <span className="font-bold text-white">{inspectedSignal.stayingWithGroupScore}%</span>
                  <div className="w-full bg-[#332d65] h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#8b4dff] h-full" style={{ width: `${inspectedSignal.stayingWithGroupScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: NOISE REJECTION STREAM */}
      {activeDemoSection === 'noise-filter' && (
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb693]">filter_alt</span>
                Noise Isolation Engine (Raw vs. Filtered)
              </h2>
              <p className="font-body-sm text-xs text-[#ccc3d8]">
                Eliminates pedestrians, parallel motorists, and stationary waiting passengers from bus telemetry.
              </p>
            </div>
            <span className="font-mono text-xs text-emerald-300 bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-500/30">
              {precisionPercent}% Noise Stripped
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raw Ingestion */}
            <div className="p-4 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-xs text-rose-300 font-bold uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span> Raw Commuter Ingestion
                </span>
                <span className="font-mono text-xs text-[#958da1]">{(signalsReceivedCount / 1000).toFixed(1)}k pings</span>
              </div>
              <p className="text-xs text-[#ccc3d8] leading-relaxed">
                Contains parallel motorists on highway, pedestrians walking along footpath, and passengers waiting at bus stops. High signal entropy.
              </p>
              <div className="mt-3 pt-2 border-t border-[#28225a] text-xs font-mono text-rose-300">
                {signalsRemovedCount.toLocaleString()} discarded non-transit signals
              </div>
            </div>

            {/* Filtered Bus Vectors */}
            <div className="p-4 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="font-label-sm text-xs text-emerald-300 font-bold uppercase flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Cleaned Transit Output
                </span>
                <span className="font-mono text-xs text-emerald-300 font-bold">Quorum Verified</span>
              </div>
              <p className="text-xs text-[#ccc3d8] leading-relaxed">
                Triangulates only clustered commuter phones moving at transit speeds along the published route polyline. Zero GPS hardware required on buses.
              </p>
              <div className="mt-3 pt-2 border-t border-[#28225a] text-xs font-mono text-emerald-300">
                Precision: {precisionPercent}% · Verified Fleet Coordinates
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: HANDOVER LOG */}
      {activeDemoSection === 'handovers' && (
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#0055ea]">hub</span>
                Automatic Handover Event Log
              </h2>
              <p className="font-body-sm text-xs text-[#ccc3d8]">
                Real-time tracking succession: When a passenger disembarks, tracking latches to the next cluster node with 0ms downtime.
              </p>
            </div>
            <button
              onClick={handleShiftTrackingPhone}
              className="px-3.5 py-1.5 rounded-xl bg-[#0055ea] hover:bg-[#0042b5] text-white font-label-sm text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Test Manual Handover
            </button>
          </div>

          <div className="flex flex-col gap-2.5 max-h-96 overflow-y-auto pr-1">
            {handoverLogs.length === 0 ? (
              <div className="p-8 rounded-xl bg-[#100743] border border-[#28225a] text-center text-xs text-[#958da1]">
                No handovers triggered yet. Click "Passenger Leaves Bus" or "Test Manual Handover" to execute.
              </div>
            ) : (
              handoverLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[10px] text-[#958da1]">{log.timestamp}</span>
                    <span className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                      0ms Shift
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-rose-300 line-through font-bold">{log.previousPhone}</span>
                    <span className="material-symbols-outlined text-[#8b4dff] text-[14px]">arrow_forward</span>
                    <span className="text-emerald-300 font-bold">{log.newPhone}</span>
                    <span className="ml-auto text-[#b5c4ff] text-[11px]">Trust: {log.trustScore}/100</span>
                  </div>
                  <p className="text-[11px] text-[#ccc3d8]">{log.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SECTION 5: COVERAGE GAPS & SECTORS */}
      {activeDemoSection === 'sectors' && (
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline-sm text-base font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-[#8b4dff]">analytics</span>
                Sector Density &amp; Corridor Coverage Health
              </h2>
              <p className="font-body-sm text-xs text-[#ccc3d8]">
                Passenger node distribution across Trans-Harbour sectors.
              </p>
            </div>
            <span className="font-mono text-xs text-white bg-[#28225a] px-3 py-1 rounded-full">
              Overall Signal Coverage: 94.2%
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sectors.map((sec) => (
              <div key={sec.id} className="p-4 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col justify-between gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block text-sm">{sec.sectorName}</span>
                    <span className="font-mono text-xs text-[#958da1]">{sec.routeRange}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    sec.status === 'congested' ? 'bg-[#be581e] text-white' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {sec.statusText}
                  </span>
                </div>

                <div className="flex items-center justify-between font-mono text-xs">
                  <span>Signals: <strong className="text-white">{sec.signalsCount}</strong></span>
                  <span>Headway: <strong className="text-[#b5c4ff]">{sec.headway}</strong></span>
                  <span>Flow: <strong className="text-emerald-400">{sec.flowRatePercent}%</strong></span>
                </div>

                <div className="w-full bg-[#19114b] h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${sec.status === 'congested' ? 'bg-[#be581e]' : 'bg-[#0055ea]'}`}
                    style={{ width: `${sec.flowRatePercent}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
