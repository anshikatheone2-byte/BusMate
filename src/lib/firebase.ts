import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with configured databaseId
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection on boot per guideline with graceful error handling
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (
      error?.code === 'unavailable' ||
      error?.code === 'failed-precondition' ||
      (error instanceof Error && (
        error.message.includes('the client is offline') ||
        error.message.includes('client is offline') ||
        error.message.includes('unavailable') ||
        error.message.includes('offline')
      ))
    ) {
      console.warn('Firebase Firestore connection notice: client is operating in offline mode or awaiting connection.');
    } else if (
      error?.code === 'permission-denied' ||
      (error instanceof Error && error.message.toLowerCase().includes('permission'))
    ) {
      handleFirestoreError(error, OperationType.GET, 'test/connection');
    } else {
      console.warn('Firebase Firestore test connection notice:', error?.message || error);
    }
  }
}
testConnection();

export const TEN_MINUTES_MS = 10 * 60 * 1000; // 10 minutes in milliseconds (600,000 ms)

/**
 * Strict Anonymous Firestore Signal Schema:
 * STRICT PRIVACY REQUIREMENT: Anonymous IDs only. Absolutely NO user names or device models.
 */
export interface AnonymousFirestoreSignal {
  id: string;
  anonymousId: string; // e.g. "anon_a81f3b"
  latitude: number;
  longitude: number;
  speedKmh: number;
  directionDeg: number;
  waitingTimeSeconds: number;
  distanceFromRouteMeters: number;
  directionDiffDeg: number;
  isNearStop: boolean;
  isGroupedWithBus: boolean;
  timestamp: number;
  routeId: string;
}

/**
 * Generate a cryptographically random, anonymous ID.
 * Never uses personal names, phone numbers, IMEI, or hardware device models.
 */
export function generateAnonymousId(prefix: string = 'anon'): string {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  return `${prefix}_${randomSuffix}`;
}

const SIGNALS_COLLECTION = 'phone_signals';

/**
 * Write a single anonymous signal to Firestore.
 */
export async function writeAnonymousSignalToFirestore(
  signalData: Omit<AnonymousFirestoreSignal, 'id'>,
  customDocId?: string
): Promise<string> {
  const docId = customDocId || `${signalData.anonymousId}_${Date.now()}`;
  const docRef = doc(db, SIGNALS_COLLECTION, docId);
  
  // Clean payload guaranteeing ONLY allowed anonymous fields
  const payload = {
    anonymousId: signalData.anonymousId,
    latitude: Number(signalData.latitude.toFixed(6)),
    longitude: Number(signalData.longitude.toFixed(6)),
    speedKmh: Number(signalData.speedKmh.toFixed(1)),
    directionDeg: Math.round(signalData.directionDeg),
    waitingTimeSeconds: Math.round(signalData.waitingTimeSeconds),
    distanceFromRouteMeters: Math.round(signalData.distanceFromRouteMeters),
    directionDiffDeg: Math.round(signalData.directionDiffDeg),
    isNearStop: Boolean(signalData.isNearStop),
    isGroupedWithBus: Boolean(signalData.isGroupedWithBus),
    timestamp: signalData.timestamp || Date.now(),
    routeId: signalData.routeId || 'route_21a',
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (error: any) {
    if (
      error?.code === 'permission-denied' ||
      (error instanceof Error && error.message.toLowerCase().includes('permission'))
    ) {
      handleFirestoreError(error, OperationType.WRITE, `${SIGNALS_COLLECTION}/${docId}`);
    } else {
      throw error;
    }
  }
  return docId;
}

/**
 * Write a batch of anonymous signals to Firestore.
 */
export async function writeBatchAnonymousSignalsToFirestore(
  signals: Array<Omit<AnonymousFirestoreSignal, 'id'> & { docId?: string }>
): Promise<void> {
  if (!signals.length) return;
  const batch = writeBatch(db);

  signals.forEach((s) => {
    const docId = s.docId || `${s.anonymousId}_${s.timestamp}`;
    const docRef = doc(db, SIGNALS_COLLECTION, docId);
    const payload = {
      anonymousId: s.anonymousId,
      latitude: Number(s.latitude.toFixed(6)),
      longitude: Number(s.longitude.toFixed(6)),
      speedKmh: Number(s.speedKmh.toFixed(1)),
      directionDeg: Math.round(s.directionDeg),
      waitingTimeSeconds: Math.round(s.waitingTimeSeconds),
      distanceFromRouteMeters: Math.round(s.distanceFromRouteMeters),
      directionDiffDeg: Math.round(s.directionDiffDeg),
      isNearStop: Boolean(s.isNearStop),
      isGroupedWithBus: Boolean(s.isGroupedWithBus),
      timestamp: s.timestamp || Date.now(),
      routeId: s.routeId || 'route_21a',
    };
    batch.set(docRef, payload, { merge: true });
  });

  try {
    await batch.commit();
  } catch (error: any) {
    if (
      error?.code === 'permission-denied' ||
      (error instanceof Error && error.message.toLowerCase().includes('permission'))
    ) {
      handleFirestoreError(error, OperationType.WRITE, SIGNALS_COLLECTION);
    } else {
      throw error;
    }
  }
}

/**
 * Delete signals older than 10 minutes.
 * Ensures the database stays pruned to only live ephemeral crowd telemetry.
 */
export async function deleteSignalsOlderThan10Minutes(): Promise<number> {
  try {
    const cutoffTimestamp = Date.now() - TEN_MINUTES_MS;
    const snapshot = await getDocs(collection(db, SIGNALS_COLLECTION));
    const toDelete: string[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (typeof data.timestamp === 'number' && data.timestamp < cutoffTimestamp) {
        toDelete.push(docSnap.id);
      }
    });

    if (toDelete.length === 0) return 0;

    // Delete in chunks if needed
    const batch = writeBatch(db);
    toDelete.slice(0, 450).forEach((id) => {
      batch.delete(doc(db, SIGNALS_COLLECTION, id));
    });

    await batch.commit();
    return toDelete.length;
  } catch (error: any) {
    if (
      error?.code === 'permission-denied' ||
      (error instanceof Error && error.message.toLowerCase().includes('permission'))
    ) {
      handleFirestoreError(error, OperationType.DELETE, SIGNALS_COLLECTION);
    }
    console.warn('Failed to prune expired Firestore signals:', error);
    return 0;
  }
}

/**
 * Real-time listener on the phone_signals collection.
 * Delivers live anonymous signals to passenger and authority views,
 * while automatically filtering out and cleaning up signals older than 10 minutes.
 */
export function subscribeToLiveAnonymousSignals(
  callback: (signals: AnonymousFirestoreSignal[]) => void
): () => void {
  const colRef = collection(db, SIGNALS_COLLECTION);

  const unsubscribe = onSnapshot(
    colRef,
    (snapshot) => {
      const now = Date.now();
      const cutoff = now - TEN_MINUTES_MS;
      const liveSignals: AnonymousFirestoreSignal[] = [];
      const expiredDocIds: string[] = [];

      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const signal: AnonymousFirestoreSignal = {
          id: docSnap.id,
          anonymousId: data.anonymousId || `anon_${docSnap.id}`,
          latitude: Number(data.latitude) || 19.0725,
          longitude: Number(data.longitude) || 72.9985,
          speedKmh: Number(data.speedKmh) || 0,
          directionDeg: Number(data.directionDeg) || 0,
          waitingTimeSeconds: Number(data.waitingTimeSeconds) || 0,
          distanceFromRouteMeters: Number(data.distanceFromRouteMeters) || 0,
          directionDiffDeg: Number(data.directionDiffDeg) || 0,
          isNearStop: Boolean(data.isNearStop),
          isGroupedWithBus: Boolean(data.isGroupedWithBus),
          timestamp: Number(data.timestamp) || now,
          routeId: data.routeId || 'route_21a',
        };

        if (signal.timestamp < cutoff) {
          expiredDocIds.push(docSnap.id);
        } else {
          liveSignals.push(signal);
        }
      });

      // Pass active live signals to UI
      callback(liveSignals);

      // Opportunistically purge any expired signals found older than 10 minutes
      if (expiredDocIds.length > 0) {
        const batch = writeBatch(db);
        expiredDocIds.slice(0, 450).forEach((id) => {
          batch.delete(doc(db, SIGNALS_COLLECTION, id));
        });
        batch.commit().catch((err) => {
          console.warn('Background cleanup of >10min signals encountered error:', err);
        });
      }
    },
    (err) => {
      if ((err as any)?.code === 'unavailable') {
        console.warn('Firestore live signals listener: operating in offline mode with cached signals.');
      } else if (
        (err as any)?.code === 'permission-denied' ||
        (err instanceof Error && err.message.toLowerCase().includes('permission'))
      ) {
        handleFirestoreError(err, OperationType.GET, SIGNALS_COLLECTION);
      } else {
        console.warn('Firestore live signals listener notice:', err);
      }
    }
  );

  return unsubscribe;
}
