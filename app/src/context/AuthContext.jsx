import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { onAuthStateChanged, reload } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth, firebaseConfigError } from '../firebase';
import { userRef, createPrincipalProfile } from '../services/users';
import { PRINCIPAL_UID } from '../config/constants';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

// Where should this person land after signing in?
export function homePath({ user, profile, emailVerified }) {
  if (!user || !profile) return '/login';
  if (profile.role === 'principal') return '/app';
  if (!emailVerified) return '/verify-email';
  return profile.status === 'active' ? '/app' : '/status';
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [ready, setReady] = useState(false);              // first auth + profile result received
  const [profileMissing, setProfileMissing] = useState(false);
  const [error, setError] = useState(firebaseConfigError);
  const [verified, setVerified] = useState(false);
  const [registering, setRegistering] = useState(false);  // true while Register is creating account + profile
  const regRef = useRef(false);
  const [retryKey, setRetryKey] = useState(0);

  const retry = useCallback(() => { setError(null); setReady(false); setRetryKey(k => k + 1); }, []);

  // Register wraps its work in this so half-created accounts never show "profile not found".
  const runRegistration = useCallback(async fn => {
    regRef.current = true; setRegistering(true);
    try { return await fn(); } finally { regRef.current = false; setRegistering(false); }
  }, []);

  // Pulls the latest emailVerified flag and a fresh ID token (rules check email_verified).
  const refreshUser = useCallback(async () => {
    if (!auth?.currentUser) return false;
    await reload(auth.currentUser);
    await auth.currentUser.getIdToken(true);
    setVerified(auth.currentUser.emailVerified);
    return auth.currentUser.emailVerified;
  }, []);

  useEffect(() => {
    if (!auth) { setReady(true); return; }
    let stopProfile = null;
    const stopAuth = onAuthStateChanged(auth, u => {
      stopProfile?.(); stopProfile = null;
      setUser(u); setVerified(!!u?.emailVerified); setProfileMissing(false);
      if (!u) { setProfile(null); setReady(true); return; }
      stopProfile = onSnapshot(userRef(u.uid), snap => {
        if (snap.exists()) { setProfile(snap.data()); setProfileMissing(false); setError(null); setReady(true); return; }
        setProfile(null);
        if (regRef.current) return;                       // profile is about to be written
        if (u.uid === PRINCIPAL_UID) {                    // first Principal login: create the profile
          createPrincipalProfile(u).catch(e => { setError(`Could not create the Principal profile: ${e.code || e.message}`); setReady(true); });
          return;
        }
        setProfileMissing(true); setReady(true);
      }, err => {
        setProfile(null); setReady(true);
        setError(err.code === 'permission-denied'
          ? 'The database refused access. Publish the latest firestore.rules in Firebase Console, then retry.'
          : `Could not load your account: ${err.message}`);
      });
    }, err => { setError(`Sign-in could not start: ${err.message}`); setReady(true); });
    return () => { stopProfile?.(); stopAuth(); };
  }, [retryKey]);

  return (
    <Ctx.Provider value={{ user, profile, emailVerified: verified, ready, profileMissing, error, retry, registering, runRegistration, refreshUser }}>
      {children}
    </Ctx.Provider>
  );
}
