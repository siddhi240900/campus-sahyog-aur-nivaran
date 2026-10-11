import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useNotifications } from '../../context/NotificationContext';
import { NOTIFICATION_GROUPS, isUnread } from '../../lib/notifications';
import { timeAgo } from '../../lib/format';

const PANEL_SIZE = 25;

export const countLabel = n => (n > 99 ? '99+' : String(n));

// Bell with an unread badge. Opens a panel with the latest notifications; tapping one opens that feature.
export default function NotificationBell({ className = '' }) {
  const { items, seen, total, permission, markAllSeen, enableAlerts } = useNotifications();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate(); const box = useRef();

  useEffect(() => {
    if (!open) return;
    const away = e => { if (!box.current?.contains(e.target)) setOpen(false); };
    const esc = e => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', away); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', away); document.removeEventListener('keydown', esc); };
  }, [open]);

  const go = item => { setOpen(false); navigate(item.path); };
  return (
    <div className={`bell ${className}`} ref={box}>
      <button className="icon-btn" onClick={() => setOpen(o => !o)} aria-label={total ? `Notifications, ${total} unread` : 'Notifications'} aria-expanded={open}>
        <Icon name="bell" size={21} />{total > 0 && <span className="bell-count">{countLabel(total)}</span>}
      </button>
      {open && (
        <section className="notif-panel" aria-label="Notifications">
          <header><b>Notifications</b>{total > 0 && <button className="link-btn" onClick={markAllSeen}>Mark all as read</button>}</header>
          {permission === 'default' && <div className="notif-enable"><span>Get alerts even when this tab is in the background.</span><button className="btn sm primary" onClick={enableAlerts}>Turn on</button></div>}
          {permission === 'denied' && <p className="notif-note">Alerts are blocked in your browser settings. You will still see them here.</p>}
          {!items.length ? <p className="notif-empty">You are all caught up.</p> : (
            <ul>{items.slice(0, PANEL_SIZE).map(i => (
              <li key={i.id}><button className={isUnread(i, seen) ? 'unread' : ''} onClick={() => go(i)}>
                <Icon name={NOTIFICATION_GROUPS[i.group].icon} size={18} />
                <span><b>{i.title}</b><small>{i.body}</small><small>{timeAgo(i.at)}</small></span>
              </button></li>))}
            </ul>)}
        </section>)}
    </div>);
}
