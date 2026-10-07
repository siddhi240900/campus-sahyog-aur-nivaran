import { db } from '../firebase';
import { doc, getDoc, writeBatch, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

export const userRef = uid => doc(db, 'users', uid);
export const getProfile = async uid => { const s = await getDoc(userRef(uid)); return s.exists() ? s.data() : null; };

// Student: profile + registration-number reservation are written together (all-or-nothing).
export async function createProfile(user, data) {
  const batch = writeBatch(db);
  batch.set(userRef(user.uid), { uid: user.uid, ...data, createdAt: serverTimestamp() });
  if (data.role === 'student') batch.set(doc(db, 'regNumbers', data.regNo), { uid: user.uid });
  await batch.commit();
}
// The single Principal profile is created automatically on first login (rules only allow the Principal UID).
export const createPrincipalProfile = user => setDoc(userRef(user.uid), { uid: user.uid, name: user.displayName || 'Principal', email: user.email, role: 'principal', status: 'active', createdAt: serverTimestamp() });
export const reviewUser = (uid, status, reviewer, extra = {}) => updateDoc(userRef(uid), { status, reviewedBy: reviewer, reviewedAt: serverTimestamp(), ...extra });
export const setFacultyBranches = (uid, branches) => updateDoc(userRef(uid), { branches });
export const updateOwnProfile = (uid, data) => updateDoc(userRef(uid), data);
