import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  Auth
} from 'firebase/auth';

import {
  getFirestore,
  doc,
  getDocFromServer,
  Firestore
} from 'firebase/firestore';

// ✅ IMPORT DIRECTLY FROM FILE
import firebaseConfig from '../firebase-applet-config.json';

let app: FirebaseApp;
export let auth: Auth;
export let db: Firestore;

export const googleProvider = new GoogleAuthProvider();

// 🚀 INIT FUNCTION
export async function initFirebase() {
  if (app) return { auth, db };

  try {
    // 🔥 Validate config (prevents "simulated" issue)
    if (!firebaseConfig || !firebaseConfig.apiKey) {
      console.error("Firebase Config:", firebaseConfig);
      throw new Error("Firebase config missing or invalid");
    }

    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');

    // Optional test
    testConnection();

    return { auth, db };

  } catch (error) {
    console.error("Firebase Init Error:", error);
    throw error;
  }
}

// 🔥 ERROR HANDLER
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
) {
  if (!auth) throw error;

  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
    },
  };

  console.error("Firestore Error:", errInfo);
  throw new Error(JSON.stringify(errInfo));
}

// 🔍 CONNECTION TEST
async function testConnection() {
  if (!db) return;

  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    console.warn("Firestore connection test skipped");
  }
}

// EXPORTS
export { signInWithPopup, signOut, onAuthStateChanged };
export type { FirebaseUser };
