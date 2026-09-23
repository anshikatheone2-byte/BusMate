import React from 'react';
import { BusLiveStatus, AuthorityTab } from '../../types';
import { INITIAL_BUSES } from '../../data/transitData';
import { useSignals } from '../../context/SignalContext';

interface AuthorityOverviewProps {
  onNavigate?: (tab: AuthorityTab) => void;
  onSelectBus?: (bus: BusLiveStatus) => void;
}

interface FleetOverviewItem {
  id: string;
  name: string;
  route: string;
  statusBadge: string;
  statusType: 'normal' | 'delayed' | 'offline';
  locationName: string;
  contributingSignals: number;
  confidenceDisplay: string;
  etaDisplay: string;
  rawBus: BusLiveStatus;
}

export const AuthorityOverview: React.FC<AuthorityOverviewProps> = ({
  onNavigate,
  onSelectBus,
}) => {
  const {
    etaConfidence,
    syncedPhonesCount,
    isBusNotDetected,
    secondsSinceLastSeen,
  } = useSignals();

  // Dynamic Fleet State incorporating real-time context
  const fleetItems: FleetOverviewItem[] = [
    {
      id: INITIAL_BUSES[0].id,
      name: INITIAL_BUSES[0].name,
      route: INITIAL_BUSES[0].route,
      statusBadge: isBusNotDetected ? 'Signal Inactive' : 'On-Time · Tracked',
      statusType: isBusNotDetected ? 'offline' : 'normal',
      locationName: isBusNotDetected
        ? `Last seen ${secondsSinceLastSeen}s ago (Turbhe Sector 19)`
        : 'Turbhe Naka (Sector 19)',
      contributingSignals: isBusNotDetected ? 0 : syncedPhonesCount,
      confidenceDisplay: isBusNotDetected ? '0% (Offline)' : `${etaConfidence.confidencePercent}%`,
      etaDisplay: isBusNotDetected ? 'ETA Suppressed' : `${etaConfidence.etaMinutes} min to Sanpada Jct`,
      rawBus: INITIAL_BUSES[0],
    },
    {
      id: INITIAL_BUSES[1].id,
      name: INITIAL_BUSES[1].name,
      route: INITIAL_BUSES[1].route,
      statusBadge: 'Delayed (+12m)',
      statusType: 'delayed',
      locationName: 'Turbhe Flyover (Bottleneck)',
      contributingSignals: 5,
      confidenceDisplay: '88%',
      etaDisplay: '14 min to Belapur',
      rawBus: INITIAL_BUSES[1],
    },
    {
      id: INITIAL_BUSES[2].id,
      name: INITIAL_BUSES[2].name,
      route: INITIAL_BUSES[2].route,
      statusBadge: 'Signal Lost (4m ago)',
      statusType: 'offline',
      locationName: 'Sector 19 Sanpada (Last Known)',
      contributingSignals: 0,
      confidenceDisplay: '18%',
      etaDisplay: 'Awaiting Sighting',
      rawBus: INITIAL_BUSES[2],
    },
    {
      id: INITIAL_BUSES[3].id,
      name: INITIAL_BUSES[3].name,
      route: INITIAL_BUSES[3].route,
      statusBadge: 'On-Time · Tracked',
      statusType: 'normal',
      locationName: 'APMC Market Corridor',
      contributingSignals: 6,
      confidenceDisplay: '95%',
      etaDisplay: '4 min to APMC Market',
      rawBus: INITIAL_BUSES[3],
    },
  ];

  // Primary Metrics
  const activeBusesCount = fleetItems.filter((b) => b.statusType !== 'offline').length;
  const totalBuses = fleetItems.length;
  const overallConfidencePercent = isBusNotDetected ? 74 : 91;
  const activeAlertsCount = isBusNotDetected ? 3 : 2;
  const signalCoveragePercent = 94.2;

  const handleBusClick = (bus: BusLiveStatus) => {
    if (onSelectBus) {
      onSelectBus(bus);
    } else if (onNavigate) {
      onNavigate('live-map');
    }
  };

  return (
    <div className="flex flex-col w-full gap-6 pb-20 text-[#e4dfff]">
      {/* Executive Welcome & Operations Overview Banner */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#0b013e]/70 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Central Operations Dashboard
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-label-sm text-[10px] font-bold border border-emerald-500/30">
              Live Fleet Stream
            </span>
          </div>
          <h1 className="font-headline-sm text-xl md:text-2xl font-bold text-white mt-1">
            Navi Mumbai Corridor Fleet Overview
          </h1>
          <p className="font-body-sm text-xs text-[#ccc3d8] mt-1">
            Crowd-signal passenger pings triangulated across active routes with zero onboard GPS requirements.
          </p>
        </div>

        {/* Quick Route Filter / Jump to Map */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => onNavigate && onNavigate('live-map')}
            className="px-4 py-2.5 rounded-xl bg-[#8b4dff] hover:bg-[#732ee6] text-white font-label-sm text-xs font-bold shadow-md transition-all flex items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">map</span>
            <span>Open Live Fleet Map</span>
          </button>
          <button
            onClick={() => onNavigate && onNavigate('alerts')}
            className="px-3.5 py-2.5 rounded-xl bg-[#19114b] hover:bg-[#28225a] text-[#ffb693] font-label-sm text-xs font-bold border border-[#ffb693]/30 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            <span>{activeAlertsCount} Alerts</span>
          </button>
        </div>
      </div>

      {/* 4 PRIMARY KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Buses */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between transition-all hover:border-[#8b4dff]/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Active Buses
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#0055ea]/20 text-[#0055ea] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">directions_bus</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-2xl md:text-3xl font-extrabold text-white">
                {activeBusesCount}
              </span>
              <span className="font-mono text-xs text-[#958da1]">/ {totalBuses} Fleet</span>
            </div>
            <p className="font-body-sm text-xs text-[#ccc3d8] mt-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{activeBusesCount} currently being tracked</span>
            </p>
          </div>
        </div>

        {/* KPI 2: Tracking Confidence */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between transition-all hover:border-[#8b4dff]/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Tracking Confidence
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">verified</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-2xl md:text-3xl font-extrabold text-white">
                {overallConfidencePercent}%
              </span>
              <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
                {overallConfidencePercent >= 80 ? 'High' : 'Moderate'}
              </span>
            </div>
            <p className="font-body-sm text-xs text-[#ccc3d8] mt-1.5">
              {isBusNotDetected
                ? 'Bus 21A inactive; other corridors stable'
                : 'Crowd-signal quorum verified'}
            </p>
          </div>
        </div>

        {/* KPI 3: Active Alerts */}
        <div
          onClick={() => onNavigate && onNavigate('alerts')}
          className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between cursor-pointer transition-all hover:border-[#be581e]/60"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Active Alerts
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#be581e]/20 text-[#ffb693] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">warning</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-2xl md:text-3xl font-extrabold text-white">
                {activeAlertsCount}
              </span>
              <span className="px-2 py-0.5 rounded-full font-label-sm text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/30">
                {isBusNotDetected ? '2 Critical' : '1 Critical'}
              </span>
            </div>
            <p className="font-body-sm text-xs text-[#ffb693] mt-1.5 flex items-center gap-1">
              <span>View actionable exceptions</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </p>
          </div>
        </div>

        {/* KPI 4: Signal Coverage */}
        <div className="p-5 rounded-2xl bg-[#19114b]/80 backdrop-blur-xl border border-[#28225a] shadow-md flex flex-col justify-between transition-all hover:border-[#8b4dff]/50">
          <div className="flex items-center justify-between mb-2">
            <span className="font-label-sm text-xs text-[#958da1] uppercase tracking-wider font-bold">
              Signal Coverage
            </span>
            <div className="w-9 h-9 rounded-xl bg-[#8b4dff]/20 text-[#d2bcff] flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">cell_tower</span>
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="font-headline-lg text-2xl md:text-3xl font-extrabold text-white">
                {signalCoveragePercent}%
              </span>
              <span className="font-mono text-xs text-emerald-300">Corridor Active</span>
            </div>
            <p className="font-body-sm text-xs text-[#ccc3d8] mt-1.5">
              Passenger pings spanning all key stops
            </p>
          </div>
        </div>
      </div>

      {/* FLEET STATUS SECTION */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#0b013e]/70 backdrop-blur-xl border border-[#28225a] shadow-lg flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-headline-sm text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#8b4dff]">grid_view</span>
              Fleet Operational Status
            </h2>
            <p className="font-body-sm text-xs text-[#958da1]">
              Live status, contributing passenger signals, confidence, and location for active buses.
            </p>
          </div>
          <span className="font-mono text-xs text-[#b5c4ff] px-3 py-1 rounded-full bg-[#19114b] border border-[#28225a] self-start sm:self-auto">
            {activeBusesCount} of {totalBuses} Monitored
          </span>
        </div>

        {/* Fleet Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {fleetItems.map((bus) => {
            const statusBadgeColor =
              bus.statusType === 'offline'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : bus.statusType === 'delayed'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40';

            return (
              <div
                key={bus.id}
                onClick={() => handleBusClick(bus.rawBus)}
                className="p-4 md:p-5 rounded-2xl bg-[#19114b]/80 border border-[#28225a] shadow-md flex flex-col justify-between gap-4 cursor-pointer transition-all hover:border-[#8b4dff] hover:bg-[#1d164f] group"
              >
                <div>
                  {/* Top Bar: Bus Name, Route, and Status */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-headline-sm text-base md:text-lg font-bold text-white group-hover:text-[#d2bcff] transition-colors">
                          {bus.name}
                        </span>
                        <span className="font-mono text-xs text-[#b5c4ff] bg-[#100743] px-2 py-0.5 rounded border border-[#28225a]">
                          Route {bus.name.replace('Bus ', '')}
                        </span>
                      </div>
                      <span className="font-body-sm text-xs text-[#958da1] block mt-0.5">
                        {bus.route}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-full font-label-sm text-[11px] font-bold border ${statusBadgeColor}`}>
                      {bus.statusBadge}
                    </span>
                  </div>

                  {/* Middle Info: Location and Contributing Signals */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-[#28225a]/60 text-xs">
                    <div>
                      <span className="text-[#958da1] block text-[10px] uppercase font-bold">Current Location</span>
                      <span className="font-label-sm text-white font-semibold truncate block mt-0.5">
                        {bus.locationName}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#958da1] block text-[10px] uppercase font-bold">Contributing Signals</span>
                      <span className="font-mono text-emerald-300 font-bold block mt-0.5">
                        {bus.contributingSignals > 0
                          ? `${bus.contributingSignals} passenger signals`
                          : 'No active signals'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Metrics: Confidence and Next Stop ETA */}
                  <div className="grid grid-cols-2 gap-2 mt-2 font-mono text-xs">
                    <div>
                      <span className="text-[#958da1] block text-[10px] uppercase font-sans font-bold">
                        Tracking Confidence
                      </span>
                      <span className={`font-bold block mt-0.5 ${
                        bus.statusType === 'offline' ? 'text-rose-400' : 'text-white'
                      }`}>
                        {bus.confidenceDisplay}
                      </span>
                    </div>
                    <div>
                      <span className="text-[#958da1] block text-[10px] uppercase font-sans font-bold">Next Stop ETA</span>
                      <span className={`font-bold block mt-0.5 ${
                        bus.statusType === 'offline' ? 'text-[#958da1]' : 'text-[#b5c4ff]'
                      }`}>
                        {bus.etaDisplay}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-[#28225a]/60 flex items-center justify-between text-xs font-label-sm">
                  <span className="text-[#ccc3d8]">Click to inspect in Live Map</span>
                  <div className="flex items-center gap-1 text-[#8b4dff] group-hover:text-white font-bold transition-colors">
                    <span>View on Map</span>
                    <span className="material-symbols-outlined text-[16px] group-hover:translate-x-0.5 transition-transform">
                      arrow_forward
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
