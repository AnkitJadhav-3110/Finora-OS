import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

let app;
let auth;
let db;
let storage;

try {
  // Initialize Firebase App
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  
  // Initialize Auth
  auth = getAuth(app);
  
  // Initialize Firestore with databaseId and longPolling for sandbox proxy compatibility
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  try {
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, databaseId);
  } catch (_initErr) {
    // If already initialized, retrieve existing instance
    db = getFirestore(app, databaseId);
  }
  
  // Initialize Storage
  storage = getStorage(app);
  
} catch (error) {
  console.error('[Firebase Init Error] Critical failure during Firebase initialization:', error);
  // Fallbacks to avoid crashing imports in other files
  app = getApps().length > 0 ? getApp() : initializeApp({
    apiKey: "placeholder",
    authDomain: "placeholder",
    projectId: "placeholder",
    appId: "placeholder"
  });
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
}

export { app, auth, db, storage };
