import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDrDuLkSAsCtAFdCgVXB2KznsinGsfG6h4",
  authDomain: "delusionv1-42676.firebaseapp.com",
  projectId: "delusionv1-42676",
  storageBucket: "delusionv1-42676.firebasestorage.app",
  messagingSenderId: "216387555181",
  appId: "1:216387555181:web:b1447e7a2935b3d85d1464",
  measurementId: "G-EHDF7GKYZY"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics if supported
isSupported().then(yes => {
  if (yes) {
    try {
      getAnalytics(app);
    } catch (err) {
      console.warn("Analytics initialization skipped or failed:", err);
    }
  }
});

export const auth = getAuth(app);

// Enforce browserLocalPersistence for perfect multi-browser compatibility (Safari, Brave, Chrome)
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn("Could not explicitly set browser persistence in Firebase Auth:", err);
});

export const db = initializeFirestore(app, { experimentalForceLongPolling: true });

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  // If the error is about missing permissions and we're logged out, ignore it to avoid console noise/crashes
  const isPermissionError = error instanceof Error && error.message.includes('permission');
  if (isPermissionError && !auth.currentUser) {
    console.warn('Firestore Permission Denied (Logged Out):', path);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // No longer throwing to prevent UI crashes. The error is logged and can be handled by the caller if needed.
}

// Connection test as required by instructions
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firestore connection check successful.");
  } catch (error) {
    console.info("Firestore connection check info:", error);
  }
}
testConnection();
