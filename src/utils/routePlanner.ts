import { BusLiveStatus, DirectBusOption, ConnectingRouteOption, RouteSearchResult } from '../types';

export interface LocationSuggestion {
  name: string;
  category: 'station' | 'depot' | 'node' | 'landmark';
  subtext: string;
}

export const POPULAR_LOCATIONS: LocationSuggestion[] = [
  { name: 'Ghansoli', category: 'station', subtext: 'Ghansoli Stn & Bus Depot' },
  { name: 'Vashi', category: 'depot', subtext: 'Vashi Bus Terminus & Highway' },
  { name: 'Belapur CBD', category: 'station', subtext: 'CBD Belapur Terminus & Metro' },
  { name: 'Kopar Khairane', category: 'node', subtext: 'Kopar Khairane Sector 5' },
  { name: 'Sanpada', category: 'node', subtext: 'Sanpada Jct & Railway Station' },
  { name: 'Turbhe', category: 'landmark', subtext: 'Turbhe Naka Flyover & MIDC' },
  { name: 'Nerul', category: 'depot', subtext: 'Nerul LP Transit Hub' },
  { name: 'Seawoods', category: 'station', subtext: 'Seawoods Grand Central' },
  { name: 'Panvel', category: 'station', subtext: 'Panvel Railway Station' },
  { name: 'Kharghar', category: 'node', subtext: 'Kharghar Entry Link' },
];

export const DEMO_PRESET_ROUTES = [
  { from: 'Ghansoli', to: 'Vashi', label: 'Ghansoli ➔ Vashi', badge: 'Direct Demo' },
  { from: 'Ghansoli', to: 'Belapur CBD', label: 'Ghansoli ➔ Belapur CBD', badge: 'Smart Connecting Demo' },
  { from: 'Vashi', to: 'Belapur CBD', label: 'Vashi ➔ Belapur CBD', badge: 'Direct' },
  { from: 'Kopar Khairane', to: 'Vashi', label: 'Kopar Khairane ➔ Vashi', badge: 'Direct' },
  { from: 'Nerul', to: 'Vashi', label: 'Nerul ➔ Vashi', badge: 'Direct' },
];

function normalize(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchesLoc(input: string, target: string): boolean {
  const nInput = normalize(input);
  const nTarget = normalize(target);
  if (!nInput || !nTarget) return false;
  return nInput.includes(nTarget) || nTarget.includes(nInput);
}

/**
 * Searches for transit routes between two points.
 * If direct buses exist, returns direct options.
 * If no direct bus exists, generates practical smart connecting routes with visual leg transfers.
 */
export function searchTransitRoutes(
  fromRaw: string,
  toRaw: string,
  allBuses: BusLiveStatus[]
): RouteSearchResult {
  const fromClean = fromRaw.trim();
  const toClean = toRaw.trim();

  const isFromGhansoli = matchesLoc(fromClean, 'ghansoli');
  const isToVashi = matchesLoc(toClean, 'vashi');
  const isFromVashi = matchesLoc(fromClean, 'vashi');
  const isToGhansoli = matchesLoc(toClean, 'ghansoli');
  const isToBelapur = matchesLoc(toClean, 'belapur') || matchesLoc(toClean, 'cbd');
  const isFromBelapur = matchesLoc(fromClean, 'belapur') || matchesLoc(fromClean, 'cbd');
  const isFromKopar = matchesLoc(fromClean, 'kopar') || matchesLoc(fromClean, 'khairane');
  const isToKopar = matchesLoc(toClean, 'kopar') || matchesLoc(toClean, 'khairane');
  const isFromSanpada = matchesLoc(fromClean, 'sanpada');
  const isToSanpada = matchesLoc(toClean, 'sanpada');
  const isFromNerul = matchesLoc(fromClean, 'nerul');
  const isToNerul = matchesLoc(toClean, 'nerul');
  const isFromSeawoods = matchesLoc(fromClean, 'seawoods');
  const isToSeawoods = matchesLoc(toClean, 'seawoods');

  // Match live crowd-tracked buses from allBuses
  const findBus = (id: string, fallback: Partial<BusLiveStatus>): BusLiveStatus => {
    const found = allBuses.find((b) => b.id === id);
    if (found) return found;
    return {
      id,
      name: fallback.name || 'Bus',
      route: fallback.route || '',
      direction: fallback.direction || '',
      speed: fallback.speed || 30,
      status: fallback.status || 'on-time',
      headwayText: fallback.headwayText || 'On time',
      delayMinutes: 0,
      sector: fallback.sector || 'Corridor',
      clusterNodes: 8,
      currentPhone: '#05',
      confidencePercent: 94,
      lat: fallback.lat || 19.07,
      lng: fallback.lng || 73.01,
      confidenceLevel: 'High',
      nearestStop: fallback.nearestStop || 'Station',
      nextStopEtaMinutes: fallback.nextStopEtaMinutes || 4,
      isNotDetected: false,
    };
  };

  const bus125 = findBus('bus-125', {
    name: 'Bus 125 AC',
    route: 'Route 125: Ghansoli ➔ Vashi',
    direction: 'Ghansoli Depot ➔ Vashi Bus Terminus',
    nextStopEtaMinutes: 4,
    speed: 34,
  });

  const bus21g = findBus('bus-21g', {
    name: 'Bus 21G',
    route: 'Route 21G: Ghansoli ➔ Vashi Highway',
    direction: 'Ghansoli Railway Stn ➔ Vashi Highway',
    nextStopEtaMinutes: 9,
    speed: 28,
  });

  const bus21a = findBus('bus-21a', {
    name: 'Bus 21A',
    route: 'Route 21: Vashi ➔ Belapur',
    direction: 'Vashi Stn ➔ CBD Belapur',
    nextStopEtaMinutes: 3,
    speed: 36,
  });

  const bus21b = findBus('bus-21b', {
    name: 'Bus 21B',
    route: 'Route 21: Belapur ➔ Vashi',
    direction: 'Belapur ➔ Vashi',
    nextStopEtaMinutes: 12,
    speed: 18,
  });

  const bus502 = findBus('bus-502', {
    name: 'Bus 502 LTD',
    route: 'Route 502: Vashi ➔ Belapur CBD',
    direction: 'Vashi Stn ➔ CBD Belapur Terminus',
    nextStopEtaMinutes: 5,
    speed: 38,
  });

  const bus24b = findBus('bus-24b', {
    name: 'Bus 24 Express',
    route: 'Route 24: Vashi ➔ Belapur CBD',
    direction: 'Vashi Highway ➔ Belapur Artist Village',
    nextStopEtaMinutes: 11,
    speed: 30,
  });

  const bus15c = findBus('bus-15c', {
    name: 'Bus 15C',
    route: 'Route 15: Sanpada ➔ Nerul',
    direction: 'Sanpada ➔ Nerul',
    nextStopEtaMinutes: 4,
  });

  const bus42e = findBus('bus-42e', {
    name: 'Bus 42E',
    route: 'Route 42: Seawoods ➔ Vashi',
    direction: 'Seawoods ➔ Vashi',
    nextStopEtaMinutes: 5,
  });

  const bus31d = findBus('bus-31d', {
    name: 'Bus 31D',
    route: 'Route 31: Kopar Khairane ➔ Panvel',
    direction: 'Kopar Khairane ➔ Panvel',
    nextStopEtaMinutes: 8,
  });

  // 1. DEMO DIRECT ROUTE: Ghansoli -> Vashi
  if ((isFromGhansoli && isToVashi) || (isFromKopar && isToVashi)) {
    return {
      fromLocation: fromClean || 'Ghansoli',
      toLocation: toClean || 'Vashi',
      hasDirect: true,
      directBuses: [
        {
          busId: bus125.id,
          busNumber: 'Bus 125 AC',
          routeTitle: 'Route 125: Ghansoli ➔ Vashi Bus Terminus',
          fromStop: isFromKopar ? 'Kopar Khairane Sector 5' : 'Ghansoli Station (Bay 1)',
          toStop: 'Vashi Bus Terminus',
          status: 'On Time • Smooth Traffic',
          statusType: 'on-time',
          etaMinutes: bus125.nextStopEtaMinutes || 4,
          travelTimeMinutes: 24,
          nextMajorStops: ['Ghansoli Station', 'Kopar Khairane', 'Turbhe MIDC', 'Vashi Highway', 'Vashi Bus Terminus'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • 9 Nearby Phones',
          direction: 'Ghansoli ➔ Vashi',
          originalBus: bus125,
        },
        {
          busId: bus21g.id,
          busNumber: 'Bus 21G',
          routeTitle: 'Route 21G: Ghansoli ➔ Vashi Highway Express',
          fromStop: isFromKopar ? 'Kopar Khairane Sector 5' : 'Ghansoli Railway Stn',
          toStop: 'Vashi Highway',
          status: 'Approaching Stop',
          statusType: 'approaching',
          etaMinutes: bus21g.nextStopEtaMinutes || 9,
          travelTimeMinutes: 28,
          nextMajorStops: ['Ghansoli Railway Stn', 'Bonkode Village', 'Vashi Plaza', 'Vashi Highway'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • 7 Nearby Phones',
          direction: 'Ghansoli ➔ Vashi',
          originalBus: bus21g,
        },
      ],
      connectingOptions: [],
    };
  }

  // Vashi -> Ghansoli (reverse)
  if (isFromVashi && (isToGhansoli || isToKopar)) {
    return {
      fromLocation: fromClean || 'Vashi',
      toLocation: toClean || 'Ghansoli',
      hasDirect: true,
      directBuses: [
        {
          busId: bus125.id,
          busNumber: 'Bus 125 AC',
          routeTitle: 'Route 125: Vashi ➔ Ghansoli Depot',
          fromStop: 'Vashi Bus Terminus (Bay 3)',
          toStop: isToKopar ? 'Kopar Khairane Sector 5' : 'Ghansoli Depot',
          status: 'On Time',
          statusType: 'on-time',
          etaMinutes: 6,
          travelTimeMinutes: 25,
          nextMajorStops: ['Vashi Bus Terminus', 'Vashi Highway', 'Turbhe MIDC', 'Kopar Khairane', 'Ghansoli Depot'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • High Confidence',
          direction: 'Vashi ➔ Ghansoli',
          originalBus: bus125,
        },
      ],
      connectingOptions: [],
    };
  }

  // 2. DEMO DIRECT ROUTE: Vashi -> Belapur CBD
  if (isFromVashi && isToBelapur) {
    return {
      fromLocation: fromClean || 'Vashi',
      toLocation: toClean || 'Belapur CBD',
      hasDirect: true,
      directBuses: [
        {
          busId: bus21a.id,
          busNumber: 'Bus 21A',
          routeTitle: 'Route 21: Vashi ➔ CBD Belapur Terminus',
          fromStop: 'Vashi Stn Terminus (Bay 2)',
          toStop: 'CBD Belapur Terminus',
          status: 'On Time • Approaching Sanpada',
          statusType: 'on-time',
          etaMinutes: bus21a.nextStopEtaMinutes || 3,
          travelTimeMinutes: 22,
          nextMajorStops: ['Sanpada Jct', 'Juinagar Node', 'Nerul L.P.', 'Seawoods', 'CBD Belapur Terminus'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • Verified Bus Cluster',
          direction: 'Vashi ➔ Belapur',
          originalBus: bus21a,
        },
        {
          busId: bus502.id,
          busNumber: 'Bus 502 LTD',
          routeTitle: 'Route 502: Vashi ➔ Belapur CBD Express',
          fromStop: 'Vashi Highway Junction',
          toStop: 'CBD Belapur Terminus',
          status: 'Express Transit • Non-stop Palm Beach',
          statusType: 'on-time',
          etaMinutes: 5,
          travelTimeMinutes: 19,
          nextMajorStops: ['Vashi Highway', 'Nerul L.P. Transit Hub', 'CBD Belapur Terminus'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • 14 Nearby Phones',
          direction: 'Vashi ➔ Belapur',
          originalBus: bus502,
        },
        {
          busId: bus24b.id,
          busNumber: 'Bus 24 Express',
          routeTitle: 'Route 24: Vashi ➔ Belapur Artist Village',
          fromStop: 'Vashi Stn Terminus (Bay 6)',
          toStop: 'CBD Belapur Terminus',
          status: 'Moderate Traffic',
          statusType: 'delayed',
          etaMinutes: 11,
          travelTimeMinutes: 26,
          nextMajorStops: ['Sanpada Flyover', 'Juinagar Node', 'Seawoods', 'Belapur Artist Village'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • 8 Nearby Phones',
          direction: 'Vashi ➔ Belapur',
          originalBus: bus24b,
        },
      ],
      connectingOptions: [],
    };
  }

  // Belapur CBD -> Vashi (reverse)
  if (isFromBelapur && isToVashi) {
    return {
      fromLocation: fromClean || 'Belapur CBD',
      toLocation: toClean || 'Vashi',
      hasDirect: true,
      directBuses: [
        {
          busId: bus21b.id,
          busNumber: 'Bus 21B',
          routeTitle: 'Route 21: Belapur ➔ Vashi Stn',
          fromStop: 'CBD Belapur Terminus',
          toStop: 'Vashi Stn Terminus',
          status: 'Moving in Congestion Zone',
          statusType: 'delayed',
          etaMinutes: bus21b.nextStopEtaMinutes || 12,
          travelTimeMinutes: 27,
          nextMajorStops: ['CBD Belapur Terminus', 'Seawoods', 'Nerul L.P.', 'Turbhe Flyover', 'Vashi Stn Terminus'],
          liveTrackingConfidence: 'Medium',
          liveTrackingText: 'Live Crowd-Tracked • Crowd Verified',
          direction: 'Belapur ➔ Vashi',
          originalBus: bus21b,
        },
      ],
      connectingOptions: [],
    };
  }

  // 3. DEMO CONNECTING ROUTE: Ghansoli -> Belapur CBD
  if ((isFromGhansoli || isFromKopar) && isToBelapur) {
    return {
      fromLocation: fromClean || 'Ghansoli',
      toLocation: toClean || 'Belapur CBD',
      hasDirect: false,
      directBuses: [],
      connectingOptions: [
        {
          id: 'conn-vashi-fast',
          title: 'Option 1: Via Vashi Bus Terminus (Fastest)',
          transferStop: 'Vashi Bus Terminus',
          transferWaitMinutes: 5,
          totalJourneyMinutes: 48,
          totalTransfers: 1,
          legs: [
            {
              busId: bus125.id,
              busNumber: 'Bus 125 AC',
              routeTitle: 'Route 125: Ghansoli ➔ Vashi',
              boardingStop: isFromKopar ? 'Kopar Khairane Sector 5' : 'Ghansoli Station (Bay 1)',
              dropOffStop: 'Vashi Bus Terminus',
              estimatedWaitMinutes: bus125.nextStopEtaMinutes || 4,
              estimatedTravelMinutes: 24,
              liveStatusText: 'Live Crowd-Tracked • On Time',
              liveConfidence: 'High',
              nextMajorStops: ['Ghansoli Station', 'Kopar Khairane', 'Turbhe MIDC', 'Vashi Bus Terminus'],
              originalBus: bus125,
            },
            {
              busId: bus502.id,
              busNumber: 'Bus 502 LTD',
              routeTitle: 'Route 502: Vashi ➔ Belapur CBD',
              boardingStop: 'Vashi Bus Terminus (Bay 4)',
              dropOffStop: 'CBD Belapur Terminus',
              estimatedWaitMinutes: 5,
              estimatedTravelMinutes: 19,
              liveStatusText: 'Live Crowd-Tracked • Approaching Stop',
              liveConfidence: 'High',
              nextMajorStops: ['Vashi Bus Terminus', 'Nerul L.P. Transit Hub', 'CBD Belapur Terminus'],
              originalBus: bus502,
            },
          ],
        },
        {
          id: 'conn-turbhe-local',
          title: 'Option 2: Via Turbhe Flyover Transfer',
          transferStop: 'Turbhe Naka Flyover',
          transferWaitMinutes: 7,
          totalJourneyMinutes: 53,
          totalTransfers: 1,
          legs: [
            {
              busId: bus21g.id,
              busNumber: 'Bus 21G',
              routeTitle: 'Route 21G: Ghansoli ➔ Vashi Highway',
              boardingStop: isFromKopar ? 'Kopar Khairane Sector 5' : 'Ghansoli Railway Stn',
              dropOffStop: 'Turbhe Naka Flyover',
              estimatedWaitMinutes: bus21g.nextStopEtaMinutes || 8,
              estimatedTravelMinutes: 18,
              liveStatusText: 'Live Crowd-Tracked • Approaching',
              liveConfidence: 'High',
              nextMajorStops: ['Ghansoli Stn', 'Bonkode', 'Turbhe Naka Flyover'],
              originalBus: bus21g,
            },
            {
              busId: bus21a.id,
              busNumber: 'Bus 21A',
              routeTitle: 'Route 21: Turbhe ➔ CBD Belapur',
              boardingStop: 'Turbhe Naka Flyover (Stop #3)',
              dropOffStop: 'CBD Belapur Terminus',
              estimatedWaitMinutes: 7,
              estimatedTravelMinutes: 20,
              liveStatusText: 'Live Crowd-Tracked • High Confidence',
              liveConfidence: 'High',
              nextMajorStops: ['Turbhe Naka Flyover', 'Juinagar Node', 'Nerul L.P.', 'CBD Belapur Terminus'],
              originalBus: bus21a,
            },
          ],
        },
      ],
    };
  }

  // Reverse: Belapur CBD -> Ghansoli
  if (isFromBelapur && (isToGhansoli || isToKopar)) {
    return {
      fromLocation: fromClean || 'Belapur CBD',
      toLocation: toClean || 'Ghansoli',
      hasDirect: false,
      directBuses: [],
      connectingOptions: [
        {
          id: 'conn-belapur-ghansoli',
          title: 'Option 1: Via Vashi Bus Terminus (Recommended)',
          transferStop: 'Vashi Bus Terminus',
          transferWaitMinutes: 6,
          totalJourneyMinutes: 52,
          totalTransfers: 1,
          legs: [
            {
              busId: bus21b.id,
              busNumber: 'Bus 21B',
              routeTitle: 'Route 21: Belapur ➔ Vashi',
              boardingStop: 'CBD Belapur Terminus',
              dropOffStop: 'Vashi Bus Terminus',
              estimatedWaitMinutes: 4,
              estimatedTravelMinutes: 24,
              liveStatusText: 'Live Crowd-Tracked • Moving',
              liveConfidence: 'Medium',
              originalBus: bus21b,
            },
            {
              busId: bus125.id,
              busNumber: 'Bus 125 AC',
              routeTitle: 'Route 125: Vashi ➔ Ghansoli',
              boardingStop: 'Vashi Bus Terminus (Bay 3)',
              dropOffStop: isToKopar ? 'Kopar Khairane Sector 5' : 'Ghansoli Station',
              estimatedWaitMinutes: 6,
              estimatedTravelMinutes: 22,
              liveStatusText: 'Live Crowd-Tracked • On Time',
              liveConfidence: 'High',
              originalBus: bus125,
            },
          ],
        },
      ],
    };
  }

  // Other local routes
  if (isFromSanpada && isToNerul) {
    return {
      fromLocation: fromClean,
      toLocation: toClean,
      hasDirect: true,
      directBuses: [
        {
          busId: bus15c.id,
          busNumber: 'Bus 15C',
          routeTitle: 'Route 15: Sanpada ➔ Nerul Hub',
          fromStop: 'Sanpada Jct',
          toStop: 'Nerul L.P. Transit Hub',
          status: 'Early • Fast Moving',
          statusType: 'early',
          etaMinutes: 3,
          travelTimeMinutes: 12,
          nextMajorStops: ['Sanpada Jct', 'Juinagar Node', 'Nerul L.P. Transit Hub'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • High Confidence',
          direction: 'Sanpada ➔ Nerul',
          originalBus: bus15c,
        },
      ],
      connectingOptions: [],
    };
  }

  if (isFromSeawoods && isToVashi) {
    return {
      fromLocation: fromClean,
      toLocation: toClean,
      hasDirect: true,
      directBuses: [
        {
          busId: bus42e.id,
          busNumber: 'Bus 42E',
          routeTitle: 'Route 42: Seawoods ➔ Vashi Stn',
          fromStop: 'Seawoods Grand Central',
          toStop: 'Vashi Stn Terminus',
          status: 'On Time',
          statusType: 'on-time',
          etaMinutes: 5,
          travelTimeMinutes: 20,
          nextMajorStops: ['Seawoods', 'Nerul L.P.', 'Sanpada Jct', 'Vashi Stn Terminus'],
          liveTrackingConfidence: 'High',
          liveTrackingText: 'Live Crowd-Tracked • 10 Nearby Phones',
          direction: 'Seawoods ➔ Vashi',
          originalBus: bus42e,
        },
      ],
      connectingOptions: [],
    };
  }

  // General Fallback: If locations don't match specific pairs, check if direct corridor matches or provide intelligent connecting route
  // If destination is in northern corridor and from is southern corridor: suggest via Vashi
  return {
    fromLocation: fromClean || 'Current Location',
    toLocation: toClean || 'Destination',
    hasDirect: false,
    directBuses: [],
    connectingOptions: [
      {
        id: 'conn-generic-vashi',
        title: `Option 1: ${fromClean || 'Origin'} ➔ Vashi ➔ ${toClean || 'Destination'}`,
        transferStop: 'Vashi Bus Terminus / Interchange Hub',
        transferWaitMinutes: 6,
        totalJourneyMinutes: 46,
        totalTransfers: 1,
        legs: [
          {
            busId: bus125.id,
            busNumber: 'Bus 125 AC',
            routeTitle: `Local Link: ${fromClean || 'Origin'} ➔ Vashi`,
            boardingStop: `${fromClean || 'Origin'} Bus Stop`,
            dropOffStop: 'Vashi Bus Terminus',
            estimatedWaitMinutes: 4,
            estimatedTravelMinutes: 22,
            liveStatusText: 'Live Crowd-Tracked • On Time',
            liveConfidence: 'High',
            originalBus: bus125,
          },
          {
            busId: bus21a.id,
            busNumber: 'Bus 21A',
            routeTitle: `Connecting Line: Vashi ➔ ${toClean || 'Destination'}`,
            boardingStop: 'Vashi Bus Terminus (Bay 2)',
            dropOffStop: `${toClean || 'Destination'} Bus Stop`,
            estimatedWaitMinutes: 6,
            estimatedTravelMinutes: 18,
            liveStatusText: 'Live Crowd-Tracked • High Confidence',
            liveConfidence: 'High',
            originalBus: bus21a,
          },
        ],
      },
    ],
  };
}
