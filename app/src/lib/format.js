export const tsMs = ts => (ts?.toMillis ? ts.toMillis() : typeof ts === 'number' ? ts : 0);
export const fmtDate = ts => { const m = tsMs(ts); return m ? new Date(m).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
export const fmtDateTime = ts => { const m = tsMs(ts); return m ? new Date(m).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : ''; };
export const fmtTime = ts => { const m = tsMs(ts); return m ? new Date(m).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : ''; };
export function timeAgo(ts) {
  const m = tsMs(ts); if (!m) return 'just now';
  const s = Math.max(1, Math.round((Date.now() - m) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return fmtDate(m);
}
export const pad = n => String(n).padStart(2, '0');
export const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
export const fmtISODate = iso => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) : '');
export const to12h = hhmm => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}:${pad(m)} ${h >= 12 ? 'PM' : 'AM'}`; };
export const toMinutes = hhmm => { const [h, m] = (hhmm || '0:0').split(':').map(Number); return h * 60 + m; };
export const addMinutes = (hhmm, mins) => { const [h, m] = hhmm.split(':').map(Number); const t = h * 60 + m + mins; return `${pad(Math.floor(t / 60) % 24)}:${pad(t % 60)}`; };
// Registration numbers become Firestore document ids, so "/" and spaces are not allowed.
export const normalizeRegNo = v => v.trim().toUpperCase().replace(/[\s/\\]+/g, '-').replace(/[^A-Z0-9-]/g, '');

// "Good morning" (5:00-11:59), "Good afternoon" (12:00-16:59), "Good evening" (17:00-20:59), otherwise "Good night".
export function greetingForHour(hour) {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Good night';
}
