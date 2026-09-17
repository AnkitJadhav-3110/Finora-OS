import { doc, getDocFromServer } from 'firebase/firestore';
import { db, auth, storage } from '../lib/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export interface HealthCheckResult {
  overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    firebaseApp: {
      status: 'ok' | 'error';
      projectId: string;
      appId: string;
      error?: string;
    };
    authentication: {
      status: 'ok' | 'error';
      currentUser: {
        uid?: string;
        email?: string;
        emailVerified?: boolean;
      } | null;
      error?: string;
    };
    firestore: {
      status: 'ok' | 'error';
      databaseId: string;
      latencyMs?: number;
      error?: string;
      errorDetails?: any;
    };
    storage: {
      status: 'ok' | 'error';
      bucket: string;
      error?: string;
    };
    network: {
      status: 'online' | 'offline';
      online: boolean;
      error?: string;
    };
  };
}

// Global variable to keep track of the latest health status
let latestHealthResult: HealthCheckResult | null = null;
let healthCheckListeners: ((result: HealthCheckResult) => void)[] = [];

export function getLatestHealthResult() {
  return latestHealthResult;
}

export function subscribeToHealthChanges(listener: (result: HealthCheckResult) => void) {
  healthCheckListeners.push(listener);
  if (latestHealthResult) {
    listener(latestHealthResult);
  }
  return () => {
    healthCheckListeners = healthCheckListeners.filter(l => l !== listener);
  };
}

function notifyHealthListeners(result: HealthCheckResult) {
  latestHealthResult = result;
  healthCheckListeners.forEach(listener => {
    try {
      listener(result);
    } catch (e) {
      console.error('Error notifying health check listener:', e);
    }
  });
}

/**
 * Executes a full Firebase health check and logs a beautiful report to the Developer Console.
 */
export async function runFirebaseHealthCheck(): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Initialize result structure
  const result: HealthCheckResult = {
    overallStatus: 'healthy',
    timestamp,
    checks: {
      firebaseApp: {
        status: 'ok',
        projectId: firebaseConfig.projectId || 'unknown',
        appId: firebaseConfig.appId || 'unknown'
      },
      authentication: {
        status: 'ok',
        currentUser: null
      },
      firestore: {
        status: 'ok',
        databaseId: firebaseConfig.firestoreDatabaseId || '(default)'
      },
      storage: {
        status: 'ok',
        bucket: firebaseConfig.storageBucket || 'unknown'
      },
      network: {
        status: 'online',
        online: navigator.onLine
      }
    }
  };

  // 1. Audit Network Connectivity
  if (!navigator.onLine) {
    result.checks.network.status = 'offline';
    result.checks.network.error = 'Navigator reports browser is offline';
    result.overallStatus = 'unhealthy';
  }

  // 2. Audit Firebase App Configuration
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      throw new Error('Missing critical fields in firebase-applet-config.json');
    }
  } catch (err: any) {
    result.checks.firebaseApp.status = 'error';
    result.checks.firebaseApp.error = err.message;
    result.overallStatus = 'unhealthy';
  }

  // 3. Audit Authentication
  try {
    const user = auth.currentUser;
    if (user) {
      result.checks.authentication.currentUser = {
        uid: user.uid,
        email: user.email || undefined,
        emailVerified: user.emailVerified
      };
    }
  } catch (err: any) {
    result.checks.authentication.status = 'error';
    result.checks.authentication.error = err.message;
    if (result.overallStatus !== 'unhealthy') {
      result.overallStatus = 'degraded';
    }
  }

  // 4. Audit Firestore Connectivity and Config
  const firestoreStart = Date.now();
  try {
    // Attempt a live read from Firestore server to verify configuration
    // This will verify project ID, database ID, and authorization
    await getDocFromServer(doc(db, 'test', 'connection'));
    result.checks.firestore.latencyMs = Date.now() - firestoreStart;
  } catch (err: any) {
    const isPermissionDenied = 
      err.code === 'permission-denied' || 
      (err.message && (
        err.message.includes('permission') || 
        err.message.includes('insufficient') || 
        err.message.includes('denied')
      ));

    if (isPermissionDenied) {
      // Permission-denied is a positive result: it means we reached the active database on the server,
      // and it processed our request. This confirms that the project ID, database ID, and network are valid.
      result.checks.firestore.status = 'ok';
      result.checks.firestore.latencyMs = Date.now() - firestoreStart;
      console.log('[Firebase Health Check] Firestore connectivity verified successfully via security rules handshake (permission-denied is expected for unauthenticated test read).');
    } else {
      result.checks.firestore.status = 'error';
      result.checks.firestore.error = err.message || String(err);
      result.checks.firestore.errorDetails = {
        code: err.code,
        name: err.name,
        stack: err.stack
      };
      result.overallStatus = 'unhealthy';
      
      // Log verbose details for developers as required
      console.error('[Firebase Health Check] Firestore initialization failed:', {
        message: err.message,
        code: err.code,
        project: firebaseConfig.projectId,
        database: firebaseConfig.firestoreDatabaseId,
        fullError: err
      });
    }
  }

  // 5. Audit Storage Initialization
  try {
    if (!storage) {
      throw new Error('Storage instance is null or undefined');
    }
  } catch (err: any) {
    result.checks.storage.status = 'error';
    result.checks.storage.error = err.message;
    if (result.overallStatus === 'healthy') {
      result.overallStatus = 'degraded';
    }
  }

  // Set final computed overall status
  if (result.checks.firestore.status === 'error' || result.checks.firebaseApp.status === 'error') {
    result.overallStatus = 'unhealthy';
  } else if (result.checks.authentication.status === 'error' || result.checks.storage.status === 'error' || result.checks.network.status === 'offline') {
    result.overallStatus = 'degraded';
  }

  notifyHealthListeners(result);

  // LOG BEAUTIFUL REPORT TO DEVELOPER CONSOLE
  const badgeColor = result.overallStatus === 'healthy' ? '#10b981' : result.overallStatus === 'degraded' ? '#f59e0b' : '#ef4444';
  
  console.groupCollapsed(
    `%c🔥 Firebase Security & Integration Health Check: ${result.overallStatus.toUpperCase()}`,
    `color: white; background-color: ${badgeColor}; padding: 3px 6px; border-radius: 3px; font-weight: bold;`
  );
  
  console.log(`Timestamp: ${result.timestamp}`);
  console.log(`Total diagnostic time: ${Date.now() - startTime}ms`);
  
  console.group('Diagnostic Sub-systems');
  
  // Network
  console.log(
    `Network: %c${result.checks.network.status.toUpperCase()}`,
    `color: ${result.checks.network.online ? '#10b981' : '#ef4444'}; font-weight: bold;`
  );
  if (result.checks.network.error) console.error(result.checks.network.error);

  // App Configuration
  console.log(
    `Firebase App Configuration: %c${result.checks.firebaseApp.status.toUpperCase()}`,
    `color: ${result.checks.firebaseApp.status === 'ok' ? '#10b981' : '#ef4444'}; font-weight: bold;`,
    { projectId: result.checks.firebaseApp.projectId, appId: result.checks.firebaseApp.appId }
  );
  if (result.checks.firebaseApp.error) console.error(result.checks.firebaseApp.error);

  // Auth
  console.log(
    `Firebase Auth: %c${result.checks.authentication.status.toUpperCase()}`,
    `color: ${result.checks.authentication.status === 'ok' ? '#10b981' : '#ef4444'}; font-weight: bold;`,
    { currentUser: result.checks.authentication.currentUser }
  );
  if (result.checks.authentication.error) console.error(result.checks.authentication.error);

  // Firestore
  console.log(
    `Firestore Database: %c${result.checks.firestore.status.toUpperCase()}`,
    `color: ${result.checks.firestore.status === 'ok' ? '#10b981' : '#ef4444'}; font-weight: bold;`,
    { 
      databaseId: result.checks.firestore.databaseId, 
      latencyMs: result.checks.firestore.latencyMs,
      configuredProject: firebaseConfig.projectId
    }
  );
  if (result.checks.firestore.error) {
    console.error('%c[CRITICAL FAILURE] Firestore connection could not be established!', 'color: #ef4444; font-weight: bold;');
    console.error('Error message:', result.checks.firestore.error);
    console.error('Diagnostic Help: Check if your Firestore database with ID ' + 
      `"${result.checks.firestore.databaseId}" is active on your Firebase project "${result.checks.firebaseApp.projectId}".`);
    console.error('Raw Exception Stack:', result.checks.firestore.errorDetails);
  }

  // Storage
  console.log(
    `Cloud Storage: %c${result.checks.storage.status.toUpperCase()}`,
    `color: ${result.checks.storage.status === 'ok' ? '#10b981' : '#ef4444'}; font-weight: bold;`,
    { bucket: result.checks.storage.bucket }
  );
  if (result.checks.storage.error) console.error(result.checks.storage.error);

  console.groupEnd();
  console.groupEnd();

  return result;
}

// Expose health check to developer console window
if (typeof window !== 'undefined') {
  (window as any).__runFirebaseHealthCheck = runFirebaseHealthCheck;
}
