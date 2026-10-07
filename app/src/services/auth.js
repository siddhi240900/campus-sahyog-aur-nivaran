import { auth } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, deleteUser, signOut as fbSignOut } from 'firebase/auth';

export const signOut = () => fbSignOut(auth);
export const registerAuth = (email, password) => createUserWithEmailAndPassword(auth, email, password);
export const loginAuth = (email, password) => signInWithEmailAndPassword(auth, email, password);
export const sendVerification = () => sendEmailVerification(auth.currentUser);
export const resetPassword = email => sendPasswordResetEmail(auth, email);
export const removeCurrentUser = async () => { if (auth.currentUser) await deleteUser(auth.currentUser); };

export const authMessage = e => ({
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/wrong-password': 'Incorrect email or password.',
  'auth/invalid-email': 'This email address is not valid.',
  'auth/user-not-found': 'No account exists with this email.',
  'auth/user-disabled': 'This account has been disabled. Contact the college office.',
  'auth/email-already-in-use': 'An account already uses this email. Log in instead, or reset your password.',
  'auth/weak-password': 'Password is too weak. Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your internet connection.',
  'permission-denied': 'The database refused this request. Make sure the latest firestore.rules are published.',
}[e?.code] || e?.message || 'Something went wrong. Please try again.');
