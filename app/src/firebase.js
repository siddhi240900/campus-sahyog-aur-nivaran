import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY, authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID, storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const envName = { apiKey: 'API_KEY', authDomain: 'AUTH_DOMAIN', projectId: 'PROJECT_ID', storageBucket: 'STORAGE_BUCKET', messagingSenderId: 'MESSAGING_SENDER_ID', appId: 'APP_ID' };
const missing = Object.keys(envName).filter(k => !config[k]);
export const firebaseConfigError = missing.length ? `Firebase is not configured. Missing in .env: ${missing.map(k => `VITE_FIREBASE_${envName[k]}`).join(', ')}` : null;
const app = firebaseConfigError ? null : initializeApp(config);
// Session persistence: the login lasts only while the browser tab/window is open.
// Closing the app and opening it again always asks for email + password.
function makeAuth() {
  try { return initializeAuth(app, { persistence: browserSessionPersistence }); }
  catch { return getAuth(app); }          // already initialised (Vite hot reload)
}
export const auth = app ? makeAuth() : null;
export const db = app ? getFirestore(app) : null;
