import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDo5M0cemeLGlSWb9x1QwiV4mMB6KkJ3eM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "porkos-ac37d.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "porkos-ac37d",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "porkos-ac37d.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "712516903139",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:712516903139:web:a178b4e88fc6e01139e5d6",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-3MNJRBEJBY"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios de Firebase con persistencia local IndexedDB para modo offline
export const auth = getAuth(app);

let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch {
  // Fallback seguro si ya fue inicializado o en entornos sin IndexedDB
  firestoreInstance = getFirestore(app);
}

export const db = firestoreInstance;
export const storage = getStorage(app);

// Inicializar Analytics condicionalmente (solo en navegadores compatibles)
export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, firebaseConfig };
export default app;
