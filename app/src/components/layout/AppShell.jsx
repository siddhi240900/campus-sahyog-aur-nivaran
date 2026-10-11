import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import Icon from '../ui/Icon';
import { useAuth } from '../../context/AuthContext';
import { signOut } from '../../services/auth';
import { branchLabel } from '../../config/branches';
import { displayName } from '../../lib/people';
import RulesNotice, { rulesPending, clearRulesPending } from './RulesNotice';
import NotificationBell, { countLabel } from './NotificationBell';
import { NotificationProvider, useNotifications } from '../../context/NotificationContext';
import { NOTIFICATION_GROUPS } from '../../lib/notifications';

const NAV = [
  { to: '/app', end: true, label: 'Dashboard', icon: 'home' },
  { to: '/app/notices', label: 'Notices', icon: 'bell' },
  { to: '/app/routine', label: 'Routine', icon: 'calendar' },
  { to: '/app/resources', label: 'Live resources', icon: 'door' },
  { to: '/app/chat', label: 'College chat', icon: 'chat' },
  { to: '/app/complaints', label: 'निवारण', icon: 'wrench' },
  { to: '/app/queueless', label: 'QueueLess', icon: 'ticket' },
  { to: '/app/paperpulse', label: 'PaperPulse', icon: 'chart' },
  { to: '/app/confidential', label: 'गोपनीय शिकायत', icon: 'lock' },
];
const roleName = { student: 'Student', faculty: 'Faculty / Admin', principal: 'Principal' };

const groupOfPath = Object.fromEntries(Object.entries(NOTIFICATION_GROUPS).map(([group, g]) => [g.path, group]));

// Notifications are provided around the whole signed-in layout so every page and the menu can use them.
export function AppShell() {
  return <NotificationProvider><Layout /></NotificationProvider>;
}

function Layout() {
  const { profile } = useAuth();
  const { unread } = useNotifications();
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const [rules, setRules] = useState(() => profile.role === 'student' && rulesPending());   // strict-rule notice after each student login
  const closeRules = () => { clearRulesPending(); setRules(false); };
  useEffect(() => setOpen(false), [loc.pathname]);
  const items = [...NAV];
  if (profile.role === 'faculty' || profile.role === 'principal') items.push({ to: '/app/approvals', label: 'People & approvals', icon: 'shield' });

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
        <img src="/assets/campus-mark.png" alt="" /><b>CAMPUS</b>
        <NotificationBell className="bell-top" />
      </header>
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`side ${open ? 'open' : ''}`}>
        <div className="side-top">
          <img className="side-logo" src="/assets/campus-mark.png" alt="" />
          <div><b>CAMPUS</b><span className="hi">सहयोग और निवारण</span></div>
          <NotificationBell className="bell-side" />
          <button className="icon-btn close" onClick={() => setOpen(false)} aria-label="Close menu"><Icon name="close" /></button>
        </div>
        <nav aria-label="Main">
          {items.map(i => <NavLink key={i.to} to={i.to} end={i.end} className="nav-link"><Icon name={i.icon} size={19} /><span className={/[\u0900-\u097F]/.test(i.label) ? 'hi' : ''}>{i.label}</span>{unread[groupOfPath[i.to]] > 0 && <span className="nav-badge" aria-label={`${unread[groupOfPath[i.to]]} new`}>{countLabel(unread[groupOfPath[i.to]])}</span>}</NavLink>)}
        </nav>
        <div className="side-user">
          <div className="avatar">{profile.name?.[0]?.toUpperCase()}</div>
          <div className="who"><b>{displayName(profile)}</b><small>{roleName[profile.role]}{profile.role === 'student' ? ` · ${branchLabel(profile.branch)} Sem ${profile.semester}` : ''}</small></div>
          <button className="icon-btn" onClick={() => signOut()} aria-label="Log out" title="Log out"><Icon name="logout" size={18} /></button>
        </div>
      </aside>
      <main className="content"><Outlet /></main>
      {rules && <RulesNotice onClose={closeRules} />}
    </div>
  );
}
