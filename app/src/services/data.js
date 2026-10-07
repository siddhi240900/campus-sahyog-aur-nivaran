import { db } from '../firebase';
import { collection, doc, addDoc, setDoc, updateDoc, deleteDoc, writeBatch, query, where, orderBy, limit, serverTimestamp, arrayUnion } from 'firebase/firestore';

// ---- query builders (used with useLive) ----
export const noticesQ = () => query(collection(db, 'notices'), orderBy('createdAt', 'desc'), limit(100));
export const resourcesQ = () => collection(db, 'resources');
export const complaintsQ = () => query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(300));
export const routineRef = (branch, sem) => doc(db, 'routines', `${branch}_${sem}`);
export const messagesQ = channel => query(collection(db, 'chats', channel, 'messages'), orderBy('createdAt', 'desc'), limit(80));
export const papersQ = () => query(collection(db, 'papers'), orderBy('createdAt', 'desc'), limit(200));
export const photoRef = id => doc(db, 'complaintPhotos', id);

// ---- notices ----
export const saveNotice = (id, data) => id ? updateDoc(doc(db, 'notices', id), { ...data, updatedAt: serverTimestamp() }) : addDoc(collection(db, 'notices'), { ...data, createdAt: serverTimestamp() });
export const deleteNotice = id => deleteDoc(doc(db, 'notices', id));
// Does this notice concern this student?
export const noticeForStudent = (n, p) => n.target === 'all' || (n.target === 'branch' && n.branch === p.branch) || (n.target === 'semester' && n.branch === p.branch && Number(n.semester) === Number(p.semester));

// ---- routine ----
export const saveRoutine = (branch, sem, entries, by) => setDoc(routineRef(branch, sem), { branch, semester: sem, entries, updatedBy: by.name, updatedByUid: by.uid, updatedAt: serverTimestamp() });

// ---- resources ----
export const createResource = data => addDoc(collection(db, 'resources'), { ...data, status: 'available', facultyName: '', purpose: '', releaseAt: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const updateResource = (id, data, uid) => updateDoc(doc(db, 'resources', id), { ...data, updatedAt: serverTimestamp(), updatedBy: uid });
export const deleteResource = id => deleteDoc(doc(db, 'resources', id));

// ---- complaints ----
export async function submitComplaint(data, photo, user) {
  const ref = doc(collection(db, 'complaints'));
  const batch = writeBatch(db);
  batch.set(ref, { ...data, hasPhoto: !!photo, ownerId: user.uid, status: 'pending', assignedTo: null, assignedToName: '', history: [{ status: 'pending', by: user.name, at: Date.now(), note: 'Complaint reported' }], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  if (photo) batch.set(photoRef(ref.id), { ownerId: user.uid, data: photo });
  await batch.commit();
  return ref.id;
}
export const updateComplaint = (id, patch, entry) => updateDoc(doc(db, 'complaints', id), { ...patch, history: arrayUnion({ ...entry, at: Date.now() }), updatedAt: serverTimestamp() });
export const deleteComplaint = async id => { await deleteDoc(doc(db, 'complaints', id)); await deleteDoc(photoRef(id)).catch(() => {}); };

// ---- QueueLess ----
export async function createSlots(slots, by) {
  const batch = writeBatch(db);
  slots.forEach(s => batch.set(doc(collection(db, 'slots')), { ...s, status: 'scheduled', createdBy: by.uid, createdByName: by.name, createdAt: serverTimestamp() }));
  await batch.commit();
}
export const setSlotStatus = (id, status) => updateDoc(doc(db, 'slots', id), { status });
export const deleteSlot = id => deleteDoc(doc(db, 'slots', id));

// ---- chat ----
export const sendMessage = (channel, text, p, uid) => addDoc(collection(db, 'chats', channel, 'messages'), { text: text.trim(), uid, name: p.name, role: p.role, createdAt: serverTimestamp() });
export const deleteMessage = (channel, id) => deleteDoc(doc(db, 'chats', channel, 'messages', id));

// ---- PaperPulse ----
export const savePaper = (data, by) => addDoc(collection(db, 'papers'), { ...data, uploadedBy: by.name, uploadedByUid: by.uid, createdAt: serverTimestamp() });
export const deletePaper = id => deleteDoc(doc(db, 'papers', id));

// ---- routine image (one photo per branch + semester) ----
export const routineImageRef = (branch, sem) => doc(db, 'routineImages', `${branch}_${sem}`);
export const saveRoutineImage = (branch, sem, data, by) => setDoc(routineImageRef(branch, sem), { branch, semester: sem, data, updatedBy: by.name, updatedByUid: by.uid, updatedAt: serverTimestamp() });
export const deleteRoutineImage = (branch, sem) => deleteDoc(routineImageRef(branch, sem));

// ---- confidential complaints ----
// Stored with the reporter's identity so the Principal (and only the Principal) can identify and resolve the case.
export const confidentialQ = () => query(collection(db, 'confidential'), orderBy('createdAt', 'desc'), limit(200));
export const myConfidentialQ = uid => query(collection(db, 'confidential'), where('ownerId', '==', uid));
export const confidentialRef = id => doc(db, 'confidential', id);

// Only fields that identify the person; empty values are dropped (Firestore rejects undefined).
export const reporterSnapshot = profile => Object.fromEntries(Object.entries({
  name: profile.name, role: profile.role, regNo: profile.regNo, branch: profile.branch, semester: profile.semester,
  designations: profile.designations, branches: profile.branches,
}).filter(([, value]) => value !== undefined && value !== null && value !== ''));

export const submitConfidential = ({ title, description, category }, profile, user) => addDoc(collection(db, 'confidential'), {
  ownerId: user.uid, reporter: reporterSnapshot(profile), title, description, category, status: 'pending',
  history: [{ status: 'pending', by: 'Reporter', at: Date.now(), note: 'Complaint received' }],
  createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
});
export const updateConfidential = (id, patch, entry) => updateDoc(confidentialRef(id), { ...patch, history: arrayUnion({ ...entry, at: Date.now() }), updatedAt: serverTimestamp() });
export const deleteConfidential = id => deleteDoc(confidentialRef(id));
