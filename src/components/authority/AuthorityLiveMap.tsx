import React, { useState } from 'react';
import { BusLiveStatus } from '../../types';
import { INITIAL_BUSES, INITIAL_STOPS } from '../../data/transitData';
import { useSignals } from '../../context/SignalContext';
import { TransitGeoMap } from '../common/TransitGeoMap';

interface AuthorityLiveMapProps {
  selectedBus?: BusLiveStatus;
  onSelectBus?: (bus: BusLiveStatus) => void;
}

export const AuthorityLiveMap: React.FC<AuthorityLiveMapProps> = ({
  selectedBus: propSelectedBus,
  onSelectBus,
}) => {
  const {
    acceptedSignals,
    rejectedSignals,
    noiseRejectedCount,
    syncedPhonesCount,
    precisionPercent,
    activeTrackingPhone,
    primaryAcceptedSignal,
    estimatedBusPosition,
    etaConfidence,
    handoverCount,
    isBusNotDetected,
    secondsSinceLastSeen,
  } = useSignals();

  const [internalSelectedBus, setInternalSelectedBus] = useState<BusLiveStatus>(
    propSelectedBus || INITIAL_BUSES[0]
  );
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync if propSelectedBus changes
  React.useEffect(() => {
    if (propSelectedBus) {
      setInternalSelectedBus(propSelectedBus);
      setIsInspectorOpen(true);
    }
  }, [propSelectedBus]);

  const selectedBus = propSelectedBus || internalSelectedBus;

  const handleSelectBus = (bus: BusLiveStatus) => {
    setInternalSelectedBus(bus);
    if (onSelectBus) {
      onSelectBus(bus);
    }
    setIsInspectorOpen(true);
  };

  return (
    <div className="relative w-full h-[calc(100vh-4rem)] bg-[#080227] text-[#e4dfff] overflow-hidden select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-50 px-4 py-2 rounded-xl bg-[#8b4dff] text-white font-label-sm text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[18px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Overlay HUD Bar */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3 bg-[#0b013e]/90 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-[#28225a] shadow-2xl max-w-xl">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0055ea] shadow-[0_0_12px_rgba(0,85,234,0.9)] animate-pulse"></span>
            <span className="font-label-lg text-xs text-white font-extrabold tracking-wider uppercase">
              ZONE 04: NAVI MUMBAI TRANSIT CORRIDOR
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#958da1]">
            19.0330° N, 73.0297° E • THANE CREEK TRANS-HARBOUR
          </span>
        </div>

        <div className="hidden sm:flex items-center gap-3 pl-3 border-l border-[#28225a] text-[10px] font-mono">
          <div>
            <span className="text-[#958da1] block">ENGINE</span>
            <span className="text-emerald-400 font-bold">60 FPS REAL-TIME</span>
          </div>
          <div>
            <span className="text-[#958da1] block">CLUSTERS</span>
            <span className="text-[#d2bcff] font-bold">48 ACTIVE</span>
          </div>
          <div>
            <span className="text-[#958da1] block">FILTER</span>
            <span className="text-[#b5c4ff] font-bold">{precisionPercent}% PRECISION</span>
          </div>
        </div>
      </div>

      {/* Real Interactive Geographic Fleet Monitoring Map */}
      <div className="relative w-full h-full">
        <TransitGeoMap
          mode="authority"
          selectedBus={selectedBus}
          onSelectBus={handleSelectBus}
        />
      </div>

      {/* Floating Right Slideout Inspector Drawer for Selected Bus (Image 9 exact match!) */}
      {isInspectorOpen && (
        <div className="absolute right-4 top-4 bottom-14 w-96 bg-[#1d164f]/95 backdrop-blur-2xl z-30 rounded-2xl border border-[#332d65] shadow-[0_12px_40px_rgba(6,3,15,0.9)] p-4 flex flex-col justify-between overflow-y-auto no-scrollbar">
          <div className="flex flex-col gap-3">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-[#28225a]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#0055ea] flex items-center justify-center text-white font-mono text-base font-bold shadow-md">
                  {selectedBus.name.replace('Bus ', '')}
                </div>
                <div>
                  <h3 className="font-headline-sm text-base font-bold text-white">
                    {selectedBus.name} Live Status
                  </h3>
                  <span className="font-label-sm text-xs text-[#b5c4ff] block font-mono">
                    {selectedBus.route} • {selectedBus.sector}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsInspectorOpen(false)}
                className="p-1 rounded-lg text-[#958da1] hover:text-white hover:bg-[#28225a] transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Primary Bus Operational Information Panel */}
            {(() => {
              const is21A = selectedBus.id === 'bus-21a' || selectedBus.name.includes('21A');
              const is21B = selectedBus.id === 'bus-21b' || selectedBus.name.includes('21B');
              const is15 = selectedBus.id === 'bus-15c' || selectedBus.id === 'bus-15d' || selectedBus.name.includes('15');

              // Status
              const liveStatus = is21A
                ? (isBusNotDetected ? 'Signal Inactive' : 'On-Time · In Motion')
                : is21B
                ? 'Bottleneck Delay (+12m)'
                : is15
                ? 'Signal Lost (4m ago)'
                : 'On Schedule';

              const statusBadgeStyle = is21A
                ? (isBusNotDetected
                    ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    : etaConfidence.isLowConfidence
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30')
                : is21B
                ? 'bg-[#be581e]/30 text-[#ffb693] border-[#be581e]/50'
                : is15
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/30';

              // ETA
              const etaText = is21A
                ? (isBusNotDetected
                    ? 'ETA Suppressed (Inactivity)'
                    : `${etaConfidence.etaMinutes} min to Sanpada Jct (${etaConfidence.remainingDistanceKm} km)`)
                : is21B
                ? '14 min to Belapur (3.8 km)'
                : is15
                ? 'Awaiting Sighting'
                : '4 min to APMC Market (1.2 km)';

              // Confidence
              const confidenceText = is21A
                ? (isBusNotDetected ? '0% (Offline)' : `${etaConfidence.confidencePercent}% (${etaConfidence.confidenceDisplay})`)
                : is21B
                ? '88% (High Confidence)'
                : is15
                ? '18% (Low Confidence)'
                : '95% (High Confidence)';

              // Location
              const locationText = is21A
                ? (isBusNotDetected
                    ? 'Turbhe Sector 19 (Last Known)'
                    : 'Turbhe Naka (Sector 19) • 19.0330° N, 73.0297° E')
                : is21B
                ? 'Turbhe Flyover Corridor • 19.0412° N, 73.0189° E'
                : is15
                ? 'Sector 19 Sanpada • 19.0601° N, 73.0102° E'
                : 'APMC Market Corridor • 19.0711° N, 73.0142° E';

              // Contributing Signals
              const signalsCount = is21A
                ? (isBusNotDetected ? 0 : syncedPhonesCount)
                : is21B
                ? 5
                : is15
                ? 0
                : 6;

              // Last Update
              const lastUpdateTime = is21A
                ? (isBusNotDetected ? `Last seen ${secondsSinceLastSeen}s ago` : '8 seconds ago (Live stream)')
                : is21B
                ? '14 seconds ago'
                : is15
                ? '4 minutes ago'
                : '6 seconds ago';

              // Handover Status
              const handoverStatus = is21A
                ? (isBusNotDetected
                    ? 'Offline'
                    : `Active (${activeTrackingPhone} · Standby nodes ready)`)
                : is21B
                ? 'Active (Node #B4 ready)'
                : is15
                ? 'Inactive / No nodes in range'
                : 'Active (Node #D1 ready)';

              return (
                <div className="flex flex-col gap-3">
                  {/* Status & ETA Card */}
                  <div className="p-3.5 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-label-sm text-[10px] text-[#958da1] uppercase tracking-wider font-bold">
                        Live Status
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold border ${statusBadgeStyle}`}>
                        {liveStatus}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-[#958da1] uppercase font-bold font-sans">
                        Estimated Arrival
                      </span>
                      <span className="font-headline-sm text-lg font-bold text-white font-mono">
                        {etaText}
                      </span>
                    </div>
                  </div>

                  {/* Core Metrics Grid */}
                  <div className="p-3.5 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col gap-3 text-xs">
                    {/* Tracking Confidence */}
                    <div className="flex items-start justify-between pb-2 border-b border-[#28225a]/60">
                      <div>
                        <span className="text-[#958da1] block text-[10px] uppercase font-bold">
                          Tracking Confidence
                        </span>
                        <span className={`font-mono text-sm font-bold ${
                          is15 || isBusNotDetected ? 'text-rose-400' : 'text-emerald-300'
                        }`}>
                          {confidenceText}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">
                        verified
                      </span>
                    </div>

                    {/* Current Location */}
                    <div className="flex flex-col gap-0.5 pb-2 border-b border-[#28225a]/60">
                      <span className="text-[#958da1] text-[10px] uppercase font-bold">
                        Current Location
                      </span>
                      <span className="font-label-sm text-white font-semibold leading-relaxed">
                        {locationText}
                      </span>
                    </div>

                    {/* Contributing Passenger Signals */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#28225a]/60">
                      <div>
                        <span className="text-[#958da1] block text-[10px] uppercase font-bold">
                          Contributing Passenger Signals
                        </span>
                        <span className="font-mono text-xs font-bold text-white">
                          {signalsCount > 0 ? `${signalsCount} passenger signals contributing` : '0 active signals'}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-[#0055ea]">
                        group
                      </span>
                    </div>

                    {/* Last Update Time */}
                    <div className="flex items-center justify-between pb-2 border-b border-[#28225a]/60">
                      <div>
                        <span className="text-[#958da1] block text-[10px] uppercase font-bold">
                          Last Update
                        </span>
                        <span className="font-mono text-xs text-[#b5c4ff]">
                          {lastUpdateTime}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-[#958da1]">
                        schedule
                      </span>
                    </div>

                    {/* Tracking Handover Status */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[#958da1] block text-[10px] uppercase font-bold">
                          Tracking Handover Status
                        </span>
                        <span className="font-mono text-xs text-white">
                          {handoverStatus}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-[18px] text-[#8b4dff]">
                        hub
                      </span>
                    </div>
                  </div>

                  {/* Expandable More Details Section */}
                  <div className="p-3 rounded-xl bg-[#100743] border border-[#28225a] flex flex-col gap-2">
                    <button
                      onClick={() => setShowMoreDetails(!showMoreDetails)}
                      className="w-full flex items-center justify-between text-xs font-label-sm text-[#d2bcff] font-bold py-0.5 hover:text-white transition-colors"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[16px]">tune</span>
                        <span>{showMoreDetails ? 'Hide Detailed Variables' : 'More Details'}</span>
                      </span>
                      <span className="material-symbols-outlined text-[18px] transition-transform" style={{
                        transform: showMoreDetails ? 'rotate(180deg)' : 'none'
                      }}>
                        expand_more
                      </span>
                    </button>

                    {showMoreDetails && (
                      <div className="pt-2 border-t border-[#28225a]/60 flex flex-col gap-2 font-mono text-[11px] text-[#ccc3d8]">
                        <div className="flex items-center justify-between">
                          <span className="text-[#958da1] font-sans">Speed (30s Avg):</span>
                          <span className="text-white font-bold">
                            {is21A ? (isBusNotDetected ? '0 km/h' : `${etaConfidence.averageSpeed30sKmh} km/h`) : '24 km/h'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#958da1] font-sans">Route Alignment:</span>
                          <span className="text-emerald-300 font-bold">&lt; 15m centerline</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#958da1] font-sans">Quorum Threshold:</span>
                          <span className="text-white font-bold">&ge; 3 Synchronized Nodes</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[#958da1] font-sans">Filter Precision:</span>
                          <span className="text-white font-bold">{precisionPercent}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Observation Note (Authority dispatch trigger removed) */}
          <div className="pt-3 border-t border-[#28225a]">
            <div className="p-2.5 rounded-xl bg-[#100743] border border-[#28225a] text-center">
              <span className="font-label-sm text-xs text-[#958da1] flex items-center justify-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>Passive Monitoring Mode Active</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Sector Health & Corridor Status Bar */}
      <div className="absolute bottom-2 left-4 right-4 z-20 hidden md:flex items-center justify-between p-2.5 rounded-2xl bg-[#0b013e]/90 backdrop-blur-xl border border-[#28225a] shadow-xl text-xs font-label-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Sector 1 (Vashi ➔ Sanpada): <strong className="text-white">98% Normal</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Sector 2 (Turbhe Flyover): <strong className="text-amber-300">Bottleneck (8 km/h)</strong></span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Sector 3 (Juinagar ➔ Nerul): <strong className="text-white">96% Optimal</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-[#958da1]">
          <span>Noise Rejected: <strong className="text-[#ffb693]">{noiseRejectedCount.toLocaleString()}</strong></span>
          <button
            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
            className="px-2.5 py-1 rounded-lg bg-[#28225a] text-[#b5c4ff] hover:text-white transition-colors"
          >
            {isInspectorOpen ? 'Hide Inspector' : 'Show Inspector'}
          </button>
        </div>
      </div>
    </div>
  );
};
