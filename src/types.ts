export type UserRole = 'passenger' | 'authority';

export type PassengerTab = 'home' | 'live-map' | 'route-chat' | 'rewards' | 'profile';
export type AuthorityTab =
  | 'overview'
  | 'live-map'
  | 'alerts'
  | 'system-health'
  | 'demo-mode'
  | 'coverage-gaps'
  | 'diagnostics';

export type OccupancyLevel = 'empty' | 'seats_full' | 'crowded';

export interface BusLiveStatus {
  id: string;
  name: string;
  operator?: 'NMMT' | 'BEST' | 'TMT' | 'KDMT' | 'MSRTC' | string;
  route: string;
  direction: string;
  speed: number;
  status: 'on-time' | 'delayed' | 'early' | 'standby' | 'severed';
  headwayText: string;
  delayMinutes: number;
  sector: string;
  clusterNodes: number;
  currentPhone: string;
  confidencePercent: number;
  lat: number;
  lng: number;
  confidenceLevel: 'High' | 'Bottleneck' | 'Normal' | 'Low Crowd' | 'Standby';
  isNotDetected?: boolean;
  lastSeenSeconds?: number;
  nearestStop?: string;
  nextStop?: string;
  nextStopEtaMinutes?: number;
  distanceKm?: number;
  isStaticSchedule?: boolean;
}

export interface TransitStop {
  id: string;
  name: string;
  code: string;
  subtext: string;
  lat: number;
  lng: number;
  x: number;
  y: number;
  order: number;
  isBottleneck?: boolean;
  operator?: 'NMMT' | 'BEST' | 'TMT' | 'KDMT' | 'MSRTC' | 'Interchange' | string;
}

export interface TransitOperator {
  id: 'NMMT' | 'BEST' | 'TMT' | 'KDMT' | 'MSRTC';
  name: string;
  fullName: string;
  primaryArea: string;
  trackingSupport: 'live_crowd_and_telemetry' | 'static_schedule_only';
  feedStatus: string;
  description: string;
}

export interface ChatReport {
  id: string;
  busId?: string;
  busName?: string;
  type: 'confidence_alert' | 'passenger_message' | 'obstruction' | 'sighting' | 'official';
  author: string;
  authorBadge?: string;
  authorRole?: string;
  phoneNode?: string;
  avatarText?: string;
  avatarBg?: string;
  timestamp: string;
  content: string;
  confidence?: number;
  pingId?: string;
  speed?: string;
  delayText?: string;
  helpfulCount?: number;
  replyCount?: number;
  likes?: number;
  geoImageUrl?: string;
  photoImageUrl?: string;
  confirmationsCount?: number;
  statusBadge?: string;
  statusBadgeColor?: string;
  isPinned?: boolean;
}

export interface NodeTrustMetric {
  phoneId: string;
  label: string;
  roleTag: string;
  trustScore: number;
  routeMatch: number;
  speedPattern: number;
  directionAlignment: number;
  movementConsistency: number;
  dwellTime?: number;
  velocityAlign?: number;
  statusText?: string;
  isFilteredOut?: boolean;
  filterReason?: string;
}

export type RejectionReason = 'Walking' | 'Waiting at stop' | 'Car nearby' | 'Different road';

export interface HandoverLogEvent {
  id: string;
  timestamp: string;
  previousPhone: string;
  newPhone: string;
  trustScore: number;
  message: string;
  busId: string;
}

export interface EtaConfidenceInfo {
  remainingDistanceKm: number;
  averageSpeed30sKmh: number;
  etaMinutes: number;
  etaText: string; // e.g. "6 min"
  confidencePercent: number; // e.g. 89
  confidenceDisplay: string; // e.g. "6 min · 89% confidence" or "Bus not detected, last seen X seconds ago"
  isLowConfidence: boolean; // true if < 3 phones
  confidenceTier: 'high' | 'low_amber' | 'critical_red';
  trustedPhoneCount: number;
  whyNote: string;
  // Factors driving confidence
  phoneCountScore: number;
  positionAgreementScore: number;
  freshnessScore: number;
  // Timeout detection fields
  isBusNotDetected: boolean;
  secondsSinceLastSeen: number;
  busNotDetectedMessage?: string;
  isEtaHidden: boolean;
}

export interface BusCluster {
  id: string;
  name: string;
  phoneCount: number;
  phoneIds: string[];
  isBus: boolean; // 3 or more matching phones
  // Trust-weighted average position along the route
  estimatedX: number;
  estimatedY: number;
  estimatedGisX: number;
  estimatedGisY: number;
  estimatedLat: number;
  estimatedLng: number;
  averageSpeedKmh: number;
  averageTrustScore: number;
}

export interface PhoneSignal {
  id: string;
  phoneLabel: string;
  anonymousId?: string; // Anonymous device hash strictly containing no user name or device model
  firestoreTimestamp?: number; // Epoch ms timestamp in Firestore
  x: number; // Passenger canvas coordinate (400x240)
  y: number;
  gisX: number; // Authority canvas coordinate (1000x650)
  gisY: number;
  lat: number;
  lng: number;

  distanceFromRouteMeters: number;
  speedKmh: number;
  directionDiffDeg: number;
  isNearStop: boolean;
  waitingTimeSeconds: number;
  isGroupedWithBus: boolean;

  status: 'accepted' | 'rejected';
  rejectionReason?: RejectionReason;
  trustScore: number; // 0-100 computed from 5 weighted factors
  polylineMatch: number;
  velocityAlign: number;
  dwellTimeScore: number;

  // Exact 5-factor Trust Score breakdown (weights: 30%, 20%, 20%, 15%, 15%)
  routeMatchScore: number;       // 30% weight: distance from route centerline
  speedPatternScore: number;     // 20% weight: transit speed conformity
  directionScore: number;        // 20% weight: route heading angle alignment
  consistencyScore: number;      // 15% weight: movement consistency
  stayingWithGroupScore: number; // 15% weight: group adherence

  // Cluster info
  clusterId?: string;
  isBusGroup: boolean;           // true if part of a group with 3+ matching phones
  matchedPhoneCount: number;     // number of phones in the matched group

  // Stop Dwell & Waiting Time differentiation calculations
  stopDwellCategory?: 'bus_group_at_stop' | 'solitary_waiting_at_stop' | 'pedestrian_walking' | 'normal_transit';
  stopDwellNote?: string;
  isPartofBusGroup?: boolean;
}

export interface SectorHealth {
  id: string;
  sectorName: string;
  routeRange: string;
  distance: string;
  status: 'optimal' | 'congested' | 'normal';
  statusText: string;
  flowRatePercent: number;
  flowRateLabel: string;
  headway: string;
  headwayNotice?: string;
  signalsCount: number;
}

export interface DirectBusOption {
  busId: string;
  busNumber: string;
  routeTitle: string;
  fromStop: string;
  toStop: string;
  status: string;
  statusType: 'on-time' | 'delayed' | 'early' | 'approaching';
  etaMinutes: number;
  travelTimeMinutes: number;
  nextMajorStops: string[];
  liveTrackingConfidence: 'High' | 'Medium' | 'Low';
  liveTrackingText: string;
  distanceKm?: number;
  direction: string;
  originalBus?: BusLiveStatus;
}

export interface ConnectingLeg {
  busId: string;
  busNumber: string;
  routeTitle: string;
  boardingStop: string;
  dropOffStop: string;
  estimatedWaitMinutes: number;
  estimatedTravelMinutes: number;
  liveStatusText: string;
  liveConfidence: 'High' | 'Medium' | 'Low';
  nextMajorStops?: string[];
  originalBus?: BusLiveStatus;
}

export interface ConnectingRouteOption {
  id: string;
  title: string;
  transferStop: string;
  transferWaitMinutes: number;
  totalJourneyMinutes: number;
  totalTransfers: number;
  legs: ConnectingLeg[];
}

export interface RouteSearchResult {
  fromLocation: string;
  toLocation: string;
  hasDirect: boolean;
  directBuses: DirectBusOption[];
  connectingOptions: ConnectingRouteOption[];
}
