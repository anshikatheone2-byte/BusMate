import React, { useState, useEffect } from 'react';
import { BusLiveStatus, TransitStop } from '../../types';
import { INITIAL_BUSES, INITIAL_STOPS } from '../../data/transitData';
import { useSignals } from '../../context/SignalContext';
import { PassengerRouteSearch } from './PassengerRouteSearch';
import { TransitGeoMap } from '../common/TransitGeoMap';

interface PassengerLiveMapProps {
  selectedBus?: BusLiveStatus;
  onSelectBus: (bus: BusLiveStatus) => void;
}

export const PassengerLiveMap: React.FC<PassengerLiveMapProps> = ({
  selectedBus: propSelectedBus,
  onSelectBus,
}) => {
  const { syncedPhonesCount, estimatedBusPosition, etaConfidence, activeTrackingPhone } = useSignals();
  const [selectedBus, setSelectedBus] = useState<BusLiveStatus>(propSelectedBus || INITIAL_BUSES[0]);
  const [filterLayer, setFilterLayer] = useState<'all' | 'crowd' | 'bottlenecks'>('all');

  useEffect(() => {
    if (propSelectedBus) {
      setSelectedBus(propSelectedBus);
    }
  }, [propSelectedBus]);

  const isBus21A = selectedBus.id === 'bus-21a';
  const displaySpeed = isBus21A ? estimatedBusPosition.speedKmh : selectedBus.speed;
  const displayNodes = isBus21A ? syncedPhonesCount : selectedBus.clusterNodes;
  const displayTrackingPhone = isBus21A ? activeTrackingPhone : `Phone ${selectedBus.currentPhone}`;
  const displayConfidencePercent = isBus21A ? etaConfidence.confidencePercent : selectedBus.confidencePercent;
  const displayHeadway = isBus21A ? etaConfidence.confidenceDisplay : selectedBus.headwayText;

  const handleSelectAndTrack = (bus: BusLiveStatus) => {
    setSelectedBus(bus);
    onSelectBus(bus);
  };

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto px-4 py-4 space-y-3 pb-28">
      {/* Header Bar */}
      <div className="p-3.5 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-lg flex items-center justify-between">
        <div>
          <span className="font-label-sm text-[10px] uppercase text-[#958da1] tracking-wider font-bold">
            Live Transit Corridor
          </span>
          <h2 className="font-headline-sm text-base font-bold text-white">
            Live Map &amp; Tracking
          </h2>
        </div>
        <div className="flex items-center gap-1.5 bg-[#100743] px-3 py-1 rounded-full border border-[#28225a] text-xs font-label-sm text-emerald-300 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Live Tracking</span>
        </div>
      </div>

      {/* Route & Stop Search */}
      <PassengerRouteSearch
        currentBus={selectedBus}
        onSelectBus={handleSelectAndTrack}
      />

      {/* Layer Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setFilterLayer('all')}
          className={`px-3 py-1 rounded-full text-xs font-label-sm font-semibold whitespace-nowrap transition-all ${
            filterLayer === 'all'
              ? 'bg-[#8b4dff] text-white shadow-[0_0_12px_rgba(139,77,255,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8]'
          }`}
        >
          All Buses ({INITIAL_BUSES.length})
        </button>
        <button
          onClick={() => setFilterLayer('crowd')}
          className={`px-3 py-1 rounded-full text-xs font-label-sm font-semibold whitespace-nowrap transition-all ${
            filterLayer === 'crowd'
              ? 'bg-[#0055ea] text-white shadow-[0_0_12px_rgba(0,85,234,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8]'
          }`}
        >
          Active Buses
        </button>
        <button
          onClick={() => setFilterLayer('bottlenecks')}
          className={`px-3 py-1 rounded-full text-xs font-label-sm font-semibold whitespace-nowrap transition-all ${
            filterLayer === 'bottlenecks'
              ? 'bg-[#be581e] text-white shadow-[0_0_12px_rgba(190,88,30,0.4)]'
              : 'bg-[#28225a] text-[#ccc3d8]'
          }`}
        >
          Delays
        </button>
      </div>

      {/* Main Map View - Real Interactive Geographic Map */}
      <div className="relative h-80 rounded-2xl bg-[#080227] border border-[#28225a] overflow-hidden shadow-2xl">
        <TransitGeoMap
          mode="passenger"
          selectedBus={selectedBus}
          onSelectBus={handleSelectAndTrack}
          filterLayer={filterLayer}
        />
      </div>

      {/* Selected Bus Live Card - Commuter Friendly */}
      <div className="p-4 rounded-2xl bg-[#1d164f]/90 border border-[#28225a] shadow-lg flex flex-col gap-3">
        {/* Top Info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-xl bg-[#0055ea] text-white font-headline-sm text-lg font-extrabold flex items-center justify-center shadow-md">
              {selectedBus.name.replace('Bus ', '')}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-base font-bold text-white">
                  {selectedBus.name}
                </span>
                {/* Clear status badge: Bus approaching, Bus at stop, or Bus moving */}
                <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold uppercase tracking-wider ${
                  isBus21A && etaConfidence.isBusNotDetected
                    ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    : displaySpeed < 5
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                    : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                }`}>
                  {isBus21A && etaConfidence.isBusNotDetected
                    ? `Signal Paused`
                    : displaySpeed < 5
                    ? 'Bus at stop'
                    : (isBus21A ? etaConfidence.etaMinutes <= 3 : selectedBus.nextStopEtaMinutes && selectedBus.nextStopEtaMinutes <= 3)
                    ? 'Bus approaching'
                    : 'Bus moving'}
                </span>
              </div>
              <span className="font-body-sm text-xs text-[#b5c4ff] block mt-0.5">
                {selectedBus.route} • {selectedBus.direction}
              </span>
            </div>
          </div>

          {/* Simple Live Confidence Badge */}
          <div className="flex flex-col items-end">
            {isBus21A && etaConfidence.isBusNotDetected ? (
              <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-500/40">
                Offline
              </span>
            ) : isBus21A && etaConfidence.isLowConfidence ? (
              <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Low Confidence</span>
              </span>
            ) : selectedBus.confidenceLevel === 'Bottleneck' || selectedBus.confidenceLevel === 'Low Crowd' ? (
              <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Medium Confidence</span>
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full font-label-sm text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>High Confidence</span>
              </span>
            )}
            <span className="text-[11px] text-[#958da1] font-body-sm mt-1">
              {isBus21A && etaConfidence.isBusNotDetected ? 'Last known pos.' : `${displaySpeed} km/h live`}
            </span>
          </div>
        </div>

        {/* Commuter Metrics: ETA, Distance, Direction */}
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#28225a]/60 text-center">
          {/* 1. Estimated Arrival Time (ETA) */}
          <div className="p-2.5 rounded-xl bg-[#100743]">
            <span className="text-[10px] text-[#958da1] block font-medium">Estimated Arrival</span>
            <span className="text-sm font-bold text-white font-mono">
              {isBus21A && etaConfidence.isBusNotDetected
                ? 'Unavailable'
                : isBus21A
                ? `${etaConfidence.etaMinutes} mins`
                : `${selectedBus.nextStopEtaMinutes || 4} mins`}
            </span>
          </div>

          {/* 2. Distance from Stop */}
          <div className="p-2.5 rounded-xl bg-[#100743]">
            <span className="text-[10px] text-[#958da1] block font-medium">Distance Away</span>
            <span className="text-sm font-bold text-[#b5c4ff] font-mono">
              {isBus21A
                ? `${etaConfidence.remainingDistanceKm} km`
                : `${selectedBus.distanceKm || 1.4} km`}
            </span>
          </div>

          {/* 3. Direction moving */}
          <div className="p-2.5 rounded-xl bg-[#100743]">
            <span className="text-[10px] text-[#958da1] block font-medium">Direction</span>
            <span className="text-xs font-semibold text-[#d2bcff] truncate block">
              {selectedBus.nearestStop || 'Sanpada Jct'}
            </span>
          </div>
        </div>

        {/* Small reassuring message */}
        <div className="pt-1 flex items-center justify-between text-[11px] font-body-sm text-[#958da1]">
          <span className="flex items-center gap-1.5 text-[#ccc3d8]">
            <span className="material-symbols-outlined text-[14px] text-emerald-400">sensors</span>
            <span>Live location based on anonymous nearby signals</span>
          </span>
          {isBus21A && etaConfidence.isBusNotDetected && (
            <span className="text-rose-400 font-medium text-[10px]">
              Last seen {etaConfidence.secondsSinceLastSeen}s ago
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
