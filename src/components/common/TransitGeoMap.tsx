import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { BusLiveStatus, TransitStop } from '../../types';
import { INITIAL_BUSES, INITIAL_STOPS } from '../../data/transitData';
import { useSignals } from '../../context/SignalContext';

export interface TransitGeoMapProps {
  mode: 'passenger' | 'authority';
  selectedBus: BusLiveStatus;
  onSelectBus: (bus: BusLiveStatus) => void;
  filterLayer?: 'all' | 'crowd' | 'bottlenecks';
  className?: string;
}

// Full corridor polyline connecting all real transit stops from Ghansoli to Kharghar
const CORRIDOR_POLYLINE: [number, number][] = INITIAL_STOPS.map((s) => [s.lat, s.lng]);

export const TransitGeoMap: React.FC<TransitGeoMapProps> = ({
  mode,
  selectedBus,
  onSelectBus,
  filterLayer = 'all',
  className = 'w-full h-full',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const {
    estimatedBusPosition,
    syncedPhonesCount,
    etaConfidence,
    acceptedSignals,
    rejectedSignals,
    isBusNotDetected,
    secondsSinceLastSeen,
  } = useSignals();

  // 1. Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Center on the central Navi Mumbai transit corridor (Sanpada / Nerul area)
    const initialCenter: [number, number] = [19.055, 73.025];
    const initialZoom = mode === 'passenger' ? 12 : 12;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark Matter tile layer from CARTO / OpenStreetMap
    // CARTO requires a free API key (passed via ?key= parameter) to remove the "API KEY REQUIRED" watermark.
    const cartoApiKey =
      (import.meta.env.VITE_CARTO_API_KEY ||
        import.meta.env.VITE_CARTO_KEY ||
        import.meta.env.VITE_MAP_API_KEY ||
        '').trim();

    const tileUrl = cartoApiKey
      ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoApiKey)}`
      : 'https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png';

    L.tileLayer(tileUrl, {
      subdomains: 'abcd',
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    // Glow Polyline (wider translucent base)
    L.polyline(CORRIDOR_POLYLINE, {
      color: '#0055ea',
      weight: 8,
      opacity: 0.35,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Primary Neon Transit Polyline
    L.polyline(CORRIDOR_POLYLINE, {
      color: '#8b4dff',
      weight: 4,
      opacity: 0.9,
      lineCap: 'round',
      lineJoin: 'round',
    }).addTo(map);

    // Secondary Route branch (Palm Beach / Sanpada divergence to Turbhe)
    const PALM_BEACH_BRANCH: [number, number][] = [
      [19.0620, 73.0180], // Sanpada Jct
      [19.0510, 73.0190], // Palm Beach Divergence
      [19.0330, 73.0297], // Nerul LP Hub
    ];
    L.polyline(PALM_BEACH_BRANCH, {
      color: '#00f2fe',
      weight: 3,
      opacity: 0.65,
      dashArray: '6, 6',
      lineCap: 'round',
    }).addTo(map);

    // Dedicated markers LayerGroup
    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Invalidate size on initial mount and window resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [mode]);

  // 2. Render and update Markers whenever live data or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    // A. Render Transit Stops
    INITIAL_STOPS.forEach((stop) => {
      const isBottleneck = stop.isBottleneck;

      const stopHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group">
          ${
            isBottleneck
              ? `<div class="absolute w-8 h-8 rounded-full bg-amber-500/25 animate-ping"></div>`
              : ''
          }
          <div class="w-3.5 h-3.5 rounded-full border-2 ${
            isBottleneck
              ? 'border-amber-400 bg-[#be581e] shadow-[0_0_10px_rgba(245,158,11,0.8)]'
              : 'border-[#d2bcff] bg-[#1d164f] shadow-[0_0_8px_rgba(139,77,255,0.6)]'
          }"></div>
        </div>
      `;

      const stopIcon = L.divIcon({
        className: 'custom-stop-marker',
        html: stopHtml,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon: stopIcon });

      const popupContent = `
        <div style="min-width: 170px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; color: #958da1; text-transform: uppercase;">
              ${stop.code}
            </span>
            ${
              isBottleneck
                ? `<span style="font-size: 9px; font-weight: 700; background: rgba(190,88,30,0.3); color: #ffb693; padding: 2px 6px; border-radius: 9999px; border: 1px solid rgba(255,182,147,0.4);">CONGESTION</span>`
                : `<span style="font-size: 9px; font-weight: 700; background: rgba(0,85,234,0.3); color: #b5c4ff; padding: 2px 6px; border-radius: 9999px;">ACTIVE STOP</span>`
            }
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #ffffff; margin-bottom: 2px;">
            ${stop.name}
          </div>
          <div style="font-size: 11px; color: #ccc3d8;">
            ${stop.subtext}
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);
      markersLayer.addLayer(marker);
    });

    // B. Filter Buses
    let busesToDisplay = INITIAL_BUSES;
    if (filterLayer === 'crowd') {
      busesToDisplay = INITIAL_BUSES.filter((b) => b.confidencePercent >= 80 && !b.isNotDetected);
    } else if (filterLayer === 'bottlenecks') {
      busesToDisplay = INITIAL_BUSES.filter(
        (b) => b.status === 'delayed' || b.confidenceLevel === 'Bottleneck' || b.delayMinutes > 2
      );
    }

    // Always include selected bus even if filtered out
    if (!busesToDisplay.some((b) => b.id === selectedBus.id)) {
      busesToDisplay = [selectedBus, ...busesToDisplay];
    }

    // C. Render Buses
    busesToDisplay.forEach((bus) => {
      const isBus21A = bus.id === 'bus-21a';
      const isSelected = selectedBus.id === bus.id;

      // Position: if 21A, use live estimated position from SignalContext
      const lat = isBus21A ? estimatedBusPosition.lat : bus.lat;
      const lng = isBus21A ? estimatedBusPosition.lng : bus.lng;
      const speed = isBus21A ? estimatedBusPosition.speedKmh : bus.speed;
      const isOffline = isBus21A ? isBusNotDetected : bus.isNotDetected;
      const isBottleneck = bus.confidenceLevel === 'Bottleneck' || bus.status === 'delayed';

      // Status indicator color
      const dotColor = isOffline
        ? 'bg-rose-400'
        : isBus21A
        ? etaConfidence.isLowConfidence
          ? 'bg-amber-300'
          : 'bg-emerald-300'
        : isBottleneck
        ? 'bg-amber-400'
        : 'bg-emerald-400';

      const busBg = isOffline
        ? 'bg-gray-800 text-gray-300 border-gray-600'
        : isBottleneck
        ? 'bg-[#be581e] text-white border-[#ffdbcb]/40 shadow-[0_0_14px_rgba(190,88,30,0.6)]'
        : isSelected
        ? 'bg-[#0055ea] text-white border-white/60 shadow-[0_0_18px_rgba(0,85,234,0.8)]'
        : 'bg-[#19114b] text-[#e4dfff] border-[#28225a] hover:border-[#8b4dff]';

      const busShortName = bus.name.replace('Bus ', '');

      const busHtml = `
        <div class="cursor-pointer transition-transform hover:scale-110 select-none flex items-center ${
          isSelected ? 'scale-110 z-30' : 'z-20'
        }">
          <div class="px-2 py-1 rounded-xl font-mono text-[11px] font-bold flex items-center gap-1.5 border shadow-lg ${busBg} ${
            isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-[#080227]' : ''
          }">
            <span>🚌 ${busShortName}</span>
            <span class="w-2 h-2 rounded-full ${dotColor} ${isOffline ? '' : 'animate-pulse'}"></span>
            <span class="text-[10px] font-normal opacity-90">
              ${isOffline ? 'Offline' : `${speed} km/h`}
            </span>
          </div>
        </div>
      `;

      const busIcon = L.divIcon({
        className: 'custom-bus-marker',
        html: busHtml,
        iconSize: [96, 28],
        iconAnchor: [48, 14],
      });

      const busMarker = L.marker([lat, lng], { icon: busIcon });

      // Click on bus selects it and notifies parent
      busMarker.on('click', () => {
        onSelectBus(bus);
      });

      const etaText = isBus21A
        ? isOffline
          ? `Signal Lost (${secondsSinceLastSeen}s ago)`
          : `${etaConfidence.etaMinutes} mins to Sanpada`
        : `${bus.nextStopEtaMinutes || 4} mins to ${bus.nearestStop}`;

      const popupHtml = `
        <div style="min-width: 190px; font-family: 'Plus Jakarta Sans', sans-serif;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <span style="font-size: 13px; font-weight: 800; color: #ffffff;">${bus.name}</span>
            <span style="font-size: 10px; font-weight: 700; color: ${
              isOffline ? '#f43f5e' : '#34d399'
            }; font-family: monospace;">
              ${isOffline ? 'OFFLINE' : `${speed} km/h`}
            </span>
          </div>
          <div style="font-size: 11px; color: #b5c4ff; margin-bottom: 6px;">
            ${bus.route}
          </div>
          <div style="background: #100743; padding: 6px 8px; border-radius: 8px; border: 1px solid #28225a; margin-bottom: 4px;">
            <div style="font-size: 10px; color: #958da1; text-transform: uppercase; font-weight: 700;">Arrival Status</div>
            <div style="font-size: 12px; font-weight: 700; color: #e4dfff; font-family: monospace;">${etaText}</div>
          </div>
          <div style="font-size: 10px; color: #958da1;">
            ${isBus21A ? `Live crowd tracking • ${syncedPhonesCount} nearby phones` : `Sector: ${bus.sector}`}
          </div>
        </div>
      `;

      busMarker.bindPopup(popupHtml);
      markersLayer.addLayer(busMarker);
    });

    // D. In Authority Mode: Render Real-time Anonymous Phone Signals around Bus 21A
    if (mode === 'authority' && !isBusNotDetected) {
      // Accepted signals (cyan cluster nodes)
      acceptedSignals.forEach((sig) => {
        const sigHtml = `
          <div class="w-2.5 h-2.5 rounded-full bg-[#00f2fe] border border-white shadow-[0_0_6px_rgba(0,242,254,0.9)] animate-pulse" title="Accepted Phone: ${sig.phoneLabel} (Trust: ${sig.trustScore}%)"></div>
        `;
        const sigIcon = L.divIcon({
          className: 'sig-marker',
          html: sigHtml,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        const sigMarker = L.marker([sig.lat, sig.lng], { icon: sigIcon });
        sigMarker.bindTooltip(`Node ${sig.phoneLabel} • ${sig.speedKmh} km/h • Trust ${sig.trustScore}%`, {
          direction: 'top',
          className: 'leaflet-tooltip-dark',
        });
        markersLayer.addLayer(sigMarker);
      });

      // Rejected signals (amber/red stray pings)
      rejectedSignals.slice(0, 5).forEach((sig) => {
        const rejHtml = `
          <div class="w-2 h-2 rounded-full bg-rose-500 border border-rose-300 opacity-80" title="Filtered: ${sig.rejectionReason}"></div>
        `;
        const rejIcon = L.divIcon({
          className: 'rej-marker',
          html: rejHtml,
          iconSize: [8, 8],
          iconAnchor: [4, 4],
        });
        const rejMarker = L.marker([sig.lat, sig.lng], { icon: rejIcon });
        rejMarker.bindTooltip(`Filtered: ${sig.rejectionReason || 'Noise'} (${sig.phoneLabel})`, {
          direction: 'top',
        });
        markersLayer.addLayer(rejMarker);
      });
    }
  }, [
    mode,
    selectedBus,
    filterLayer,
    estimatedBusPosition,
    syncedPhonesCount,
    etaConfidence,
    acceptedSignals,
    rejectedSignals,
    isBusNotDetected,
    secondsSinceLastSeen,
    onSelectBus,
  ]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full" />
    </div>
  );
};
