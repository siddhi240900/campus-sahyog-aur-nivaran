// Pure helpers for the notification centre: which feature a notification belongs to, what counts as unread,
// and where "already seen" is remembered on this device. Nothing here talks to Firebase.

// A notification belongs to one group; the group decides its icon, the page it opens and its menu badge.
export const NOTIFICATION_GROUPS = {
  notices: { label: 'Notices', path: '/app/notices', icon: 'bell' },
  chat: { label: 'College chat', path: '/app/chat', icon: 'chat' },
  papers: { label: 'PaperPulse', path: '/app/paperpulse', icon: 'chart' },
  complaints: { label: 'निवारण', path: '/app/complaints', icon: 'wrench' },
  slots: { label: 'QueueLess', path: '/app/queueless', icon: 'ticket' },
  routine: { label: 'Routine', path: '/app/routine', icon: 'calendar' },
  approvals: { label: 'People & approvals', path: '/app/approvals', icon: 'shield' },
  confidential: { label: 'गोपनीय शिकायत', path: '/app/confidential', icon: 'lock' },
};

export const clip = (text = '', max = 90) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

// ---- "seen" memory (per person, per device) ------------------------------------------------------------------
// seen = { since, [key]: time }. Notifications older than `since` (the first time this person used the app on this
// device) are never shown as new, so nobody gets flooded with old items on day one.
const storeKey = uid => `campus.notifications.seen.${uid}`;

export function loadSeen(uid) {
  try {
    const saved = JSON.parse(localStorage.getItem(storeKey(uid)));
    if (saved && typeof saved.since === 'number') return saved;
  } catch { /* storage blocked or damaged: start fresh */ }
  return { since: Date.now() };
}

export function saveSeen(uid, seen) {
  try { localStorage.setItem(storeKey(uid), JSON.stringify(seen)); } catch { /* private mode: fine, just not remembered */ }
}

export const seenAt = (seen, key) => Math.max(seen.since, seen[key] || 0);
export const isUnread = (item, seen) => item.at > seenAt(seen, item.key);

// Returns a copy of `seen` where every key in `keys` is read up to now (or up to the newest item, if the
// device clock runs behind the server).
export function markKeysSeen(seen, keys, items) {
  const next = { ...seen };
  keys.forEach(key => {
    const newest = items.filter(i => i.key === key).reduce((max, i) => Math.max(max, i.at), 0);
    next[key] = Math.max(Date.now(), newest);
  });
  return next;
}

// { notices: 2, chat: 5, ... } counting only unread items.
export function unreadByGroup(items, seen) {
  return items.reduce((counts, item) => (isUnread(item, seen) ? { ...counts, [item.group]: (counts[item.group] || 0) + 1 } : counts), {});
}
