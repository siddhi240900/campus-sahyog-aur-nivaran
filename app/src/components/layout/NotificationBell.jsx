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
          <header className="notif-head">
            <h2>Notifications{total > 0 && <span className="notif-pill">{total} new</span>}</h2>
            {total > 0 && <button className="notif-link" onClick={markAllSeen}>Mark all as read</button>}
          </header>
          {permission === 'default' && <div className="notif-enable"><Icon name="bell" size={18} /><span>Get alerts even when this tab is in the background.</span><button className="btn sm primary" onClick={enableAlerts}>Turn on</button></div>}
          {permission === 'denied' && <p className="notif-note">Alerts are blocked in your browser settings. You will still see them here.</p>}
          {!items.length ? (
            <div className="notif-empty"><Icon name="bell" size={30} /><p>You are all caught up</p><small>New notices, messages and updates will show up here.</small></div>
          ) : (
            <ul className="notif-list">{items.slice(0, PANEL_SIZE).map(i => {
              const fresh = isUnread(i, seen);
              return (
                <li key={i.id}><button className={`notif-row ${fresh ? 'unread' : ''}`} onClick={() => go(i)}>
                  <span className="notif-ico"><Icon name={NOTIFICATION_GROUPS[i.group].icon} size={18} /></span>
                  <span className="notif-text"><strong>{i.title}</strong><span className="notif-body">{i.body}</span></span>
                  <span className="notif-time">{timeAgo(i.at)}</span>
                  {fresh && <span className="notif-dot" aria-label="Unread" />}
                </button></li>);
            })}</ul>)}
        </section>)}
    </div>);
}
