import React, { useState } from 'react';
import { BusLiveStatus, OccupancyLevel } from '../../types';
import { useSignals } from '../../context/SignalContext';
import { PassengerRouteSearch } from './PassengerRouteSearch';

interface PassengerHomeProps {
  bus: BusLiveStatus;
  onOpenSightingModal: () => void;
  onNavigateToTab: (tab: any) => void;
  onSelectBus?: (bus: BusLiveStatus) => void;
}

export const PassengerHome: React.FC<PassengerHomeProps> = ({
  bus,
  onOpenSightingModal,
  onNavigateToTab,
  onSelectBus,
}) => {
  const {
    syncedPhonesCount,
    estimatedBusPosition,
    etaConfidence,
  } = useSignals();

  const [isRouteActive, setIsRouteActive] = useState(true);
  const [points] = useState(94);
  const [occupancy, setOccupancy] = useState<OccupancyLevel>('seats_full');
  const [directionReverse, setDirectionReverse] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 py-4 space-y-4 pb-28">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[#8b4dff] text-white font-label-sm text-xs shadow-2xl flex items-center gap-2 border border-white/20 animate-bounce">
          <span className="material-symbols-outlined text-[16px]">info</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Brand Header: BusMate - Crowd-Powered Smart Bus Tracking */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#8b4dff] to-[#0055ea] flex items-center justify-center text-white shadow-[0_0_12px_rgba(139,77,255,0.5)]">
              <span className="material-symbols-outlined text-[20px]">directions_bus</span>
            </div>
            <h1 className="font-headline-sm text-xl font-black text-white tracking-tight">
              BusMate
            </h1>
          </div>
          <p className="font-label-sm text-xs text-[#b5c4ff] mt-0.5">
            Crowd-Powered Smart Bus Tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#d2bcff] font-bold bg-[#19114b] border border-[#28225a] px-2.5 py-1 rounded-full shadow-sm">
            {points} pts
          </span>
          <button
            onClick={onOpenSightingModal}
            className="p-2 rounded-xl bg-[#28225a] hover:bg-[#8b4dff] text-[#d2bcff] hover:text-white transition-all text-xs flex items-center gap-1 font-semibold"
            title="Report or Confirm Bus Sighting"
          >
            <span className="material-symbols-outlined text-[17px]">add_location_alt</span>
            <span className="hidden sm:inline">Report Sighting</span>
          </button>
        </div>
      </div>

      {/* Passenger Route Search (From, To, Swap, Direct / Connecting Results) */}
      <PassengerRouteSearch
        currentBus={bus}
        onSelectBus={(selected) => {
          if (onSelectBus) onSelectBus(selected);
          showToast(`Now tracking ${selected.name} live • ${selected.route.split(':')[0]}`);
        }}
        onOpenSightingModal={onOpenSightingModal}
        onNavigateToLiveMap={() => onNavigateToTab('live-map')}
      />

      {/* Active Corridor Live Radar Header Divider */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
          <span className="font-label-sm text-xs text-[#ccc3d8] font-bold uppercase tracking-wider">
            Active Bus Radar • {bus.name}
          </span>
        </div>
        <button
          onClick={() => onNavigateToTab('live-map')}
          className="text-xs font-label-sm text-[#b5c4ff] hover:text-white flex items-center gap-1 font-medium"
        >
          <span>Open Full Map</span>
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </button>
      </div>

      {/* Route Card Header */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-[0_8px_24px_rgba(6,3,15,0.6)] relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#0055ea] flex items-center justify-center text-white font-headline-sm text-lg font-extrabold shadow-[0_0_16px_rgba(0,85,234,0.5)]">
              {bus.name.replace('Bus ', '')}
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-headline-sm text-base font-bold text-white">
                <span>
                  {directionReverse
                    ? (bus.direction.includes('➔') ? bus.direction.split('➔').reverse().join(' ➔ ') : bus.direction)
                    : bus.direction}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-label-sm text-[#ccc3d8] mt-0.5">
                <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Live Tracking</span>
                </span>
                <span className="text-[#958da1]">•</span>
                <span className="text-[#b5c4ff]">{bus.sector}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setDirectionReverse(!directionReverse);
                showToast('Route direction inverted');
              }}
              className="p-2 rounded-xl bg-[#28225a]/70 hover:bg-[#332d65] text-[#b5c4ff] hover:text-white transition-all flex items-center gap-1 text-xs font-medium"
              title="Switch Direction"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              <span className="hidden sm:inline">Swap</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navi Mumbai Live Grid Radar Map */}
      <div className="rounded-2xl bg-[#0b013e] border border-[#28225a] shadow-xl overflow-hidden relative">
        {/* Map Header */}
        <div className="p-3.5 pb-2 flex items-center justify-between border-b border-[#1d164f]/60">
          <div>
            <span className="font-label-sm text-[10px] tracking-widest text-[#958da1] uppercase block font-bold">
              LIVE ROUTE MAP
            </span>
            <span className="font-mono text-[11px] text-[#ccc3d8]">
              {bus.route} • {bus.sector}
            </span>
          </div>
          {/* Simple Live Confidence Badge */}
          {bus.id === 'bus-21a' && etaConfidence.isBusNotDetected ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 font-label-sm text-[10px] font-bold tracking-wider uppercase">
              OFFLINE
            </span>
          ) : bus.id === 'bus-21a' && etaConfidence.isLowConfidence ? (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-amber-300 font-label-sm text-[10px] font-bold tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              LOW CONFIDENCE
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-label-sm text-[10px] font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(16,185,129,0.3)]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              HIGH CONFIDENCE
            </span>
          )}
        </div>

        {/* SVG Interactive Canvas */}
        <div className="relative h-64 w-full bg-[#080227] overflow-hidden select-none">
          {/* Ambient Grid Lines */}
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#8b4dff_1px,transparent_1px)] [background-size:16px_16px]"></div>

          <svg className="w-full h-full" viewBox="0 0 400 240">
            <defs>
              <linearGradient id="routeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00f2fe" />
                <stop offset="50%" stopColor="#8b4dff" />
                <stop offset="100%" stopColor="#2f6bff" />
              </linearGradient>
            </defs>

            {/* Subtle Roadway Contours */}
            <path
              d="M 20,40 Q 120,40 180,80 T 280,160 T 380,210"
              fill="none"
              stroke="#1d164f"
              strokeWidth="10"
              strokeLinecap="round"
            />
            <path
              d="M 20,40 Q 120,40 180,80 T 280,160 T 380,210"
              fill="none"
              stroke="#28225a"
              strokeWidth="2"
              strokeDasharray="4,4"
            />

            {/* Active Bus Route Glowing Path */}
            <path
              d="M 50,40 C 130,40 160,80 220,120 C 270,160 300,180 370,210"
              fill="none"
              stroke="url(#routeGlow)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Animated Flow Ring */}
            <circle r="3" fill="#00f2fe">
              <animateMotion
                path="M 50,40 C 130,40 160,80 220,120 C 270,160 300,180 370,210"
                dur="4s"
                repeatCount="indefinite"
              />
            </circle>

            {/* Stop 1: Vashi Stn */}
            <g transform="translate(50, 40)">
              <circle r="6" fill="#1d164f" stroke="#8b4dff" strokeWidth="2" />
              <circle r="2.5" fill="#d2bcff" />
              <text x="0" y="-10" textAnchor="middle" fill="#e4dfff" fontSize="9" fontWeight="600">
                Vashi Stn
              </text>
            </g>

            {/* Current Bus Token */}
            <g transform={`translate(${estimatedBusPosition.x}, ${estimatedBusPosition.y})`}>
              {/* Pulsing ring - hidden when not detected */}
              {!etaConfidence.isBusNotDetected && (
                <circle r="14" fill="none" stroke="#be581e" strokeWidth="1.5" opacity="0.6">
                  <animate attributeName="r" values="10;18;10" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.1;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
              {/* Bus Icon Container */}
              <rect
                x="-16"
                y="-9"
                width="32"
                height="18"
                rx="5"
                fill={etaConfidence.isBusNotDetected ? '#4b5563' : '#be581e'}
                stroke={etaConfidence.isBusNotDetected ? '#9ca3af' : '#ffdbcb'}
                strokeWidth="1"
                opacity={etaConfidence.isBusNotDetected ? 0.75 : 1}
              />
              <text x="0" y="3" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">
                🚌 {bus.name.replace('Bus ', '')}
              </text>

              {/* Status Pill */}
              <g transform="translate(20, -6)">
                <rect
                  x="0"
                  y="0"
                  width={etaConfidence.isBusNotDetected ? 116 : 88}
                  height="14"
                  rx="4"
                  fill="#0b013e"
                  opacity="0.95"
                  stroke={etaConfidence.isBusNotDetected ? '#ef4444' : '#0055ea'}
                  strokeWidth="0.8"
                />
                <circle
                  cx="6"
                  cy="7"
                  r="2"
                  fill={etaConfidence.isBusNotDetected ? '#ef4444' : estimatedBusPosition.speedKmh < 5 ? '#fbbf24' : '#34d399'}
                />
                <text x="12" y="10" fill="#ffffff" fontSize="7.5" fontWeight="bold">
                  {etaConfidence.isBusNotDetected
                    ? `Signal paused (${etaConfidence.secondsSinceLastSeen}s)`
                    : estimatedBusPosition.speedKmh < 5
                    ? 'At Stop'
                    : etaConfidence.etaMinutes <= 3
                    ? 'Approaching'
                    : `${estimatedBusPosition.speedKmh} km/h moving`}
                </text>
              </g>
            </g>

            {/* Stop 2: Juinagar */}
            <g transform="translate(175, 96)">
              <circle r="4" fill="#1d164f" stroke="#b5c4ff" strokeWidth="1.5" />
              <circle r="2" fill="#b5c4ff" />
              <text x="8" y="3" fill="#ccc3d8" fontSize="8">
                Juinagar
              </text>
            </g>

            {/* Stop 3: Nerul LP */}
            <g transform="translate(225, 135)">
              <circle r="4" fill="#1d164f" stroke="#8b4dff" strokeWidth="1.5" />
              <circle r="2" fill="#00f2fe" />
              <text x="8" y="3" fill="#ffffff" fontSize="8" fontWeight="bold">
                Nerul LP
              </text>
            </g>

            {/* Stop 4: Seawoods */}
            <g transform="translate(270, 168)">
              <circle r="4" fill="#1d164f" stroke="#b5c4ff" strokeWidth="1.5" />
              <circle r="2" fill="#b5c4ff" />
              <text x="8" y="3" fill="#ccc3d8" fontSize="8">
                Seawoods
              </text>
            </g>

            {/* Stop 5: CBD Belapur */}
            <g transform="translate(360, 208)">
              <circle r="6" fill="#1d164f" stroke="#00f2fe" strokeWidth="2" />
              <circle r="3" fill="#00f2fe" />
              <text x="-8" y="-8" textAnchor="end" fill="#ffffff" fontSize="9" fontWeight="bold">
                CBD Belapur
              </text>
            </g>
          </svg>

          {/* Reassuring Commuter Live Indicator (Bottom Left) */}
          <div className="absolute bottom-2.5 left-3 px-3 py-1 rounded-full bg-[#0b013e]/90 backdrop-blur-md border border-[#28225a] font-body-sm text-[11px] text-[#ccc3d8] flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live location based on anonymous nearby signals</span>
          </div>

          {/* Floating Map Controls (Bottom Right) */}
          <div className="absolute bottom-2.5 right-3 flex items-center gap-1.5">
            <button
              onClick={() => showToast('Corridor GPS grid recentered')}
              className="w-8 h-8 rounded-full bg-[#19114b]/90 hover:bg-[#28225a] text-[#b5c4ff] flex items-center justify-center border border-[#332d65] shadow-lg transition-all"
              title="Locate Current Bus"
            >
              <span className="material-symbols-outlined text-[18px]">near_me</span>
            </button>
            <button
              onClick={() => onNavigateToTab('live-map')}
              className="w-8 h-8 rounded-full bg-[#8b4dff] hover:bg-[#732ee6] text-white flex items-center justify-center shadow-[0_0_12px_rgba(139,77,255,0.5)] transition-all"
              title="Open Full Map"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Next Major Stop Card with Trust Dial */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-lg flex flex-col gap-3 relative overflow-hidden">
        {/* Top Handle Drag Pill decorative */}
        <div className="w-10 h-1 rounded-full bg-[#332d65] mx-auto -mt-1 mb-1"></div>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1 text-xs font-label-sm text-[#958da1] uppercase tracking-wider font-semibold">
              <span>NEXT MAJOR STOP</span>
              <span>•</span>
              <span>Stop #2 of 6</span>
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-white mt-0.5">
              {bus.nearestStop || 'Sanpada Jct'}
            </h2>
            <div className="flex flex-col gap-1.5 mt-1">
              {etaConfidence.isBusNotDetected ? (
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-headline-lg text-lg sm:text-xl font-bold font-mono tracking-tight text-rose-400">
                      Bus not detected, last seen {etaConfidence.secondsSinceLastSeen} seconds ago
                    </span>
                    <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold uppercase tracking-wider bg-rose-950/60 text-rose-300 border border-rose-500/40">
                      Offline · Location Held
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-label-sm px-2.5 py-1.5 rounded-xl border bg-rose-950/50 text-rose-200 border-rose-500/40">
                    <span className="material-symbols-outlined text-[16px] shrink-0">sensors_off</span>
                    <span>No nearby signals received for 30s. Showing last known stop position.</span>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <span className={`font-headline-lg text-3xl font-extrabold font-mono tracking-tight ${
                      etaConfidence.isLowConfidence
                        ? (etaConfidence.confidenceTier === 'critical_red' ? 'text-rose-400' : 'text-amber-400')
                        : 'text-white'
                    }`}>
                      ~{etaConfidence.etaMinutes} mins
                    </span>
                    {/* Clear status badge: Bus approaching, Bus at stop, or Bus moving */}
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[11px] font-bold uppercase tracking-wider border ${
                      estimatedBusPosition.speedKmh < 5
                        ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                        : etaConfidence.etaMinutes <= 3
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                        : 'bg-[#0055ea]/30 text-[#b5c4ff] border-[#0055ea]/40'
                    }`}>
                      {estimatedBusPosition.speedKmh < 5
                        ? 'Bus at stop'
                        : etaConfidence.etaMinutes <= 3
                        ? 'Bus approaching'
                        : 'Bus moving'}
                    </span>
                    <span className="font-body-sm text-xs text-[#ccc3d8]">
                      {etaConfidence.remainingDistanceKm} km away
                    </span>
                  </div>

                  {/* Clean low confidence reassurance note */}
                  {etaConfidence.isLowConfidence && (
                    <div className="flex items-center gap-1.5 text-xs font-label-sm px-2.5 py-1.5 rounded-xl border bg-amber-950/50 text-amber-200 border-amber-500/40">
                      <span className="material-symbols-outlined text-[16px] shrink-0 text-amber-400">
                        info
                      </span>
                      <span>
                        Fewer passenger signals nearby — live arrival time may adjust as bus approaches.
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Commuter Live Confidence & Direction */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {bus.id === 'bus-21a' && etaConfidence.isBusNotDetected ? (
              <span className="px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase tracking-wider bg-rose-950/80 text-rose-300 border border-rose-500/40">
                Offline
              </span>
            ) : bus.id === 'bus-21a' && etaConfidence.isLowConfidence ? (
              <span className="px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase tracking-wider bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span>Low Confidence</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full font-label-sm text-xs font-bold uppercase tracking-wider bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>High Confidence</span>
              </span>
            )}
            <span className="font-label-sm text-[11px] text-[#958da1]">
              {directionReverse ? 'Towards Vashi' : 'Towards CBD Belapur'}
            </span>
          </div>
        </div>

        {/* Bus Direction & Commuter Context */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#28225a]/60">
          <div className="p-2.5 rounded-xl bg-[#100743]/70 border border-[#28225a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#8b4dff] text-[20px]">explore</span>
            <div>
              <span className="font-label-sm text-[10px] text-[#958da1] uppercase block font-semibold">Direction</span>
              <span className="font-label-sm text-xs text-white font-medium">
                {directionReverse ? 'Westbound (Towards Vashi)' : 'Eastbound (Towards Belapur)'}
              </span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#100743]/70 border border-[#28225a] flex items-center gap-2">
            <span className="material-symbols-outlined text-[#00f2fe] text-[20px]">near_me</span>
            <div>
              <span className="font-label-sm text-[10px] text-[#958da1] uppercase block font-semibold">Distance to Stop</span>
              <span className="font-label-sm text-xs text-white font-medium">
                {etaConfidence.remainingDistanceKm} km from stop
              </span>
            </div>
          </div>
        </div>

        {/* Occupancy Indicator */}
        <div className="pt-2 border-t border-[#28225a]/60">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-xs text-[#ccc3d8] font-semibold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-[#b5c4ff]">airline_seat_recline_normal</span>
              <span>Bus Occupancy</span>
            </span>
            <span className="font-label-sm text-[11px] text-[#958da1]">Crowd-sourced</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => {
                setOccupancy('empty');
                showToast('Marked as Seats Available');
              }}
              className={`py-1.5 px-2 rounded-xl font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                occupancy === 'empty'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/60 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                  : 'bg-[#19114b] text-[#958da1] border border-[#28225a] hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span>Seats Empty</span>
            </button>
            <button
              onClick={() => {
                setOccupancy('seats_full');
                showToast('Marked as Seats Full');
              }}
              className={`py-1.5 px-2 rounded-xl font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                occupancy === 'seats_full'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-400/60 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                  : 'bg-[#19114b] text-[#958da1] border border-[#28225a] hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              <span>Seats Full</span>
            </button>
            <button
              onClick={() => {
                setOccupancy('crowded');
                showToast('Marked as Crowded');
              }}
              className={`py-1.5 px-2 rounded-xl font-label-sm text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                occupancy === 'crowded'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-400/60 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-[#19114b] text-[#958da1] border border-[#28225a] hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
              <span>Crowded</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live Crowd Sourcing Reassurance Note */}
      <div className="flex items-center justify-center gap-2 py-1 px-3 text-center text-xs font-body-sm text-[#958da1]">
        <span className="material-symbols-outlined text-[16px] text-emerald-400">cell_tower</span>
        <span>Live location based on anonymous passenger pings</span>
      </div>

      {/* Primary CTA Button: Broadcast Live Bus Sighting */}
      <div className="pt-2">
        <button
          onClick={onOpenSightingModal}
          className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#8b4dff] via-[#6933ea] to-[#0055ea] text-white font-headline-sm text-base font-extrabold shadow-[0_0_24px_rgba(139,77,255,0.6)] flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-[22px]">campaign</span>
          <span>Broadcast Live Bus Sighting</span>
        </button>
        <p className="font-label-sm text-center text-[11px] text-[#958da1] mt-2 tracking-wide">
          Zero login required • Verified by crowd confidence
        </p>
      </div>
    </div>
  );
};
