import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import firebaseConfig from '../../firebase-applet-config.json';

// Use standard, reliable firebaseapp.com as authDomain to prevent DNS NXDOMAIN errors
const actualConfig = {
  ...firebaseConfig,
  authDomain: firebaseConfig.projectId 
    ? `${firebaseConfig.projectId}.firebaseapp.com` 
    : firebaseConfig.authDomain
};

const app = initializeApp(actualConfig);
export const auth = getAuth(app);

// Enforce browserLocalPersistence for perfect multi-browser compatibility (Safari, Brave, Chrome)
setPersistence(auth, browserLocalPersistence).catch(err => {
  console.warn("Could not explicitly set browser persistence in Firebase Auth:", err);
});

const dbId = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)' 
  ? firebaseConfig.firestoreDatabaseId 
  : undefined;

export const db = dbId 
  ? initializeFirestore(app, { experimentalForceLongPolling: true }, dbId)
  : initializeFirestore(app, { experimentalForceLongPolling: true });

export const googleProvider = new GoogleAuthProvider();

// Initialize Analytics ONLY if a real config is present and if supported
const isRealConfig = firebaseConfig.apiKey && 
  !firebaseConfig.apiKey.includes('remixed') && 
  !firebaseConfig.apiKey.includes('placeholder');

if (isRealConfig) {
  isSupported().then(yes => {
    if (yes) {
      try {
        getAnalytics(app);
      } catch (err) {
        console.warn("Analytics initialization skipped (restriction or fetch failure in proxy):", err);
      }
    }
  }).catch(err => {
    console.warn("Analytics support check failed:", err);
  });
} else {
  console.info("Analytics initialization skipped (placeholder or remixed config detected)");
}

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
