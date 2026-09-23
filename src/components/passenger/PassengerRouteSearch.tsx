import React, { useState, useMemo } from 'react';
import { BusLiveStatus } from '../../types';
import { INITIAL_BUSES } from '../../data/transitData';
import { useSignals } from '../../context/SignalContext';
import {
  searchTransitRoutes,
  POPULAR_LOCATIONS,
  DEMO_PRESET_ROUTES,
  LocationSuggestion,
} from '../../utils/routePlanner';

interface PassengerRouteSearchProps {
  currentBus: BusLiveStatus;
  allBuses?: BusLiveStatus[];
  onSelectBus: (bus: BusLiveStatus) => void;
  onNavigateToLiveMap?: () => void;
  onOpenSightingModal?: () => void;
}

export const PassengerRouteSearch: React.FC<PassengerRouteSearchProps> = ({
  currentBus,
  allBuses = INITIAL_BUSES,
  onSelectBus,
  onNavigateToLiveMap,
}) => {
  const {
    syncedPhonesCount,
    estimatedBusPosition,
    etaConfidence,
    activeTrackingPhone,
    isBusNotDetected,
    secondsSinceLastSeen,
  } = useSignals();

  // Search input state - initialized with the judge demo route Ghansoli -> Vashi
  const [fromLocation, setFromLocation] = useState<string>('Ghansoli');
  const [toLocation, setToLocation] = useState<string>('Vashi');
  const [hasSearched, setHasSearched] = useState<boolean>(true);
  const [activeInput, setActiveInput] = useState<'from' | 'to' | null>(null);

  // Synchronize Bus 21A and other buses with live SignalContext telemetry
  const enrichedBuses = useMemo(() => {
    return allBuses.map((bus) => {
      if (bus.id === 'bus-21a') {
        return {
          ...bus,
          speed: isBusNotDetected ? 0 : estimatedBusPosition.speedKmh,
          clusterNodes: isBusNotDetected ? 0 : syncedPhonesCount,
          currentPhone: isBusNotDetected ? 'None' : activeTrackingPhone,
          confidencePercent: isBusNotDetected ? 0 : etaConfidence.confidencePercent,
          headwayText: isBusNotDetected ? 'Signal Lost' : etaConfidence.confidenceDisplay,
          confidenceLevel: isBusNotDetected
            ? ('Low Crowd' as const)
            : etaConfidence.isLowConfidence
            ? ('Low Crowd' as const)
            : ('High' as const),
          isNotDetected: isBusNotDetected,
          lastSeenSeconds: secondsSinceLastSeen,
          nextStopEtaMinutes: isBusNotDetected ? undefined : etaConfidence.etaMinutes,
          nearestStop: 'Sanpada Jct',
        };
      }
      return bus;
    });
  }, [
    allBuses,
    isBusNotDetected,
    estimatedBusPosition.speedKmh,
    syncedPhonesCount,
    activeTrackingPhone,
    etaConfidence,
    secondsSinceLastSeen,
  ]);

  // Compute search result using route planner
  const searchResult = useMemo(() => {
    if (!hasSearched || (!fromLocation.trim() && !toLocation.trim())) {
      return null;
    }
    return searchTransitRoutes(fromLocation, toLocation, enrichedBuses);
  }, [fromLocation, toLocation, hasSearched, enrichedBuses]);

  // Swap From and To
  const handleSwap = () => {
    const prevFrom = fromLocation;
    const prevTo = toLocation;
    setFromLocation(prevTo);
    setToLocation(prevFrom);
    setHasSearched(true);
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fromLocation.trim() && !toLocation.trim()) return;
    setHasSearched(true);
    setActiveInput(null);
  };

  const handleSelectPreset = (from: string, to: string) => {
    setFromLocation(from);
    setToLocation(to);
    setHasSearched(true);
    setActiveInput(null);
  };

  const handleSelectLocation = (loc: LocationSuggestion) => {
    if (activeInput === 'from') {
      setFromLocation(loc.name);
    } else if (activeInput === 'to') {
      setToLocation(loc.name);
    }
    setActiveInput(null);
    setHasSearched(true);
  };

  const handleViewLiveBus = (busToTrack?: BusLiveStatus) => {
    if (busToTrack) {
      onSelectBus(busToTrack);
    }
    if (onNavigateToLiveMap) {
      onNavigateToLiveMap();
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Route Search Box Container */}
      <div className="p-4 rounded-3xl bg-[#1d164f]/95 border border-[#332d65] shadow-[0_12px_36px_rgba(6,3,15,0.7)] flex flex-col gap-3 relative">
        <form onSubmit={handleSearch} className="flex flex-col gap-2.5">
          {/* FROM & TO Fields with Swap Action */}
          <div className="relative flex flex-col gap-2">
            {/* FROM Input */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-emerald-400">
                <span className="w-3 h-3 rounded-full border-2 border-emerald-400 bg-emerald-400/30 flex items-center justify-center"></span>
              </div>
              <input
                type="text"
                value={fromLocation}
                onChange={(e) => {
                  setFromLocation(e.target.value);
                  setHasSearched(true);
                }}
                onFocus={() => setActiveInput('from')}
                placeholder="Where are you right now? (From)"
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#100743] border border-[#28225a] text-white text-sm placeholder-[#958da1] focus:outline-none focus:border-[#8b4dff] focus:ring-2 focus:ring-[#8b4dff]/30 shadow-inner font-medium transition-all"
              />
              {fromLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setFromLocation('');
                    setActiveInput('from');
                  }}
                  className="absolute right-3 text-[#958da1] hover:text-white p-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            {/* Connecting Vertical Track Line & Swap Button */}
            <div className="relative flex items-center justify-between px-3 h-5">
              <div className="absolute left-[19px] -top-2.5 -bottom-2.5 w-0.5 bg-gradient-to-b from-emerald-400 via-[#8b4dff] to-[#ffb693] opacity-60"></div>
              <span className="text-[11px] font-label-sm text-[#958da1] ml-7">
                Enter stop, station or area
              </span>
              <button
                type="button"
                onClick={handleSwap}
                className="p-1.5 rounded-full bg-[#28225a] hover:bg-[#8b4dff] text-[#d2bcff] hover:text-white transition-all shadow-md flex items-center justify-center z-10"
                title="Swap From and To"
              >
                <span className="material-symbols-outlined text-[16px]">swap_vert</span>
              </button>
            </div>

            {/* TO Input */}
            <div className="relative flex items-center">
              <div className="absolute left-3.5 flex items-center pointer-events-none text-[#ffb693]">
                <span className="material-symbols-outlined text-[18px]">location_on</span>
              </div>
              <input
                type="text"
                value={toLocation}
                onChange={(e) => {
                  setToLocation(e.target.value);
                  setHasSearched(true);
                }}
                onFocus={() => setActiveInput('to')}
                placeholder="Where do you want to go? (To)"
                className="w-full pl-10 pr-10 py-3 rounded-2xl bg-[#100743] border border-[#28225a] text-white text-sm placeholder-[#958da1] focus:outline-none focus:border-[#8b4dff] focus:ring-2 focus:ring-[#8b4dff]/30 shadow-inner font-medium transition-all"
              />
              {toLocation && (
                <button
                  type="button"
                  onClick={() => {
                    setToLocation('');
                    setActiveInput('to');
                  }}
                  className="absolute right-3 text-[#958da1] hover:text-white p-1"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Autocomplete / Location Quick Suggestions Dropdown */}
          {activeInput && (
            <div className="p-2.5 rounded-2xl bg-[#100743] border border-[#332d65] shadow-xl flex flex-col gap-1.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between px-2 pb-1 text-[11px] font-label-sm text-[#958da1] border-b border-[#28225a]">
                <span>Select {activeInput === 'from' ? 'Pickup' : 'Destination'} Location</span>
                <button
                  type="button"
                  onClick={() => setActiveInput(null)}
                  className="hover:text-white"
                >
                  Dismiss
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => handleSelectLocation(loc)}
                    className="p-2 rounded-xl text-left hover:bg-[#28225a] transition-all flex flex-col"
                  >
                    <span className="font-headline-sm text-xs font-bold text-white flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-[#8b4dff]">
                        {loc.category === 'station' ? 'train' : loc.category === 'depot' ? 'directions_bus' : 'place'}
                      </span>
                      {loc.name}
                    </span>
                    <span className="text-[10px] text-[#958da1] truncate">{loc.subtext}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Buses Button */}
          <button
            type="submit"
            onClick={handleSearch}
            className="w-full py-3.5 px-4 rounded-2xl bg-[#8b4dff] hover:bg-[#7b3ae0] active:scale-[0.99] text-white font-headline-sm text-sm font-bold flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(139,77,255,0.4)] transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
            <span>Search Buses</span>
          </button>
        </form>

        {/* Recent Searches / Popular Route Pills */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-[#28225a]/60">
          <div className="flex items-center justify-between text-[11px] font-label-sm text-[#958da1]">
            <span className="flex items-center gap-1 font-semibold text-[#ccc3d8]">
              <span className="material-symbols-outlined text-[14px] text-[#8b4dff]">bolt</span>
              <span>Popular &amp; Demo Routes</span>
            </span>
            <span className="text-[10px]">One-tap demo search</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {DEMO_PRESET_ROUTES.map((route) => {
              const isSelected =
                fromLocation.toLowerCase() === route.from.toLowerCase() &&
                toLocation.toLowerCase() === route.to.toLowerCase();

              return (
                <button
                  key={route.label}
                  type="button"
                  onClick={() => handleSelectPreset(route.from, route.to)}
                  className={`px-3 py-1.5 rounded-full text-xs font-label-sm font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#0055ea] text-white shadow-[0_0_12px_rgba(0,85,234,0.5)]'
                      : 'bg-[#100743] text-[#ccc3d8] border border-[#28225a] hover:border-[#332d65] hover:text-white'
                  }`}
                >
                  <span>{route.label}</span>
                  {route.badge && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                        route.badge.includes('Connecting')
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {route.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* SEARCH RESULTS SECTION */}
      {searchResult && (
        <div className="flex flex-col gap-3">
          {/* CASE 1: DIRECT BUSES AVAILABLE */}
          {searchResult.hasDirect && searchResult.directBuses.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <h3 className="font-headline-sm text-sm font-bold text-white">
                    Direct Buses Available ({searchResult.directBuses.length})
                  </h3>
                </div>
                <span className="text-xs font-label-sm text-emerald-300 font-semibold bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Direct Route
                </span>
              </div>

              {/* Direct Bus Cards */}
              <div className="flex flex-col gap-3">
                {searchResult.directBuses.map((busOpt) => {
                  const isCurrentlyTracked = currentBus.id === busOpt.busId;

                  return (
                    <div
                      key={busOpt.busId}
                      className={`p-4 rounded-2xl border transition-all flex flex-col gap-3 relative overflow-hidden ${
                        isCurrentlyTracked
                          ? 'bg-[#1d164f] border-[#0055ea] ring-1 ring-[#0055ea]/60 shadow-[0_4px_24px_rgba(0,85,234,0.3)]'
                          : 'bg-[#1d164f]/95 border-[#28225a] hover:border-[#8b4dff]/50 shadow-lg'
                      }`}
                    >
                      {/* Header Row: Bus Name & Live Status */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-[#0055ea] text-white font-headline-sm text-base font-extrabold flex items-center justify-center shadow-md">
                            {busOpt.busNumber.replace('Bus ', '')}
                          </div>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span className="font-headline-sm text-base font-bold text-white">
                                {busOpt.busNumber}
                              </span>
                              {isCurrentlyTracked && (
                                <span className="px-2 py-0.5 rounded-full bg-[#0055ea] text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse">
                                  Live Active
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-label-sm text-[#ccc3d8]">
                              {busOpt.fromStop} ➔ {busOpt.toStop}
                            </span>
                          </div>
                        </div>

                        {/* Status Chip */}
                        <div className="flex flex-col items-end">
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs font-label-sm font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                            <span>{busOpt.status}</span>
                          </span>
                        </div>
                      </div>

                      {/* Metrics: ETA & Approx Travel Time */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[#100743] border border-[#28225a]/70">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#28225a] flex items-center justify-center text-emerald-400">
                            <span className="material-symbols-outlined text-[18px]">schedule</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#958da1] uppercase block font-semibold">
                              Estimated Arrival
                            </span>
                            <span className="font-headline-sm text-sm font-extrabold text-white">
                              {busOpt.etaMinutes} mins
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 border-l border-[#28225a] pl-3">
                          <div className="w-8 h-8 rounded-lg bg-[#28225a] flex items-center justify-center text-[#d2bcff]">
                            <span className="material-symbols-outlined text-[18px]">timer</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#958da1] uppercase block font-semibold">
                              Travel Time
                            </span>
                            <span className="font-headline-sm text-sm font-extrabold text-white">
                              ~{busOpt.travelTimeMinutes} mins
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Next Major Stops Route Chain */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-label-sm font-semibold text-[#958da1] uppercase tracking-wider flex items-center gap-1">
                          <span className="material-symbols-outlined text-[13px] text-[#8b4dff]">alt_route</span>
                          <span>Stops Along Route</span>
                        </span>
                        <div className="flex items-center gap-1 text-xs text-[#ccc3d8] overflow-x-auto no-scrollbar py-0.5">
                          {busOpt.nextMajorStops.map((stop, i) => (
                            <React.Fragment key={stop}>
                              <span className="px-2 py-0.5 rounded-lg bg-[#100743] border border-[#28225a] whitespace-nowrap font-medium text-[11px]">
                                {stop}
                              </span>
                              {i < busOpt.nextMajorStops.length - 1 && (
                                <span className="text-[#958da1] font-bold text-[10px]">➔</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Footer: Live Confidence & "View Live Bus" CTA */}
                      <div className="flex items-center justify-between pt-2 border-t border-[#28225a]/60">
                        <div className="flex items-center gap-1.5 text-xs text-[#d2bcff]">
                          <span className="material-symbols-outlined text-[15px] text-emerald-400">
                            sensors
                          </span>
                          <span className="font-medium text-[11px]">
                            {busOpt.liveTrackingText}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleViewLiveBus(busOpt.originalBus)}
                          className="px-4 py-2 rounded-xl bg-[#0055ea] hover:bg-[#0047c4] text-white text-xs font-headline-sm font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">map</span>
                          <span>View Live Bus</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* CASE 2: NO DIRECT BUS - SHOW SMART CONNECTING ROUTES */}
          {!searchResult.hasDirect && (
            <div className="flex flex-col gap-3">
              {/* Notice Banner */}
              <div className="p-3.5 rounded-2xl bg-amber-950/40 border border-amber-500/40 flex items-center gap-3 shadow-md">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[24px]">alt_route</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-headline-sm text-xs font-bold text-amber-200 uppercase tracking-wide">
                    Direct bus not available
                  </span>
                  <span className="text-xs text-[#ccc3d8] leading-tight">
                    We found practical connecting routes with seamless bus transfers.
                  </span>
                </div>
              </div>

              {/* Connecting Options */}
              {searchResult.connectingOptions.map((opt) => (
                <div
                  key={opt.id}
                  className="p-4 rounded-3xl bg-[#1d164f]/95 border border-[#332d65] shadow-xl flex flex-col gap-3"
                >
                  {/* Option Title & Total Time Summary */}
                  <div className="flex items-center justify-between pb-2 border-b border-[#28225a]">
                    <div>
                      <h4 className="font-headline-sm text-sm font-bold text-white">
                        {opt.title}
                      </h4>
                      <span className="text-xs font-label-sm text-[#b5c4ff]">
                        Change bus at <span className="text-white font-bold">{opt.transferStop}</span>
                      </span>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="font-headline-sm text-base font-extrabold text-[#d2bcff]">
                        ~{opt.totalJourneyMinutes} mins
                      </span>
                      <span className="text-[10px] text-[#958da1] font-label-sm">
                        {opt.totalTransfers} Transfer
                      </span>
                    </div>
                  </div>

                  {/* Visual Step-by-Step Connecting Flow */}
                  <div className="flex flex-col gap-2 relative">
                    {/* START POINT */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">
                        A
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#958da1] uppercase font-semibold">
                          Departure Stop
                        </span>
                        <span className="font-headline-sm text-xs font-bold text-white">
                          {opt.legs[0]?.boardingStop || fromLocation}
                        </span>
                      </div>
                    </div>

                    {/* Arrow down */}
                    <div className="ml-3 my-0.5 border-l-2 border-dashed border-[#8b4dff]/60 h-4"></div>

                    {/* LEG 1 BUS CARD */}
                    <div className="p-3 rounded-2xl bg-[#100743] border border-[#28225a] flex flex-col gap-2 shadow-inner">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-lg bg-[#0055ea] text-white font-headline-sm text-xs font-bold flex items-center justify-center">
                            🚌
                          </span>
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-xs font-bold text-white">
                              {opt.legs[0].busNumber}
                            </span>
                            <span className="text-[11px] text-[#b5c4ff]">
                              {opt.legs[0].routeTitle}
                            </span>
                          </div>
                        </div>

                        <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                          {opt.legs[0].liveStatusText}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#28225a]/50 text-[#ccc3d8]">
                        <div className="flex items-center gap-3">
                          <span>ETA: <strong className="text-white">{opt.legs[0].estimatedWaitMinutes} min</strong></span>
                          <span>•</span>
                          <span>Travel: <strong className="text-white">~{opt.legs[0].estimatedTravelMinutes} min</strong></span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleViewLiveBus(opt.legs[0].originalBus)}
                          className="px-2.5 py-1 rounded-lg bg-[#28225a] hover:bg-[#0055ea] text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                        >
                          <span className="material-symbols-outlined text-[13px]">map</span>
                          <span>Track Leg 1</span>
                        </button>
                      </div>
                    </div>

                    {/* Arrow down */}
                    <div className="ml-3 my-0.5 border-l-2 border-dashed border-[#8b4dff]/60 h-4"></div>

                    {/* TRANSFER HUB BANNER */}
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-amber-200 text-xs font-bold">
                        <span className="material-symbols-outlined text-[18px] text-amber-400">
                          sync_alt
                        </span>
                        <span>Change bus at {opt.transferStop}</span>
                      </div>
                      <span className="text-[11px] font-label-sm text-[#ffb693] font-semibold">
                        Est. {opt.transferWaitMinutes} min wait
                      </span>
                    </div>

                    {/* Arrow down */}
                    <div className="ml-3 my-0.5 border-l-2 border-dashed border-[#8b4dff]/60 h-4"></div>

                    {/* LEG 2 BUS CARD */}
                    {opt.legs[1] && (
                      <div className="p-3 rounded-2xl bg-[#100743] border border-[#28225a] flex flex-col gap-2 shadow-inner">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-[#8b4dff] text-white font-headline-sm text-xs font-bold flex items-center justify-center">
                              🚌
                            </span>
                            <div className="flex flex-col">
                              <span className="font-headline-sm text-xs font-bold text-white">
                                {opt.legs[1].busNumber}
                              </span>
                              <span className="text-[11px] text-[#b5c4ff]">
                                {opt.legs[1].routeTitle}
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                            {opt.legs[1].liveStatusText}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-[#28225a]/50 text-[#ccc3d8]">
                          <div className="flex items-center gap-3">
                            <span>Departs: <strong className="text-white">~{opt.legs[1].estimatedWaitMinutes} min after arrival</strong></span>
                            <span>•</span>
                            <span>Travel: <strong className="text-white">~{opt.legs[1].estimatedTravelMinutes} min</strong></span>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleViewLiveBus(opt.legs[1].originalBus)}
                            className="px-2.5 py-1 rounded-lg bg-[#28225a] hover:bg-[#8b4dff] text-white text-[11px] font-bold flex items-center gap-1 transition-all"
                          >
                            <span className="material-symbols-outlined text-[13px]">map</span>
                            <span>Track Leg 2</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Arrow down */}
                    <div className="ml-3 my-0.5 border-l-2 border-dashed border-[#8b4dff]/60 h-4"></div>

                    {/* DESTINATION ARRIVAL */}
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#ffb693]/20 border-2 border-[#ffb693] text-[#ffb693] flex items-center justify-center text-xs font-bold shrink-0">
                        B
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-[#958da1] uppercase font-semibold">
                          Final Destination
                        </span>
                        <span className="font-headline-sm text-xs font-bold text-white">
                          {opt.legs[1]?.dropOffStop || toLocation} (Arrive in ~{opt.totalJourneyMinutes} mins)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
