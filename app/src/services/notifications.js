// What each person is notified about. Every feed is a small, limited Firestore query plus a mapper that turns
// documents into notification items { id, group, key, title, body, at, path, fromUid }.
// Feeds only READ data that the person can already see in the matching page, so Firestore rules are unchanged.
import { collection, doc, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { noticeForStudent } from './data';
import { channelId, branchLabel } from '../config/branches';
import { statusLabel, serviceLabel, confStatusLabel } from '../config/constants';
import { displayName } from '../lib/people';
import { tsMs, fmtISODate, to12h } from '../lib/format';
import { NOTIFICATION_GROUPS, clip } from '../lib/notifications';

const FEED_SIZE = 10;                                   // newest documents watched per feed (keeps reads low)
const at = data => tsMs(data.createdAt) || Date.now();  // a just-written document may not have its server time yet

const item = (group, fields) => ({ group, key: group, path: NOTIFICATION_GROUPS[group].path, fromUid: null, ...fields });

export const attachmentSummary = attachment => (attachment?.kind === 'image' ? 'Photo' : attachment ? `PDF: ${attachment.name}` : '');

// ---- mappers: one document -> one item (or null when it is not for this person) ----------------------------
const fromNotice = (id, n, me) => {
  if (n.authorId === me.uid || (me.role === 'student' && !noticeForStudent(n, me))) return null;
  return item('notices', { id: `notice:${id}`, title: 'New notice', body: clip(n.title), at: at(n), fromUid: n.authorId });
};

const fromMessage = (channel, id, m, me) => {
  if (m.uid === me.uid) return null;
  const body = m.text ? clip(m.text) : attachmentSummary(m.attachment);
  return item('chat', { id: `chat:${channel}:${id}`, key: `chat:${channel}`, title: `${displayName(m)} in chat`, body, at: at(m), fromUid: m.uid });
};

const fromPaper = (id, x, me) => {
  if (x.uploadedByUid === me.uid || (me.role === 'student' && x.branch !== me.branch)) return null;
  return item('papers', { id: `paper:${id}`, title: 'New previous-year paper', body: `${x.subject} · ${x.year} · ${branchLabel(x.branch)} Sem ${x.semester}`, at: at(x), fromUid: x.uploadedByUid });
};

// Students hear about updates to their own complaints; staff hear about new complaints from others.
const fromComplaint = (id, c, me) => {
  const last = c.history?.[c.history.length - 1];
  const updated = tsMs(c.updatedAt) || Date.now();
  if (me.role === 'student') {
    if (c.ownerId !== me.uid || !last || c.history.length < 2) return null;
    return item('complaints', { id: `complaint:${id}:${updated}`, title: `Your complaint is now ${statusLabel(c.status).toLowerCase()}`, body: clip(c.title), at: updated });
  }
  if (c.ownerId === me.uid || c.history?.length !== 1) return null;
  return item('complaints', { id: `complaint:${id}`, title: 'New complaint reported', body: clip(c.title), at: at(c), fromUid: c.ownerId });
};

// Details of confidential complaints are never put in a notification.
const fromConfidential = (id, c, me) => {
  const last = c.history?.[c.history.length - 1]; const updated = tsMs(c.updatedAt) || Date.now();
  if (me.role === 'principal') {
    if (!last || last.by === 'Principal') return null;
    return item('confidential', { id: `confidential:${id}:${updated}`, title: c.history.length === 1 ? 'New confidential complaint' : 'New message on a confidential complaint', body: 'Open गोपनीय शिकायत to read it.', at: updated });
  }
  if (c.ownerId !== me.uid || !last || last.by !== 'Principal') return null;
  return item('confidential', { id: `confidential:${id}:${updated}`, title: 'The Principal replied to your complaint', body: confStatusLabel(c.status), at: updated });
};

// Students: a time slot assigned to them, or changed by staff.
const fromSlot = (id, s) => {
  const changedAt = tsMs(s.updatedAt); const updated = changedAt || at(s);
  const title = !changedAt ? 'New QueueLess slot' : s.status === 'done' ? 'Your slot is completed' : s.status === 'missed' ? 'Your slot was marked missed' : 'Your slot was rescheduled';
  return item('slots', { id: `slot:${id}:${updated}`, title, body: `${serviceLabel(s.service)} · ${fmtISODate(s.date)}, ${to12h(s.time)} · ${s.location}`, at: updated });
};

// Students: their own routine (table or photo) changed.
const fromRoutine = (kind, snap, me) => {
  if (!snap.exists()) return null;
  const r = snap.data(); const updated = tsMs(r.updatedAt);
  if (!updated || r.updatedByUid === me.uid) return null;
  return item('routine', { id: `routine:${kind}:${updated}`, key: 'routine', title: 'Your routine was updated', body: `${branchLabel(me.branch)} · Semester ${me.semester}`, at: updated, fromUid: r.updatedByUid });
};

// People waiting for a decision: students for faculty, faculty for the Principal.
const fromPendingUser = (docs, me) => {
  const waiting = docs.filter(d => d.data().status === 'pending');
  if (!waiting.length) return [];
  const newest = Math.max(...waiting.map(d => tsMs(d.data().createdAt)));
  const noun = me.role === 'principal' ? 'faculty' : 'student';
  return [item('approvals', { id: `approvals:${noun}:${waiting.length}:${newest}`, title: `${waiting.length} ${noun}${waiting.length > 1 ? 's' : ''} waiting for approval`, body: 'Open People & approvals to review.', at: newest || Date.now() })];
};

// ---- feeds -------------------------------------------------------------------------------------------------
const docsOf = (snap, make) => snap.docs.map(d => make(d.id, d.data({ serverTimestamps: 'estimate' }))).filter(Boolean);
const recent = (name, field) => query(collection(db, name), orderBy(field, 'desc'), limit(FEED_SIZE));

// Chat channels this person can read: global, their class channels, or (staff) their branches' all-semester channel.
export function chatChannels(me) {
  if (me.role === 'student') return ['global', channelId(me.branch, 'all'), channelId(me.branch, me.semester)];
  return ['global', ...(me.branches || []).map(b => channelId(b, 'all'))];
}

// me = the signed-in profile plus uid. Returns [{ id, ref, toItems(snapshot) }].
export function feedsFor(me) {
  const feeds = [
    { id: 'notices', ref: recent('notices', 'createdAt'), toItems: s => docsOf(s, (id, d) => fromNotice(id, d, me)) },
    { id: 'papers', ref: recent('papers', 'createdAt'), toItems: s => docsOf(s, (id, d) => fromPaper(id, d, me)) },
    { id: 'complaints', ref: recent('complaints', 'updatedAt'), toItems: s => docsOf(s, (id, d) => fromComplaint(id, d, me)) },
    ...chatChannels(me).map(channel => ({
      id: `chat:${channel}`, ref: query(collection(db, 'chats', channel, 'messages'), orderBy('createdAt', 'desc'), limit(FEED_SIZE)),
      toItems: s => docsOf(s, (id, d) => fromMessage(channel, id, d, me)),
    })),
  ];
  if (me.role === 'student') {
    feeds.push(
      { id: 'slots', ref: query(collection(db, 'slots'), where('studentId', '==', me.uid)), toItems: s => docsOf(s, fromSlot) },
      { id: 'routine-table', ref: doc(db, 'routines', channelId(me.branch, me.semester)), toItems: s => [fromRoutine('table', s, me)].filter(Boolean) },
      { id: 'routine-image', ref: doc(db, 'routineImages', channelId(me.branch, me.semester)), toItems: s => [fromRoutine('image', s, me)].filter(Boolean) },
    );
  } else {
    // Faculty only see students of their own branches (a rules requirement); Principal reviews faculty.
    const reviewQueries = me.role === 'principal'
      ? [query(collection(db, 'users'), where('role', '==', 'faculty'), where('status', '==', 'pending'))]
      : (me.branches?.length ? me.branches : [null]).map(b => (b
        ? query(collection(db, 'users'), where('role', '==', 'student'), where('branch', '==', b), where('status', '==', 'pending'))
        : query(collection(db, 'users'), where('role', '==', 'student'), where('status', '==', 'pending'))));
    reviewQueries.forEach((ref, i) => feeds.push({ id: `approvals-${i}`, ref, toItems: s => fromPendingUser(s.docs, me) }));
  }
  if (me.role === 'principal') feeds.push({ id: 'confidential', ref: recent('confidential', 'updatedAt'), toItems: s => docsOf(s, (id, d) => fromConfidential(id, d, me)) });
  else feeds.push({ id: 'confidential', ref: query(collection(db, 'confidential'), where('ownerId', '==', me.uid)), toItems: s => docsOf(s, (id, d) => fromConfidential(id, d, me)) });
  return feeds;
}
