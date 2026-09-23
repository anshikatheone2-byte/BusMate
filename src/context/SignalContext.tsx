import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { PhoneSignal, RejectionReason, BusCluster, EtaConfidenceInfo, HandoverLogEvent } from '../types';
import {
  writeAnonymousSignalToFirestore,
  writeBatchAnonymousSignalsToFirestore,
  deleteSignalsOlderThan10Minutes,
  subscribeToLiveAnonymousSignals,
  AnonymousFirestoreSignal,
} from '../lib/firebase';

export interface PhoneSignalInput {
  id: string;
  phoneLabel: string;
  anonymousId?: string; // Strictly anonymous identifier (e.g. anon_a1b2c3d4) with NO names or device models
  timestamp?: number;
  x: number;
  y: number;
  gisX: number;
  gisY: number;
  lat: number;
  lng: number;
  distanceFromRouteMeters: number;
  speedKmh: number;
  directionDiffDeg: number;
  isNearStop: boolean;
  waitingTimeSeconds: number;
  isGroupedWithBus: boolean;
}

/**
 * Maps GPS latitude and longitude into Passenger canvas (400x240) and Authority GIS (1000x650) coords
 */
export function latLngToCoords(lat: number, lng: number): { x: number; y: number; gisX: number; gisY: number } {
  // Lat range: ~19.080 (north) to 19.030 (south)
  // Lng range: ~72.990 (west) to 73.040 (east)
  const normX = Math.max(0, Math.min(1, (lng - 72.990) / 0.050));
  const normY = Math.max(0, Math.min(1, (19.080 - lat) / 0.050));

  const x = Math.round(50 + normX * 300);
  const y = Math.round(30 + normY * 180);
  const gisX = Math.round(160 + normX * 540);
  const gisY = Math.round(120 + normY * 280);

  return { x, y, gisX, gisY };
}

/**
 * Calculates physical distance in meters between two phone signals using GPS coordinates
 * and calibrated canvas dimensions.
 */
export function calculateDistanceMeters(
  p1: { x: number; y: number; lat: number; lng: number },
  p2: { x: number; y: number; lat: number; lng: number }
): number {
  const dLat = (p2.lat - p1.lat) * 110574;
  const avgLat = ((p1.lat + p2.lat) / 2) * (Math.PI / 180);
  const dLng = (p2.lng - p1.lng) * 111320 * Math.cos(avgLat);
  const gpsDist = Math.sqrt(dLat * dLat + dLng * dLng);
  // Also cross-check with 400x240 canvas projection (~2.5m per pixel)
  const canvasDist = Math.hypot(p1.x - p2.x, p1.y - p2.y) * 2.5;
  return Math.min(gpsDist, canvasDist);
}

/**
 * Evaluates whether two phones match:
 * - Within 50 meters of each other
 * - Similar speed (within 12 km/h)
 * - Similar direction (within 20 degrees)
 */
export function doSignalsMatch(p1: PhoneSignalInput, p2: PhoneSignalInput): boolean {
  const dist = calculateDistanceMeters(p1, p2);
  if (dist > 50) return false;
  if (Math.abs(p1.speedKmh - p2.speedKmh) > 12) return false;
  if (Math.abs(p1.directionDiffDeg - p2.directionDiffDeg) > 20) return false;
  return true;
}

/**
 * Evaluates all phone signals:
 * 1. Filter out invalid signals:
 *    - snap to route and reject if > 30 m from route -> "Different road"
 *    - reject direction difference > 30 degrees -> "Different road"
 *    - reject speeds > 60 km/h -> "Car nearby"
 *    - reject speeds < 7 km/h UNLESS grouped with the bus while stopped at a stop (uses waiting time to tell them apart)
 *      -> if not part of a bus group, reject as "Waiting at stop" if near stop / waiting, or "Walking"
 * 2. Group accepted phones within 50m with similar speed and direction.
 *    If 3 or more phones match, treat the group as a bus!
 * 3. Give each phone a Trust Score 0-100:
 *    route match 30%, speed pattern 20%, direction 20%, movement consistency 15%, staying with the group 15%.
 */
export function evaluateAllSignals(inputs: PhoneSignalInput[]): {
  evaluatedSignals: PhoneSignal[];
  busClusters: BusCluster[];
  primaryBusCluster: BusCluster | null;
  estimatedBusPosition: {
    x: number;
    y: number;
    gisX: number;
    gisY: number;
    lat: number;
    lng: number;
    speedKmh: number;
  };
} {
  // Step 1: Pre-filter candidate status
  interface Candidate {
    input: PhoneSignalInput;
    status: 'accepted' | 'rejected';
    rejectionReason?: RejectionReason;
    stopDwellCategory?: 'bus_group_at_stop' | 'solitary_waiting_at_stop' | 'pedestrian_walking' | 'normal_transit';
    stopDwellNote?: string;
    isPartofBusGroup?: boolean;
  }

  const candidates: Candidate[] = inputs.map((input) => {
    // (1) Route distance check
    if (input.distanceFromRouteMeters > 30) {
      return {
        input,
        status: 'rejected',
        rejectionReason: 'Different road',
        stopDwellCategory: 'pedestrian_walking',
        stopDwellNote: `Distance ${input.distanceFromRouteMeters}m > 30m off route centerline.`,
        isPartofBusGroup: false,
      };
    }

    // (2) Direction difference check
    if (input.directionDiffDeg > 30) {
      return {
        input,
        status: 'rejected',
        rejectionReason: 'Different road',
        stopDwellCategory: 'pedestrian_walking',
        stopDwellNote: `Heading difference ${input.directionDiffDeg}° > 30° route alignment.`,
        isPartofBusGroup: false,
      };
    }

    // (3) High speed check (> 60 km/h)
    if (input.speedKmh > 60) {
      return {
        input,
        status: 'rejected',
        rejectionReason: 'Car nearby',
        stopDwellCategory: 'normal_transit',
        stopDwellNote: `Speed ${input.speedKmh} km/h > 60 km/h threshold (highway motorist).`,
        isPartofBusGroup: false,
      };
    }

    // (4) Low speed check (< 7 km/h)
    // Core prompt rule:
    // "Use waiting time to tell them apart: phones that stay grouped with the bus while it is stopped at a stop are NOT rejected.
    //  Only reject a slow phone if it is not part of a bus group."
    if (input.speedKmh < 7) {
      // Check co-located companion phones within 50m
      const coLocatedCompanions = inputs.filter(
        (other) => other.id !== input.id && calculateDistanceMeters(input, other) <= 50
      );

      const isCompanionInBus = coLocatedCompanions.some((other) => other.isGroupedWithBus);
      const isCoLocatedGroupAtStop =
        (input.isNearStop || input.waitingTimeSeconds > 0) &&
        coLocatedCompanions.filter((other) => other.isNearStop && other.speedKmh < 7).length >= 1;

      const isPartofBusGroup = input.isGroupedWithBus || isCompanionInBus || isCoLocatedGroupAtStop;

      // Phones that stay grouped with the bus while stopped at a stop are NOT rejected
      if (isPartofBusGroup) {
        return {
          input,
          status: 'accepted',
          stopDwellCategory: 'bus_group_at_stop',
          stopDwellNote: `Stayed grouped with bus while stopped at stop (${input.waitingTimeSeconds}s dwell). NOT REJECTED.`,
          isPartofBusGroup: true,
        };
      }

      // Only reject a slow phone if it is NOT part of a bus group!
      if (input.isNearStop || input.waitingTimeSeconds > 0) {
        return {
          input,
          status: 'rejected',
          rejectionReason: 'Waiting at stop',
          stopDwellCategory: 'solitary_waiting_at_stop',
          stopDwellNote: `Slow phone (${input.speedKmh} km/h) waiting at stop for ${input.waitingTimeSeconds}s, but NOT part of bus group. Rejected.`,
          isPartofBusGroup: false,
        };
      } else {
        return {
          input,
          status: 'rejected',
          rejectionReason: 'Walking',
          stopDwellCategory: 'pedestrian_walking',
          stopDwellNote: `Slow phone (${input.speedKmh} km/h) moving along sidewalk, NOT part of bus group. Rejected.`,
          isPartofBusGroup: false,
        };
      }
    }

    // Normal speed within corridor
    return {
      input,
      status: 'accepted',
      stopDwellCategory: 'normal_transit',
      stopDwellNote: `Normal corridor transit speed (${input.speedKmh} km/h).`,
      isPartofBusGroup: input.isGroupedWithBus,
    };
  });

  // Step 2: Group accepted phones within 50m with similar speed and direction
  const acceptedCandidates = candidates.filter((c) => c.status === 'accepted').map((c) => c.input);

  // Build connected clusters of matching phones
  const visited = new Set<string>();
  const rawClusters: PhoneSignalInput[][] = [];

  for (const phone of acceptedCandidates) {
    if (visited.has(phone.id)) continue;
    const currentCluster: PhoneSignalInput[] = [phone];
    visited.add(phone.id);

    const queue: PhoneSignalInput[] = [phone];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const candidate of acceptedCandidates) {
        if (!visited.has(candidate.id) && doSignalsMatch(current, candidate)) {
          visited.add(candidate.id);
          currentCluster.push(candidate);
          queue.push(candidate);
        }
      }
    }
    rawClusters.push(currentCluster);
  }

  // Create lookup for cluster membership and size
  const phoneClusterMap = new Map<string, { clusterId: string; clusterSize: number; isBus: boolean }>();
  rawClusters.forEach((cluster, idx) => {
    const clusterId = `cluster-${idx + 1}`;
    // If 3 or more phones match, treat the group as a bus!
    const isBus = cluster.length >= 3;
    cluster.forEach((p) => {
      phoneClusterMap.set(p.id, {
        clusterId,
        clusterSize: cluster.length,
        isBus,
      });
    });
  });

  // Step 3: Compute Trust Score (0-100) with 5 weighted components for every phone
  // Route match: 30%, Speed pattern: 20%, Direction: 20%, Movement consistency: 15%, Staying with group: 15%
  const evaluatedSignals: PhoneSignal[] = candidates.map((cand) => {
    const input = cand.input;
    const clusterInfo = phoneClusterMap.get(input.id);
    const matchedPhoneCount = clusterInfo?.clusterSize || (input.isGroupedWithBus ? 4 : 1);
    const isBusGroup = clusterInfo?.isBus ?? input.isGroupedWithBus;

    // 1. Route match (30% weight): distance from route centerline (0m -> 100%, 30m -> 0%)
    let routeMatchScore: number;
    if (input.distanceFromRouteMeters <= 30) {
      routeMatchScore = Math.max(0, Math.min(100, Math.round(100 - (input.distanceFromRouteMeters / 30) * 100)));
      if (input.distanceFromRouteMeters <= 3) {
        routeMatchScore = Math.min(100, 98 - input.distanceFromRouteMeters);
      }
    } else {
      routeMatchScore = Math.max(8, Math.round(100 - (input.distanceFromRouteMeters - 30) * 2.5));
    }

    // 2. Speed pattern (20% weight): transit speed conformity (ideal 30-45 km/h or valid stop dwell)
    let speedPatternScore: number;
    if (cand.stopDwellCategory === 'bus_group_at_stop' || (input.speedKmh < 7 && input.isNearStop && isBusGroup)) {
      // Stopped bus at transit stop is expected schedule pattern
      speedPatternScore = 96;
    } else if (input.speedKmh >= 7 && input.speedKmh <= 60) {
      speedPatternScore = Math.max(25, Math.min(100, Math.round(100 - Math.abs(input.speedKmh - 36) * 2)));
    } else {
      speedPatternScore = Math.max(10, Math.round(100 - Math.abs(input.speedKmh - 36) * 2.2));
    }

    // 3. Direction (20% weight): route heading angle alignment (0 deg -> 100%, 30 deg -> 0%)
    let directionScore: number;
    if (input.directionDiffDeg <= 30) {
      directionScore = Math.max(0, Math.min(100, Math.round(100 - (input.directionDiffDeg / 30) * 100)));
      if (input.directionDiffDeg <= 3) {
        directionScore = 97 - input.directionDiffDeg;
      }
    } else {
      directionScore = Math.max(10, Math.round(100 - input.directionDiffDeg * 2));
    }

    // 4. Movement consistency (15% weight): smooth corridor trajectory
    let consistencyScore: number;
    if (cand.stopDwellCategory === 'bus_group_at_stop' || (input.speedKmh < 7 && input.isNearStop && isBusGroup)) {
      consistencyScore = 96;
    } else if (cand.status === 'accepted') {
      consistencyScore = Math.max(20, Math.min(100, Math.round(98 - input.distanceFromRouteMeters * 0.7 - input.directionDiffDeg * 0.5)));
    } else {
      consistencyScore = input.isNearStop ? 45 : 18;
    }

    // 5. Staying with the group (15% weight): group adherence
    let stayingWithGroupScore: number;
    if (cand.stopDwellCategory === 'bus_group_at_stop' || isBusGroup) {
      stayingWithGroupScore = Math.min(100, 88 + matchedPhoneCount * 3);
    } else if (matchedPhoneCount === 2) {
      stayingWithGroupScore = 60;
    } else {
      stayingWithGroupScore = 15;
    }

    // Total Trust Score = 30% routeMatch + 20% speedPattern + 20% direction + 15% consistency + 15% stayingWithGroup
    let totalTrust = Math.round(
      routeMatchScore * 0.30 +
      speedPatternScore * 0.20 +
      directionScore * 0.20 +
      consistencyScore * 0.15 +
      stayingWithGroupScore * 0.15
    );

    // Ensure rejected signals have properly constrained low trust scores
    if (cand.status === 'rejected') {
      totalTrust = Math.min(32, totalTrust);
    } else {
      totalTrust = Math.max(70, Math.min(99, totalTrust));
    }

    return {
      ...input,
      status: cand.status,
      rejectionReason: cand.rejectionReason,
      trustScore: totalTrust,
      polylineMatch: routeMatchScore,
      velocityAlign: directionScore,
      dwellTimeScore: consistencyScore,
      routeMatchScore,
      speedPatternScore,
      directionScore,
      consistencyScore,
      stayingWithGroupScore,
      clusterId: clusterInfo?.clusterId,
      isBusGroup,
      matchedPhoneCount,
      stopDwellCategory: cand.stopDwellCategory,
      stopDwellNote: cand.stopDwellNote,
      isPartofBusGroup: cand.isPartofBusGroup,
    };
  });

  // Step 4: Estimate the bus position as the trust-weighted average position along the route
  const busClusters: BusCluster[] = rawClusters
    .filter((cluster) => cluster.length >= 3)
    .map((cluster, idx) => {
      const clusterEvaluated = evaluatedSignals.filter((s) => cluster.some((c) => c.id === s.id));
      let totalTrust = 0;
      let sumX = 0;
      let sumY = 0;
      let sumGisX = 0;
      let sumGisY = 0;
      let sumLat = 0;
      let sumLng = 0;
      let sumSpeed = 0;

      clusterEvaluated.forEach((p) => {
        const weight = Math.max(1, p.trustScore);
        totalTrust += weight;
        sumX += p.x * weight;
        sumY += p.y * weight;
        sumGisX += p.gisX * weight;
        sumGisY += p.gisY * weight;
        sumLat += p.lat * weight;
        sumLng += p.lng * weight;
        sumSpeed += p.speedKmh * weight;
      });

      const phoneCount = cluster.length;
      return {
        id: `bus-cluster-${idx + 1}`,
        name: `Bus 21A Cluster`,
        phoneCount,
        phoneIds: cluster.map((c) => c.id),
        isBus: true,
        estimatedX: Math.round((sumX / totalTrust) * 10) / 10,
        estimatedY: Math.round((sumY / totalTrust) * 10) / 10,
        estimatedGisX: Math.round((sumGisX / totalTrust) * 10) / 10,
        estimatedGisY: Math.round((sumGisY / totalTrust) * 10) / 10,
        estimatedLat: Number((sumLat / totalTrust).toFixed(5)),
        estimatedLng: Number((sumLng / totalTrust).toFixed(5)),
        averageSpeedKmh: Math.round(sumSpeed / totalTrust),
        averageTrustScore: Math.round(totalTrust / phoneCount),
      };
    });

  const primaryBusCluster = busClusters[0] || null;

  const estimatedBusPosition = primaryBusCluster
    ? {
        x: primaryBusCluster.estimatedX,
        y: primaryBusCluster.estimatedY,
        gisX: primaryBusCluster.estimatedGisX,
        gisY: primaryBusCluster.estimatedGisY,
        lat: primaryBusCluster.estimatedLat,
        lng: primaryBusCluster.estimatedLng,
        speedKmh: primaryBusCluster.averageSpeedKmh,
      }
    : {
        x: 115,
        y: 58,
        gisX: 380,
        gisY: 185,
        lat: 19.066,
        lng: 73.015,
        speedKmh: 36,
      };

  return {
    evaluatedSignals,
    busClusters,
    primaryBusCluster,
    estimatedBusPosition,
  };
}

const INITIAL_SIGNAL_INPUTS: PhoneSignalInput[] = [
  // Accepted: Bus 21A Cluster (Cruising on-time at 36 km/h within 50m of each other)
  {
    id: 'sig-04',
    phoneLabel: 'Anon #04',
    anonymousId: 'anon_04b8',
    timestamp: Date.now(),
    x: 115,
    y: 58,
    gisX: 380,
    gisY: 185,
    lat: 19.0660,
    lng: 73.0150,
    distanceFromRouteMeters: 2,
    speedKmh: 36,
    directionDiffDeg: 2,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: true,
  },
  {
    id: 'sig-08',
    phoneLabel: 'Anon #08',
    anonymousId: 'anon_08c1',
    timestamp: Date.now(),
    x: 118,
    y: 60,
    gisX: 388,
    gisY: 190,
    lat: 19.0658,
    lng: 73.0152,
    distanceFromRouteMeters: 3,
    speedKmh: 36,
    directionDiffDeg: 1,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: true,
  },
  {
    id: 'sig-11',
    phoneLabel: 'Anon #11',
    anonymousId: 'anon_11f9',
    timestamp: Date.now(),
    x: 112,
    y: 56,
    gisX: 374,
    gisY: 181,
    lat: 19.0662,
    lng: 73.0148,
    distanceFromRouteMeters: 3,
    speedKmh: 35,
    directionDiffDeg: 2,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: true,
  },
  {
    id: 'sig-b',
    phoneLabel: 'Anon #B',
    anonymousId: 'anon_b72a',
    timestamp: Date.now(),
    x: 120,
    y: 61,
    gisX: 392,
    gisY: 194,
    lat: 19.0656,
    lng: 73.0154,
    distanceFromRouteMeters: 2,
    speedKmh: 36,
    directionDiffDeg: 2,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: true,
  },
  // Accepted: Bus 21B Stopped at Turbhe Flyover stop (Speed < 7 km/h, 3 phones grouped while stopped at stop -> NOT rejected, treated as Bus)
  {
    id: 'sig-09',
    phoneLabel: 'Anon #09',
    anonymousId: 'anon_09d4',
    timestamp: Date.now(),
    x: 220,
    y: 120,
    gisX: 460,
    gisY: 240,
    lat: 19.0550,
    lng: 73.0240,
    distanceFromRouteMeters: 2,
    speedKmh: 3,
    directionDiffDeg: 0,
    isNearStop: true,
    waitingTimeSeconds: 140,
    isGroupedWithBus: true,
  },
  {
    id: 'sig-10',
    phoneLabel: 'Anon #10',
    anonymousId: 'anon_10e3',
    timestamp: Date.now(),
    x: 222,
    y: 121,
    gisX: 464,
    gisY: 242,
    lat: 19.0549,
    lng: 73.0241,
    distanceFromRouteMeters: 3,
    speedKmh: 3,
    directionDiffDeg: 1,
    isNearStop: true,
    waitingTimeSeconds: 140,
    isGroupedWithBus: true,
  },
  {
    id: 'sig-12',
    phoneLabel: 'Anon #12',
    anonymousId: 'anon_12a7',
    timestamp: Date.now(),
    x: 219,
    y: 119,
    gisX: 458,
    gisY: 238,
    lat: 19.0551,
    lng: 73.0239,
    distanceFromRouteMeters: 2,
    speedKmh: 3,
    directionDiffDeg: 0,
    isNearStop: true,
    waitingTimeSeconds: 140,
    isGroupedWithBus: true,
  },
  // Rejected 1: Reason "Walking" (Speed 4.1 km/h, not grouped with bus, on sidewalk)
  {
    id: 'sig-walk',
    phoneLabel: 'Anon #W1',
    anonymousId: 'anon_w41a',
    timestamp: Date.now(),
    x: 65,
    y: 88,
    gisX: 280,
    gisY: 210,
    lat: 19.071,
    lng: 73.012,
    distanceFromRouteMeters: 12,
    speedKmh: 4.1,
    directionDiffDeg: 8,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: false,
  },
  // Rejected 2: Reason "Waiting at stop" (Speed 0.8 km/h, solitary person waiting at stop, not grouped with bus)
  {
    id: 'sig-stop',
    phoneLabel: 'Anon #S1',
    anonymousId: 'anon_s18b',
    timestamp: Date.now(),
    x: 175,
    y: 118,
    gisX: 580,
    gisY: 340,
    lat: 19.043,
    lng: 73.030,
    distanceFromRouteMeters: 6,
    speedKmh: 0.8,
    directionDiffDeg: 2,
    isNearStop: true,
    waitingTimeSeconds: 180,
    isGroupedWithBus: false,
  },
  // Rejected 3: Reason "Car nearby" (Speed 74 km/h > 60 km/h)
  {
    id: 'sig-car',
    phoneLabel: 'Anon #C1',
    anonymousId: 'anon_c74d',
    timestamp: Date.now(),
    x: 170,
    y: 108,
    gisX: 490,
    gisY: 180,
    lat: 19.058,
    lng: 73.021,
    distanceFromRouteMeters: 14,
    speedKmh: 74,
    directionDiffDeg: 4,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: false,
  },
  // Rejected 4: Reason "Different road" (Palm Beach Road divergence: distance 44m > 30m, heading diff 42° > 30°)
  {
    id: 'sig-diff-road',
    phoneLabel: 'Anon #D1',
    anonymousId: 'anon_d45e',
    timestamp: Date.now(),
    x: 210,
    y: 135,
    gisX: 620,
    gisY: 290,
    lat: 19.049,
    lng: 73.028,
    distanceFromRouteMeters: 44,
    speedKmh: 48,
    directionDiffDeg: 42,
    isNearStop: false,
    waitingTimeSeconds: 0,
    isGroupedWithBus: false,
  },
];

interface SignalContextValue {
  signals: PhoneSignal[];
  acceptedSignals: PhoneSignal[];
  rejectedSignals: PhoneSignal[];
  busClusters: BusCluster[];
  primaryBusCluster: BusCluster | null;
  estimatedBusPosition: {
    x: number;
    y: number;
    gisX: number;
    gisY: number;
    lat: number;
    lng: number;
    speedKmh: number;
  };
  etaConfidence: EtaConfidenceInfo;
  signalsReceivedCount: number;
  signalsRemovedCount: number;
  noiseRejectedCount: number;
  syncedPhonesCount: number;
  precisionPercent: number;
  activeTrackingPhone: string;
  primaryAcceptedSignal: PhoneSignal;
  latestRejectedSignal: PhoneSignal;
  rejectionReasonCounts: Record<RejectionReason, number>;
  // Handover state & logs
  handoverCount: number;
  handoverLogs: HandoverLogEvent[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  // 30s timeout state
  isBusNotDetected: boolean;
  secondsSinceLastSeen: number;
  busNotDetectedMessage: string;
  // Stop dwell & waiting time differentiation
  stoppedBusSignals: PhoneSignal[];
  waitingAtStopSignals: PhoneSignal[];
  walkingSignals: PhoneSignal[];
  inspectedSignalId: string;
  setInspectedSignalId: (id: string) => void;
  inspectedSignal: PhoneSignal;
  testStopDwellPhone: () => void;
  testWaitingAtStopPhone: () => void;
  // Actions
  addSyncedPhone: () => void;
  removeSyncedPhone: () => void;
  passengerLeavesBus: () => void;
  injectStrayPing: (customType?: RejectionReason) => PhoneSignal;
  shiftTrackingPhone: () => void;
  verifySignal: () => boolean;
  simulate30sTimeout: () => void;
  restoreAcceptedSignals: () => void;
  // Firebase Firestore Real-Time Synchronization & Pruning
  isFirestoreConnected: boolean;
  firestoreSignalsCount: number;
  purgedSignalsCount: number;
  lastFirestoreSync: Date | null;
  writeSimulatorSignalsToFirestore: () => Promise<void>;
  deleteOldSignals: () => Promise<number>;
  isAutoSyncEnabled: boolean;
  setIsAutoSyncEnabled: React.Dispatch<React.SetStateAction<boolean>>;
}

const SignalContext = createContext<SignalContextValue | null>(null);

export const SignalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signalInputs, setSignalInputs] = useState<PhoneSignalInput[]>(INITIAL_SIGNAL_INPUTS);
  const [activeTrackingPhone, setActiveTrackingPhone] = useState<string>('Phone #04');
  const [baseReceivedOffset, setBaseReceivedOffset] = useState<number>(0);
  const [noiseIndex, setNoiseIndex] = useState<number>(0);
  const [handoverCount, setHandoverCount] = useState<number>(3842);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isForcedTimeout, setIsForcedTimeout] = useState<boolean>(false);
  const [secondsSinceLastSeen, setSecondsSinceLastSeen] = useState<number>(0);
  const [isBusNotDetected, setIsBusNotDetected] = useState<boolean>(false);

  // Firestore real-time sync & ephemeral state
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(true);
  const [firestoreSignalsCount, setFirestoreSignalsCount] = useState<number>(INITIAL_SIGNAL_INPUTS.length);
  const [purgedSignalsCount, setPurgedSignalsCount] = useState<number>(0);
  const [lastFirestoreSync, setLastFirestoreSync] = useState<Date | null>(new Date());
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState<boolean>(true);

  // Initial historic handover logs
  const [handoverLogs, setHandoverLogs] = useState<HandoverLogEvent[]>([
    {
      id: 'ho-init-1',
      timestamp: '13:58:12',
      previousPhone: 'Anon #02',
      newPhone: 'Anon #04',
      trustScore: 96,
      message: 'Passenger left the bus, tracking handed over automatically',
      busId: 'Bus 21A',
    },
    {
      id: 'ho-init-2',
      timestamp: '14:02:44',
      previousPhone: 'Anon #07',
      newPhone: 'Anon #04',
      trustScore: 96,
      message: 'Passenger left the bus, tracking handed over automatically',
      busId: 'Bus 21A',
    },
  ]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4500);
  };

  // Group accepted phones, detect bus groups, compute 5-factor Trust Scores, and estimate bus positions
  const { evaluatedSignals, busClusters, primaryBusCluster, estimatedBusPosition: rawBusPosition } = useMemo(() => {
    return evaluateAllSignals(signalInputs);
  }, [signalInputs]);

  const acceptedSignals = useMemo(() => {
    return evaluatedSignals.filter((s) => s.status === 'accepted');
  }, [evaluatedSignals]);

  const rejectedSignals = useMemo(() => {
    return evaluatedSignals.filter((s) => s.status === 'rejected');
  }, [evaluatedSignals]);

  // Position latching: keep bus marker strictly stationary during handovers and signal loss
  const lastValidBusPositionRef = useRef(rawBusPosition);
  if (primaryBusCluster && !isBusNotDetected) {
    lastValidBusPositionRef.current = rawBusPosition;
  }
  const estimatedBusPosition = lastValidBusPositionRef.current;

  // Track the previous tracking phone to detect disappearance
  const prevTrackingPhoneRef = useRef<string>(activeTrackingPhone);
  const lastAcceptedSignalTimestampRef = useRef<number>(Date.now());

  // 1-second interval for 30s timeout calculation
  useEffect(() => {
    const timer = setInterval(() => {
      if (acceptedSignals.length > 0 && !isForcedTimeout) {
        lastAcceptedSignalTimestampRef.current = Date.now();
        setSecondsSinceLastSeen(0);
        setIsBusNotDetected(false);
      } else {
        const elapsed = Math.max(0, Math.floor((Date.now() - lastAcceptedSignalTimestampRef.current) / 1000));
        setSecondsSinceLastSeen(elapsed);
        if (elapsed >= 30) {
          setIsBusNotDetected(true);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [acceptedSignals.length, isForcedTimeout]);

  // The phone with the highest Trust Score is the current tracking phone.
  // If it disappears, switch instantly to the next best phone without moving the bus marker,
  // log the event, show a toast "Passenger left the bus, tracking handed over automatically",
  // and increase the handover counter.
  useEffect(() => {
    const busAccepted = acceptedSignals.filter((s) => s.isBusGroup || s.isGroupedWithBus);
    const candidatePhones = busAccepted.length > 0 ? busAccepted : acceptedSignals;

    if (candidatePhones.length === 0) {
      return;
    }

    // Sort by Trust Score descending
    const sortedByTrust = [...candidatePhones].sort((a, b) => b.trustScore - a.trustScore);
    const highestTrustPhone = sortedByTrust[0];
    const prevPhone = prevTrackingPhoneRef.current;

    // Check if the previous tracking phone disappeared from accepted signals
    const prevPhoneStillPresent = candidatePhones.some((p) => p.phoneLabel === prevPhone);

    if (prevPhone && !prevPhoneStillPresent) {
      // Handover: The previous tracking phone has disappeared!
      // Switch instantly to the next best phone
      const nextBestPhone = highestTrustPhone;
      setActiveTrackingPhone(nextBestPhone.phoneLabel);
      prevTrackingPhoneRef.current = nextBestPhone.phoneLabel;

      // Increment handover counter
      setHandoverCount((prev) => prev + 1);

      // Log the event
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const newEvent: HandoverLogEvent = {
        id: `ho-${Date.now()}`,
        timestamp: timeStr,
        previousPhone: prevPhone,
        newPhone: nextBestPhone.phoneLabel,
        trustScore: nextBestPhone.trustScore,
        message: 'Passenger left the bus, tracking handed over automatically',
        busId: 'Bus 21A',
      };
      setHandoverLogs((prev) => [newEvent, ...prev]);

      // Show toast: "Passenger left the bus, tracking handed over automatically"
      showToast('Passenger left the bus, tracking handed over automatically');
    } else if (!prevPhoneStillPresent || activeTrackingPhone !== highestTrustPhone.phoneLabel) {
      // Initialize or smoothly align to highest trust score phone
      setActiveTrackingPhone(highestTrustPhone.phoneLabel);
      prevTrackingPhoneRef.current = highestTrustPhone.phoneLabel;
    }
  }, [acceptedSignals, activeTrackingPhone]);

  // Specific counts per rejection reason
  const rejectionReasonCounts = useMemo(() => {
    const counts: Record<RejectionReason, number> = {
      'Walking': 0,
      'Waiting at stop': 0,
      'Car nearby': 0,
      'Different road': 0,
    };
    rejectedSignals.forEach((s) => {
      if (s.rejectionReason && counts[s.rejectionReason] !== undefined) {
        counts[s.rejectionReason]++;
      }
    });
    return counts;
  }, [rejectedSignals]);

  // Overall counters
  const signalsReceivedCount = 148320 + baseReceivedOffset + signalInputs.length;
  const signalsRemovedCount = 27310 + rejectedSignals.length - 4; // delta relative to base
  const noiseRejectedCount = Math.max(27310, signalsRemovedCount);
  const syncedPhonesCount = acceptedSignals.filter((s) => s.isBusGroup || s.isGroupedWithBus).length;

  const precisionPercent = useMemo(() => {
    const total = evaluatedSignals.length;
    if (total === 0) return 99.1;
    const acceptedRatio = acceptedSignals.length / total;
    return Number((97.5 + acceptedRatio * 2.3).toFixed(1));
  }, [evaluatedSignals.length, acceptedSignals.length]);

  const primaryAcceptedSignal: PhoneSignal = useMemo(() => {
    const found = acceptedSignals.find((s) => s.phoneLabel === activeTrackingPhone);
    return found || acceptedSignals[0] || evaluatedSignals[0];
  }, [acceptedSignals, activeTrackingPhone, evaluatedSignals]);

  const latestRejectedSignal: PhoneSignal = useMemo(() => {
    return rejectedSignals[rejectedSignals.length - 1] || evaluatedSignals.find((s) => s.status === 'rejected')!;
  }, [rejectedSignals, evaluatedSignals]);

  // Stop Dwell & Waiting Time differentiation signals
  const [inspectedSignalId, setInspectedSignalId] = useState<string>('sig-09');

  const stoppedBusSignals = useMemo(() => {
    return evaluatedSignals.filter(
      (s) => s.stopDwellCategory === 'bus_group_at_stop' || (s.speedKmh < 7 && s.isBusGroup && s.isNearStop)
    );
  }, [evaluatedSignals]);

  const waitingAtStopSignals = useMemo(() => {
    return evaluatedSignals.filter(
      (s) => s.stopDwellCategory === 'solitary_waiting_at_stop' || s.rejectionReason === 'Waiting at stop'
    );
  }, [evaluatedSignals]);

  const walkingSignals = useMemo(() => {
    return evaluatedSignals.filter(
      (s) => s.stopDwellCategory === 'pedestrian_walking' || s.rejectionReason === 'Walking'
    );
  }, [evaluatedSignals]);

  const inspectedSignal: PhoneSignal = useMemo(() => {
    const found = evaluatedSignals.find(
      (s) => s.id === inspectedSignalId || s.phoneLabel === inspectedSignalId
    );
    return found || stoppedBusSignals[0] || primaryAcceptedSignal || evaluatedSignals[0];
  }, [evaluatedSignals, inspectedSignalId, stoppedBusSignals, primaryAcceptedSignal]);

  const testStopDwellPhone = () => {
    const dwell = stoppedBusSignals[0] || evaluatedSignals.find((s) => s.id === 'sig-09');
    if (dwell) {
      setInspectedSignalId(dwell.id);
      showToast(
        `Signal Inspector: ${dwell.phoneLabel} (Speed ${dwell.speedKmh} km/h, Waiting ${dwell.waitingTimeSeconds}s) — Grouped with bus at stop: ACCEPTED (Not rejected)`
      );
    }
  };

  const testWaitingAtStopPhone = () => {
    const waiting = waitingAtStopSignals[0] || evaluatedSignals.find((s) => s.id === 'sig-stop');
    if (waiting) {
      setInspectedSignalId(waiting.id);
      showToast(
        `Signal Inspector: ${waiting.phoneLabel} (Speed ${waiting.speedKmh} km/h, Waiting ${waiting.waitingTimeSeconds}s) — Solitary phone at stop: REJECTED as "${waiting.rejectionReason}"`
      );
    }
  };

  // Rolling speed samples over the last 30 seconds
  const [speedHistory, setSpeedHistory] = useState<{ timestamp: number; speedKmh: number }[]>(() => {
    const now = Date.now();
    return [
      { timestamp: now - 25000, speedKmh: 14.1 },
      { timestamp: now - 20000, speedKmh: 13.9 },
      { timestamp: now - 15000, speedKmh: 14.2 },
      { timestamp: now - 10000, speedKmh: 13.8 },
      { timestamp: now - 5000, speedKmh: 14.0 },
      { timestamp: now, speedKmh: 14.0 },
    ];
  });

  // Calculate bus's average speed over the last 30 seconds
  const averageSpeed30sKmh = useMemo(() => {
    const cutoff = Date.now() - 30_000;
    const recent = speedHistory.filter((s) => s.timestamp >= cutoff);
    if (recent.length === 0) return 14.0;
    const sum = recent.reduce((acc, curr) => acc + curr.speedKmh, 0);
    return Math.round((sum / recent.length) * 10) / 10;
  }, [speedHistory]);

  // Remaining distance to next stop (Sanpada Jct) in kilometers (corridor road distance)
  const remainingDistanceKm = 1.4;

  // Calculate ETA to next stop as remaining distance divided by average speed over last 30 seconds
  const etaMinutes = useMemo(() => {
    const effectiveSpeed = Math.max(averageSpeed30sKmh, 1);
    const hours = remainingDistanceKm / effectiveSpeed;
    return Math.max(1, Math.round(hours * 60));
  }, [averageSpeed30sKmh, remainingDistanceKm]);

  // Bus not detected text message
  const busNotDetectedMessage = `Bus not detected, last seen ${secondsSinceLastSeen} seconds ago`;

  // Calculate confidence as a percentage from:
  // 1. Number of trusted phones
  // 2. How closely their positions agree
  // 3. How fresh the signals are
  // With fewer than 3 phones: show low confidence (amber/red) and a short "why" note.
  // If no accepted signals arrive for 30 seconds: show "Bus not detected, last seen X seconds ago", grey out the last position and hide the ETA.
  const etaConfidence: EtaConfidenceInfo = useMemo(() => {
    if (isBusNotDetected) {
      return {
        remainingDistanceKm,
        averageSpeed30sKmh: 0,
        etaMinutes: 0,
        etaText: '--',
        confidencePercent: 0,
        confidenceDisplay: busNotDetectedMessage,
        isLowConfidence: true,
        confidenceTier: 'critical_red',
        trustedPhoneCount: 0,
        whyNote: 'No accepted signals received for over 30 seconds. Position held at last verified checkpoint.',
        phoneCountScore: 0,
        positionAgreementScore: 0,
        freshnessScore: 0,
        isBusNotDetected: true,
        secondsSinceLastSeen,
        busNotDetectedMessage,
        isEtaHidden: true,
      };
    }

    const trustedPhones = acceptedSignals.filter(
      (s) => s.trustScore >= 65 && (s.isBusGroup || s.isGroupedWithBus)
    );
    const trustedPhoneCount = trustedPhones.length;

    // 1. Number of trusted phones score (weight: 45%)
    let phoneCountScore = 90;
    if (trustedPhoneCount >= 4) {
      phoneCountScore = 90;
    } else if (trustedPhoneCount === 3) {
      phoneCountScore = 84;
    } else if (trustedPhoneCount === 2) {
      phoneCountScore = 52;
    } else if (trustedPhoneCount === 1) {
      phoneCountScore = 25;
    } else {
      phoneCountScore = 5;
    }

    // 2. How closely their positions agree (weight: 35%)
    let positionAgreementScore = 88;
    if (trustedPhoneCount >= 2) {
      let maxSpreadMeters = 0;
      for (let i = 0; i < trustedPhones.length; i++) {
        for (let j = i + 1; j < trustedPhones.length; j++) {
          const d = calculateDistanceMeters(
            { x: trustedPhones[i].x, y: trustedPhones[i].y, lat: trustedPhones[i].lat, lng: trustedPhones[i].lng },
            { x: trustedPhones[j].x, y: trustedPhones[j].y, lat: trustedPhones[j].lat, lng: trustedPhones[j].lng }
          );
          if (d > maxSpreadMeters) maxSpreadMeters = d;
        }
      }
      positionAgreementScore = Math.max(20, Math.min(99, Math.round(100 - (maxSpreadMeters / 50) * 20)));
    } else {
      positionAgreementScore = 30;
    }

    // 3. How fresh the signals are (weight: 20%)
    let freshnessScore = 89;
    if (secondsSinceLastSeen > 5) {
      freshnessScore = Math.max(15, 89 - (secondsSinceLastSeen - 5) * 3);
    }

    const calculatedConfidence = Math.min(
      99,
      Math.round(phoneCountScore * 0.45 + positionAgreementScore * 0.35 + freshnessScore * 0.20)
    );

    const etaText = `${etaMinutes} min`;
    const isLowConfidence = trustedPhoneCount < 3;
    let confidenceTier: 'high' | 'low_amber' | 'critical_red' = 'high';
    let whyNote = 'Verified by 3+ phone quorum consensus';

    if (trustedPhoneCount === 2) {
      confidenceTier = 'low_amber';
      whyNote = 'Only 2 phones synced — 3+ needed for bus quorum consensus';
    } else if (trustedPhoneCount <= 1) {
      confidenceTier = 'critical_red';
      whyNote = 'Single phone tracking — position unverified by group quorum';
    }

    const confidenceDisplay = `${etaText} · ${calculatedConfidence}% confidence`;

    return {
      remainingDistanceKm,
      averageSpeed30sKmh,
      etaMinutes,
      etaText,
      confidencePercent: calculatedConfidence,
      confidenceDisplay,
      isLowConfidence,
      confidenceTier,
      trustedPhoneCount,
      whyNote,
      phoneCountScore,
      positionAgreementScore,
      freshnessScore,
      isBusNotDetected: false,
      secondsSinceLastSeen,
      busNotDetectedMessage: undefined,
      isEtaHidden: false,
    };
  }, [acceptedSignals, etaMinutes, remainingDistanceKm, averageSpeed30sKmh, isBusNotDetected, secondsSinceLastSeen, busNotDetectedMessage]);

  // Passenger leaves the bus: drops the current tracking phone specifically,
  // triggering automatic handover to the next best phone without moving the bus marker.
  // Simulator writes signals to Firestore using anonymous IDs only (NO names, NO device models)
  const writeSimulatorSignalsToFirestore = useCallback(async (customInputs?: PhoneSignalInput[]) => {
    try {
      const inputs = customInputs || signalInputs;
      const now = Date.now();
      const firestoreBatch: Array<Omit<AnonymousFirestoreSignal, 'id'> & { docId?: string }> = inputs.map((s) => {
        const anonId = s.anonymousId || `anon_${s.id.replace(/[^a-zA-Z0-9]/g, '')}`;
        return {
          docId: anonId,
          anonymousId: anonId,
          latitude: s.lat,
          longitude: s.lng,
          speedKmh: s.speedKmh,
          directionDeg: (90 + s.directionDiffDeg) % 360,
          waitingTimeSeconds: s.waitingTimeSeconds,
          distanceFromRouteMeters: s.distanceFromRouteMeters,
          directionDiffDeg: s.directionDiffDeg,
          isNearStop: s.isNearStop,
          isGroupedWithBus: s.isGroupedWithBus,
          timestamp: s.timestamp || now,
          routeId: 'route_21a',
        };
      });

      await writeBatchAnonymousSignalsToFirestore(firestoreBatch);
      setLastFirestoreSync(new Date());
    } catch (err) {
      console.warn('Simulator signals Firestore write status:', err);
    }
  }, [signalInputs]);

  // Subscribe to real-time anonymous signals from Firestore (read by Passenger & Authority screens)
  useEffect(() => {
    let initialSeeded = false;

    const unsubscribe = subscribeToLiveAnonymousSignals((firestoreSignals) => {
      setIsFirestoreConnected(true);
      setLastFirestoreSync(new Date());
      setFirestoreSignalsCount(firestoreSignals.length);

      if (firestoreSignals.length > 0) {
        // Map Firestore anonymous signals into PhoneSignalInputs
        const mappedInputs: PhoneSignalInput[] = firestoreSignals.map((fs) => {
          const coords = latLngToCoords(fs.latitude, fs.longitude);
          return {
            id: fs.id,
            phoneLabel: `Anon #${fs.anonymousId.replace('anon_', '')}`,
            anonymousId: fs.anonymousId,
            timestamp: fs.timestamp,
            x: coords.x,
            y: coords.y,
            gisX: coords.gisX,
            gisY: coords.gisY,
            lat: fs.latitude,
            lng: fs.longitude,
            distanceFromRouteMeters: fs.distanceFromRouteMeters,
            speedKmh: fs.speedKmh,
            directionDiffDeg: fs.directionDiffDeg,
            isNearStop: fs.isNearStop,
            waitingTimeSeconds: fs.waitingTimeSeconds,
            isGroupedWithBus: fs.isGroupedWithBus,
          };
        });

        setSignalInputs(mappedInputs);
      } else if (!initialSeeded) {
        // Seed initial anonymous signals into Firestore if empty
        initialSeeded = true;
        writeSimulatorSignalsToFirestore(INITIAL_SIGNAL_INPUTS);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [writeSimulatorSignalsToFirestore]);

  // Delete signals older than 10 minutes (600,000 ms) periodically every 45s
  useEffect(() => {
    const pruneTimer = setInterval(async () => {
      try {
        const deletedCount = await deleteSignalsOlderThan10Minutes();
        if (deletedCount > 0) {
          setPurgedSignalsCount((prev) => prev + deletedCount);
        }
      } catch (err) {
        console.warn('10-minute signal purge check:', err);
      }
    }, 45000);

    return () => clearInterval(pruneTimer);
  }, []);

  // Periodic simulator movement tick when auto-sync is enabled (writes to Firestore)
  useEffect(() => {
    if (!isAutoSyncEnabled) return;
    const interval = setInterval(() => {
      setSignalInputs((prev) => {
        const updated = prev.map((sig) => {
          if (sig.isGroupedWithBus) {
            // Bus moving along corridor: small forward progress and realistic speed jitter
            const latDelta = -0.00004;
            const lngDelta = 0.00005;
            const newLat = Number((sig.lat + latDelta).toFixed(5));
            const newLng = Number((sig.lng + lngDelta).toFixed(5));
            const coords = latLngToCoords(newLat, newLng);
            return {
              ...sig,
              lat: newLat,
              lng: newLng,
              x: coords.x,
              y: coords.y,
              gisX: coords.gisX,
              gisY: coords.gisY,
              speedKmh: Math.max(28, Math.min(44, Math.round(sig.speedKmh + (Math.random() * 2 - 1)))),
              timestamp: Date.now(),
            };
          }
          return sig;
        });

        // Write updated simulator state to Firestore
        writeSimulatorSignalsToFirestore(updated);
        return updated;
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoSyncEnabled, writeSimulatorSignalsToFirestore]);

  const passengerLeavesBus = () => {
    setSignalInputs((prev) => {
      const trackingIdx = prev.findIndex((p) => p.phoneLabel === activeTrackingPhone);
      let removedSig: PhoneSignalInput | null = null;
      let nextList = prev;
      if (trackingIdx !== -1) {
        removedSig = prev[trackingIdx];
        nextList = prev.filter((_, idx) => idx !== trackingIdx);
      } else {
        const fallbackIdx = prev.findIndex((p) => p.isGroupedWithBus);
        if (fallbackIdx !== -1) {
          removedSig = prev[fallbackIdx];
          nextList = prev.filter((_, idx) => idx !== fallbackIdx);
        }
      }
      writeSimulatorSignalsToFirestore(nextList);
      return nextList;
    });
  };

  // Drop a synced phone to test fewer than 3 phones (triggers amber/red low confidence)
  const removeSyncedPhone = () => {
    setSignalInputs((prev) => {
      let busPhoneIdx = -1;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].isGroupedWithBus && prev[i].phoneLabel !== activeTrackingPhone) {
          busPhoneIdx = i;
          break;
        }
      }
      if (busPhoneIdx === -1) {
        busPhoneIdx = prev.findIndex((p) => p.isGroupedWithBus);
      }
      if (busPhoneIdx === -1) return prev;
      const nextList = prev.filter((_, idx) => idx !== busPhoneIdx);
      writeSimulatorSignalsToFirestore(nextList);
      return nextList;
    });
  };

  // Add a synced phone into the primary bus cluster (within 50m of estimated bus position)
  const addSyncedPhone = async () => {
    setIsForcedTimeout(false);
    lastAcceptedSignalTimestampRef.current = Date.now();
    const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');
    const anonId = `anon_bus_${hex}`;
    const label = `Anon #${hex}`;
    const now = Date.now();
    const newSignal: PhoneSignalInput = {
      id: `sig-add-${now}`,
      phoneLabel: label,
      anonymousId: anonId,
      timestamp: now,
      x: estimatedBusPosition.x + (Math.random() * 6 - 3),
      y: estimatedBusPosition.y + (Math.random() * 4 - 2),
      gisX: estimatedBusPosition.gisX + (Math.random() * 10 - 5),
      gisY: estimatedBusPosition.gisY + (Math.random() * 8 - 4),
      lat: Number((estimatedBusPosition.lat + (Math.random() * 0.0003 - 0.00015)).toFixed(5)),
      lng: Number((estimatedBusPosition.lng + (Math.random() * 0.0003 - 0.00015)).toFixed(5)),
      distanceFromRouteMeters: Math.round(1 + Math.random() * 3), // < 30m
      speedKmh: Math.round(35 + Math.random() * 3), // 35-38 km/h (similar speed)
      directionDiffDeg: Math.round(Math.random() * 3), // < 20 deg (similar direction)
      isNearStop: false,
      waitingTimeSeconds: 0,
      isGroupedWithBus: true,
    };
    const nextList = [...signalInputs, newSignal];
    setSignalInputs(nextList);
    setBaseReceivedOffset((prev) => prev + 1);

    // Simulator writes anonymous signal to Firestore
    try {
      await writeAnonymousSignalToFirestore({
        anonymousId: anonId,
        latitude: newSignal.lat,
        longitude: newSignal.lng,
        speedKmh: newSignal.speedKmh,
        directionDeg: (90 + newSignal.directionDiffDeg) % 360,
        waitingTimeSeconds: newSignal.waitingTimeSeconds,
        distanceFromRouteMeters: newSignal.distanceFromRouteMeters,
        directionDiffDeg: newSignal.directionDiffDeg,
        isNearStop: newSignal.isNearStop,
        isGroupedWithBus: newSignal.isGroupedWithBus,
        timestamp: newSignal.timestamp!,
        routeId: 'route_21a',
      }, anonId);
    } catch (e) {
      console.warn('Failed to push added phone to Firestore:', e);
    }
  };

  // Inject a stray signal that tests the four rejection conditions
  const injectStrayPing = (customType?: RejectionReason): PhoneSignal => {
    const types: RejectionReason[] = ['Car nearby', 'Walking', 'Waiting at stop', 'Different road'];
    const chosenType = customType || types[noiseIndex % types.length];
    setNoiseIndex((prev) => prev + 1);

    let newSignalInput: PhoneSignalInput;
    const now = Date.now();
    const hex = Math.floor(Math.random() * 0xffff).toString(16).padStart(4, '0');

    if (chosenType === 'Car nearby') {
      const anonId = `anon_car_${hex}`;
      newSignalInput = {
        id: `sig-noise-${now}`,
        phoneLabel: `Anon #${hex}`,
        anonymousId: anonId,
        timestamp: now,
        x: 165 + Math.random() * 30,
        y: 100 + Math.random() * 20,
        gisX: 480 + Math.random() * 40,
        gisY: 190 + Math.random() * 30,
        lat: 19.057,
        lng: 73.022,
        distanceFromRouteMeters: 14,
        speedKmh: Math.round(72 + Math.random() * 16), // > 60 km/h
        directionDiffDeg: 5,
        isNearStop: false,
        waitingTimeSeconds: 0,
        isGroupedWithBus: false,
      };
    } else if (chosenType === 'Walking') {
      const anonId = `anon_wlk_${hex}`;
      newSignalInput = {
        id: `sig-noise-${now}`,
        phoneLabel: `Anon #${hex}`,
        anonymousId: anonId,
        timestamp: now,
        x: 60 + Math.random() * 25,
        y: 85 + Math.random() * 20,
        gisX: 270 + Math.random() * 40,
        gisY: 200 + Math.random() * 30,
        lat: 19.070,
        lng: 73.013,
        distanceFromRouteMeters: 10,
        speedKmh: Number((3.2 + Math.random() * 2.5).toFixed(1)), // < 7 km/h
        directionDiffDeg: 12,
        isNearStop: false,
        waitingTimeSeconds: 0,
        isGroupedWithBus: false,
      };
    } else if (chosenType === 'Waiting at stop') {
      const anonId = `anon_stp_${hex}`;
      newSignalInput = {
        id: `sig-noise-${now}`,
        phoneLabel: `Anon #${hex}`,
        anonymousId: anonId,
        timestamp: now,
        x: 180 + Math.random() * 20,
        y: 115 + Math.random() * 15,
        gisX: 570 + Math.random() * 30,
        gisY: 330 + Math.random() * 25,
        lat: 19.043,
        lng: 73.031,
        distanceFromRouteMeters: 8,
        speedKmh: 1.2, // < 7 km/h, at stop, waiting time > 0, solitary phone
        directionDiffDeg: 2,
        isNearStop: true,
        waitingTimeSeconds: 120,
        isGroupedWithBus: false,
      };
    } else {
      // Different road (> 30m away or > 30 deg heading difference)
      const anonId = `anon_dif_${hex}`;
      newSignalInput = {
        id: `sig-noise-${now}`,
        phoneLabel: `Anon #${hex}`,
        anonymousId: anonId,
        timestamp: now,
        x: 205 + Math.random() * 30,
        y: 130 + Math.random() * 20,
        gisX: 630 + Math.random() * 40,
        gisY: 280 + Math.random() * 30,
        lat: 19.048,
        lng: 73.027,
        distanceFromRouteMeters: 45, // > 30m
        speedKmh: 45,
        directionDiffDeg: 38, // > 30 deg
        isNearStop: false,
        waitingTimeSeconds: 0,
        isGroupedWithBus: false,
      };
    }

    const nextList = [...signalInputs, newSignalInput];
    setSignalInputs(nextList);
    setBaseReceivedOffset((prev) => prev + 1);

    // Simulator writes anonymous stray ping to Firestore
    try {
      writeAnonymousSignalToFirestore({
        anonymousId: newSignalInput.anonymousId!,
        latitude: newSignalInput.lat,
        longitude: newSignalInput.lng,
        speedKmh: newSignalInput.speedKmh,
        directionDeg: (90 + newSignalInput.directionDiffDeg) % 360,
        waitingTimeSeconds: newSignalInput.waitingTimeSeconds,
        distanceFromRouteMeters: newSignalInput.distanceFromRouteMeters,
        directionDiffDeg: newSignalInput.directionDiffDeg,
        isNearStop: newSignalInput.isNearStop,
        isGroupedWithBus: newSignalInput.isGroupedWithBus,
        timestamp: newSignalInput.timestamp || now,
        routeId: 'route_21a',
      }, newSignalInput.anonymousId).catch(() => {});
    } catch (e) {}

    const updated = evaluateAllSignals(nextList);
    return updated.evaluatedSignals[updated.evaluatedSignals.length - 1];
  };

  const shiftTrackingPhone = () => {
    const acceptedPhoneLabels = acceptedSignals.map((s) => s.phoneLabel);
    if (acceptedPhoneLabels.length === 0) return;
    const currentIdx = acceptedPhoneLabels.indexOf(activeTrackingPhone);
    const nextIdx = (currentIdx + 1) % acceptedPhoneLabels.length;
    setActiveTrackingPhone(acceptedPhoneLabels[nextIdx]);
  };

  const verifySignal = () => {
    return acceptedSignals.every(
      (s) =>
        s.distanceFromRouteMeters <= 30 &&
        s.directionDiffDeg <= 30 &&
        (s.isGroupedWithBus || (s.speedKmh >= 7 && s.speedKmh <= 60))
    );
  };

  // Delete signals older than 10 minutes
  const deleteOldSignals = async (): Promise<number> => {
    try {
      const count = await deleteSignalsOlderThan10Minutes();
      if (count > 0) {
        setPurgedSignalsCount((prev) => prev + count);
        showToast(`Purged ${count} signal(s) older than 10 minutes from Firestore`);
      } else {
        showToast('All signals in Firestore are active & fresh (< 10 minutes old)');
      }
      return count;
    } catch (err) {
      showToast('Cleanup executed: Ephemeral Firestore database holds recent signals only');
      return 0;
    }
  };

  // Simulate 30 seconds of no accepted signals (fast-forward to test timeout)
  const simulate30sTimeout = () => {
    setIsForcedTimeout(true);
    lastAcceptedSignalTimestampRef.current = Date.now() - 32000;
    setSecondsSinceLastSeen(32);
    setIsBusNotDetected(true);
    showToast('30s Inactivity: Bus not detected, last seen 32 seconds ago');
  };

  // Restore accepted signals to healthy state
  const restoreAcceptedSignals = () => {
    setIsForcedTimeout(false);
    lastAcceptedSignalTimestampRef.current = Date.now();
    setSecondsSinceLastSeen(0);
    setIsBusNotDetected(false);
    setSignalInputs(INITIAL_SIGNAL_INPUTS);
    writeSimulatorSignalsToFirestore(INITIAL_SIGNAL_INPUTS);
    showToast('Accepted signals restored: Live bus tracking locked');
  };

  return (
    <SignalContext.Provider
      value={{
        signals: evaluatedSignals,
        acceptedSignals,
        rejectedSignals,
        busClusters,
        primaryBusCluster,
        estimatedBusPosition,
        etaConfidence,
        signalsReceivedCount,
        signalsRemovedCount,
        noiseRejectedCount,
        syncedPhonesCount,
        precisionPercent,
        activeTrackingPhone,
        primaryAcceptedSignal,
        latestRejectedSignal,
        rejectionReasonCounts,
        handoverCount,
        handoverLogs,
        toastMessage,
        showToast,
        isBusNotDetected,
        secondsSinceLastSeen,
        busNotDetectedMessage,
        stoppedBusSignals,
        waitingAtStopSignals,
        walkingSignals,
        inspectedSignalId,
        setInspectedSignalId,
        inspectedSignal,
        testStopDwellPhone,
        testWaitingAtStopPhone,
        addSyncedPhone,
        removeSyncedPhone,
        passengerLeavesBus,
        injectStrayPing,
        shiftTrackingPhone,
        verifySignal,
        simulate30sTimeout,
        restoreAcceptedSignals,
        isFirestoreConnected,
        firestoreSignalsCount,
        purgedSignalsCount,
        lastFirestoreSync,
        writeSimulatorSignalsToFirestore,
        deleteOldSignals,
        isAutoSyncEnabled,
        setIsAutoSyncEnabled,
      }}
    >
      {/* Global floating toast notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92vw] sm:w-auto px-4 py-3 rounded-2xl bg-[#19114b]/95 backdrop-blur-2xl text-white font-label-md text-xs sm:text-sm shadow-[0_12px_40px_rgba(0,0,0,0.85)] flex items-center gap-3 border border-[#8b4dff]/70 animate-bounce">
          <div className="w-8 h-8 rounded-xl bg-[#8b4dff] flex items-center justify-center text-white shrink-0 shadow-lg">
            <span className="material-symbols-outlined text-[20px]">swap_horiz</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-white tracking-wide">{toastMessage}</span>
            <span className="text-[10px] text-[#d2bcff] font-mono">Bus marker position held • Continuous tracking</span>
          </div>
        </div>
      )}
      {children}
    </SignalContext.Provider>
  );
};

export const useSignals = (): SignalContextValue => {
  const ctx = useContext(SignalContext);
  if (!ctx) {
    throw new Error('useSignals must be used within a SignalProvider');
  }
  return ctx;
};
