import { db } from '../firebase';
import { collection, doc, addDoc, setDoc, getDoc, updateDoc, deleteDoc, writeBatch, query, where, orderBy, limit, serverTimestamp, arrayUnion } from 'firebase/firestore';

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
export const setSlotStatus = (id, status) => updateDoc(doc(db, 'slots', id), { status, updatedAt: serverTimestamp() });   // updatedAt lets the student be notified of the change
export const deleteSlot = id => deleteDoc(doc(db, 'slots', id));

// ---- chat ----
// A message may carry one photo or PDF. Like PaperPulse files, it is cut into pieces (a Firestore document is limited
// to 1 MB) stored in chats/{channel}/files/{fileId}_{part}. The message itself is written LAST, so nobody sees a
// message whose file is still being saved. Photos also carry a tiny `thumb` shown inside the bubble.
const CHAT_FILE_CHUNK = 800000;
export const sendMessage = async (channel, text, p, uid, file = null) => {
  const messages = collection(db, 'chats', channel, 'messages');
  const base = { text: text.trim(), uid, name: p.name, role: p.role, createdAt: serverTimestamp() };
  if (!file) return addDoc(messages, base);
  const fileId = doc(messages).id; const parts = Math.ceil(file.data.length / CHAT_FILE_CHUNK); const written = [];
  try {
    for (let i = 0; i < parts; i++) {
      const piece = doc(db, 'chats', channel, 'files', `${fileId}_${i}`);
      await setDoc(piece, { data: file.data.slice(i * CHAT_FILE_CHUNK, (i + 1) * CHAT_FILE_CHUNK) }); written.push(piece);
    }
    const attachment = { kind: file.kind, name: file.name, size: file.size, fileId, parts, ...(file.thumb ? { thumb: file.thumb } : {}) };
    return await addDoc(messages, { ...base, attachment });
  } catch (err) { await Promise.allSettled(written.map(d => deleteDoc(d))); throw err; }
};
// Returns the shared file as a data: URL, joined back from its pieces.
export const loadChatFile = async (channel, attachment) => {
  const pieces = await Promise.all(Array.from({ length: attachment.parts }, (_, i) => getDoc(doc(db, 'chats', channel, 'files', `${attachment.fileId}_${i}`))));
  if (pieces.some(d => !d.exists())) throw new Error('This file is no longer available.');
  return pieces.map(d => d.data().data).join('');
};
export const deleteMessage = async (channel, id, attachment = null) => {
  await deleteDoc(doc(db, 'chats', channel, 'messages', id));
  if (attachment) await Promise.allSettled(Array.from({ length: attachment.parts }, (_, i) => deleteDoc(doc(db, 'chats', channel, 'files', `${attachment.fileId}_${i}`))));
};

// ---- PaperPulse ----
// A paper can carry attached files (PDF / photos). Firestore documents are limited to 1 MB, so each file is cut into
// pieces stored in papers/{id}/files/{fileIndex}_{part}. The paper document is written LAST, so nobody ever sees a paper
// whose files are still being saved.
const FILE_CHUNK = 800000;
export const savePaper = async (data, by, files = []) => {
  const ref = doc(collection(db, 'papers')); const meta = []; const written = [];
  try {
    for (let i = 0; i < files.length; i++) {
      const { name, type, data: url } = files[i]; const parts = Math.ceil(url.length / FILE_CHUNK);
      for (let p = 0; p < parts; p++) { const piece = doc(db, 'papers', ref.id, 'files', `${i}_${p}`); await setDoc(piece, { data: url.slice(p * FILE_CHUNK, (p + 1) * FILE_CHUNK) }); written.push(piece); }
      meta.push({ name, type, parts });
    }
    await setDoc(ref, { ...data, ...(meta.length ? { files: meta } : {}), uploadedBy: by.name, uploadedByUid: by.uid, createdAt: serverTimestamp() });
  } catch (err) { await Promise.allSettled(written.map(d => deleteDoc(d))); throw err; }
  return ref.id;
};
// Returns the file as a data: URL, joined back from its pieces.
export const loadPaperFile = async (paperId, file, index) => {
  const pieces = await Promise.all(Array.from({ length: file.parts }, (_, p) => getDoc(doc(db, 'papers', paperId, 'files', `${index}_${p}`))));
  if (pieces.some(d => !d.exists())) throw new Error('This file is incomplete.');
  return pieces.map(d => d.data().data).join('');
};
export const deletePaper = async (id, files = []) => {
  await deleteDoc(doc(db, 'papers', id));
  await Promise.allSettled(files.flatMap((f, i) => Array.from({ length: f.parts }, (_, p) => deleteDoc(doc(db, 'papers', id, 'files', `${i}_${p}`)))));
};

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
