import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/UI';
import { feedsFor } from '../services/notifications';
import { NOTIFICATION_GROUPS, isUnread, loadSeen, saveSeen, markKeysSeen, unreadByGroup } from '../lib/notifications';

const Ctx = createContext(null);
export const useNotifications = () => useContext(Ctx);

const MAX_POPUPS = 2;                                  // more than this arriving together is summarised in one popup
const alertsSupported = typeof window !== 'undefined' && 'Notification' in window;

// Watches the person's feeds (notices, chat, papers, complaints, slots, ...) and keeps the unread state.
// Alerts: a popup inside the app, or a system notification when the tab is in the background and the person allowed it.
// Nothing here can break the app: a feed that fails (for example missing permission) is simply skipped.
export function NotificationProvider({ children }) {
  const { profile, user } = useAuth();
  const toast = useToast(); const navigate = useNavigate(); const { pathname } = useLocation();
  const [feedItems, setFeedItems] = useState({});                  // feed id -> its items
  const [seen, setSeen] = useState(() => loadSeen(user.uid));
  const [permission, setPermission] = useState(alertsSupported ? Notification.permission : 'unsupported');
  const known = useRef({});                                        // feed id -> ids already known (only new ones alert)
  const viewedChat = useRef(null);                                 // chat channel currently on screen
  const baseTitle = useRef(document.title);

  const items = useMemo(() => Object.values(feedItems).flat().sort((a, b) => b.at - a.at), [feedItems]);
  const unread = useMemo(() => unreadByGroup(items, seen), [items, seen]);
  const total = Object.values(unread).reduce((n, c) => n + c, 0);
  const latest = useRef({}); latest.current = { items, seen, pathname, permission, navigate };   // read inside callbacks without re-subscribing

  const markSeen = useCallback(keys => {
    const next = markKeysSeen(latest.current.seen, [].concat(keys), latest.current.items);
    latest.current.seen = next; saveSeen(user.uid, next); setSeen(next);
  }, [user.uid]);
  const markAllSeen = useCallback(() => markSeen([...new Set(latest.current.items.map(i => i.key))]), [markSeen]);
  const viewingChat = useCallback(channel => { viewedChat.current = channel; }, []);

  const alertNew = useCallback(fresh => {
    const { seen: seenNow, pathname: here, permission: allowed, navigate: go } = latest.current;
    const onScreen = i => (i.group === 'chat' ? here === NOTIFICATION_GROUPS.chat.path && i.key === `chat:${viewedChat.current}` : here === i.path);
    const shown = fresh.filter(i => isUnread(i, seenNow) && !onScreen(i));
    if (!shown.length) return;
    const visible = document.visibilityState === 'visible';
    shown.slice(0, MAX_POPUPS).forEach(i => {
      if (visible) toast(`${i.title}: ${i.body}`);
      else if (allowed === 'granted') {
        const popup = new Notification(i.title, { body: i.body, tag: i.id, icon: '/assets/campus-mark.png' });
        popup.onclick = () => { window.focus(); go(i.path); popup.close(); };
      }
    });
    if (shown.length > MAX_POPUPS && visible) toast(`${shown.length - MAX_POPUPS} more new notifications`);
  }, [toast]);

  const branchesKey = (profile.branches || []).join(',');
  useEffect(() => {
    known.current = {}; setFeedItems({});
    const stops = feedsFor({ ...profile, uid: user.uid }).map(feed => onSnapshot(feed.ref, snap => {
      let next; try { next = feed.toItems(snap); } catch (err) { console.warn('[Notifications]', feed.id, err.message); return; }
      const before = known.current[feed.id]; known.current[feed.id] = new Set(next.map(i => i.id));
      setFeedItems(prev => ({ ...prev, [feed.id]: next }));
      if (before) alertNew(next.filter(i => !before.has(i.id)));      // the first load is never an alert
    }, err => console.warn('[Notifications]', feed.id, err.code)));
    return () => stops.forEach(stop => stop());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, profile.role, profile.branch, profile.semester, branchesKey, alertNew]);

  // Opening a feature page reads its notifications (chat is handled by the chat page, channel by channel).
  useEffect(() => {
    const keys = Object.entries(NOTIFICATION_GROUPS)
      .filter(([group, g]) => group !== 'chat' && (pathname === g.path || pathname.startsWith(`${g.path}/`)))
      .map(([group]) => group).filter(group => unread[group]);
    if (keys.length) markSeen(keys);
  }, [pathname, unread, markSeen]);

  useEffect(() => { document.title = total ? `(${total > 99 ? '99+' : total}) ${baseTitle.current}` : baseTitle.current; }, [total]);

  const enableAlerts = useCallback(async () => {
    if (alertsSupported) setPermission(await Notification.requestPermission());
  }, []);

  const value = useMemo(() => ({ items, unread, total, permission, markSeen, markAllSeen, viewingChat, enableAlerts, seen }),
    [items, unread, total, permission, markSeen, markAllSeen, viewingChat, enableAlerts, seen]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
