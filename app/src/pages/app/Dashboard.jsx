import { Link } from 'react-router-dom';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { noticesQ, complaintsQ, resourcesQ, noticeForStudent, routineRef, confidentialQ } from '../../services/data';
import { repeatedIssues } from '../../lib/similarity';
import { describeReporter } from '../../lib/reporter';
import { timeAgo, todayISO, fmtISODate, to12h } from '../../lib/format';
import { branchLabel } from '../../config/branches';
import { useGreeting } from '../../hooks/useGreeting';
import { displayName } from '../../lib/people';
import { CATEGORIES, categoryLabel, DAYS, serviceLabel, typeLabel } from '../../config/constants';
import Icon from '../../components/ui/Icon';
import { PageHeader, StatusTrail, StatusBadge, Empty, Badge } from '../../components/ui/UI';
import { onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';


function Stat({ label, value, tone, sub, to }) {
  const body = <><span className="stat-label">{label}</span><b className="stat-value">{value}</b>{sub && <small>{sub}</small>}</>;
  return to ? <Link to={to} className={`stat ${tone || ''}`}>{body}</Link> : <div className={`stat ${tone || ''}`}>{body}</div>;
}
function NoticeRow({ n }) {
  return <li><Icon name={n.pinned ? 'pin' : 'bell'} size={16} /><div><b>{n.title}</b><small>{displayName({ name: n.authorName, role: n.authorRole })} · {timeAgo(n.createdAt)}{n.target !== 'all' ? ` · ${branchLabel(n.branch)}${n.target === 'semester' ? ` Sem ${n.semester}` : ''}` : ''}</small></div></li>;
}
function Section({ title, link, children }) {
  return <section className="card"><div className="card-head"><h2>{title}</h2>{link && <Link to={link[0]}>{link[1]}</Link>}</div>{children}</section>;
}
function Bars({ rows }) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return <ul className="bars">{rows.map(r => <li key={r.label}><span>{r.label}</span><div><i style={{ width: `${(r.value / max) * 100}%` }} /></div><b>{r.value}</b></li>)}</ul>;
}
// routine for today's student
function useTodayRoutine(p) {
  const [entries, setEntries] = useState([]);
  useEffect(() => {
    if (p.role !== 'student') return;
    return onSnapshot(routineRef(p.branch, p.semester), s => setEntries(s.exists() ? s.data().entries || [] : []), () => {});
  }, [p.role, p.branch, p.semester]);
  const day = DAYS[(new Date().getDay() + 6) % 7];
  return { day, list: entries.filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start)) };
}

export default function Dashboard() {
  const { profile: p, user } = useAuth();
  const greeting = useGreeting();
  const notices = useLive(noticesQ, []).data;
  const complaints = useLive(complaintsQ, []).data;
  const resources = useLive(resourcesQ, []).data;
  const mySlots = useLive(() => (p.role === 'student' ? query(collection(db, 'slots'), where('studentId', '==', user.uid)) : null), [p.role]).data;
  const pendingFaculty = useLive(() => (p.role === 'principal' ? query(collection(db, 'users'), where('role', '==', 'faculty'), where('status', '==', 'pending')) : null), [p.role]).data;
  const pendingStudents = useLive(() => (p.role === 'faculty' && p.branches?.length ? query(collection(db, 'users'), where('role', '==', 'student'), where('branch', '==', p.branches[0]), where('status', '==', 'pending')) : null), [p.role]).data;
  const openConfidential = useLive(() => (p.role === 'principal' ? confidentialQ() : null), [p.role]).data.filter(c => c.status !== 'resolved');
  const today = useTodayRoutine(p);

  const open = complaints.filter(c => c.status !== 'resolved');
  const counts = { total: complaints.length, pending: complaints.filter(c => c.status === 'pending').length, assigned: complaints.filter(c => c.status === 'assigned').length, progress: complaints.filter(c => c.status === 'in_progress').length, resolved: complaints.filter(c => c.status === 'resolved').length };
  const pct = counts.total ? Math.round((counts.resolved / counts.total) * 100) : 0;
  const free = resources.filter(r => r.status === 'available' || (r.releaseAt && r.releaseAt < Date.now())).length;

  if (p.role === 'student') {
    const mine = complaints.filter(c => c.ownerId === user.uid && c.status !== 'resolved');
    const rel = notices.filter(n => noticeForStudent(n, p)).slice(0, 4);
    const nextSlot = mySlots.filter(s => s.status === 'scheduled' && s.date >= todayISO()).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))[0];
    return (<>
      <PageHeader title={`${greeting}, ${p.name}`} subtitle={`${branchLabel(p.branch)}, Semester ${p.semester}`} />
      <div className="grid-2">
        <Section title="Notices for you" link={['/app/notices', 'All notices']}>
          {rel.length ? <ul className="list">{rel.map(n => <NoticeRow key={n.id} n={n} />)}</ul> : <Empty icon="bell" title="No notices yet">New notices for your branch and semester appear here.</Empty>}
        </Section>
        <Section title={`Today, ${today.day}`} link={['/app/routine', 'Full routine']}>
          {today.list.length ? <ul className="list">{today.list.map((e, i) => <li key={i}><Icon name="clock" size={16} /><div><b>{e.subject}</b><small>{to12h(e.start)}–{to12h(e.end)}{e.room ? ` · ${e.room}` : ''}{e.teacher ? ` · ${e.teacher}` : ''}</small></div></li>)}</ul> : <Empty icon="calendar" title="No classes listed for today">Your routine has not been uploaded, or today is free.</Empty>}
        </Section>
        <Section title="Your open complaints" link={['/app/complaints', 'निवारण']}>
          {mine.length ? <div className="stack">{mine.slice(0, 3).map(c => <div key={c.id} className="mini-complaint"><b>{c.title}</b><StatusTrail status={c.status} compact /></div>)}</div> : <Empty icon="wrench" title="Nothing pending">Report a broken PC, projector or tap and track it here.</Empty>}
        </Section>
        <Section title="Your QueueLess slot" link={['/app/queueless', 'My slots']}>
          {nextSlot ? <div className="slot-hero"><b>{serviceLabel(nextSlot.service)}</b><span>{fmtISODate(nextSlot.date)} at {to12h(nextSlot.time)}</span><small>{nextSlot.location}</small></div> : <Empty icon="ticket" title="No slot assigned">When the office assigns you a time, it shows here.</Empty>}
        </Section>
      </div>
      <Section title="Rooms and labs right now" link={['/app/resources', 'Live resources']}>
        <p className="muted">{free} of {resources.length} are free.</p>
      </Section>
    </>);
  }

  const repeated = repeatedIssues(complaints);
  const byCat = CATEGORIES.map(c => ({ label: c.label, value: complaints.filter(x => x.category === c.id).length })).filter(r => r.value);
  const mineAssigned = complaints.filter(c => c.assignedTo === user.uid && c.status !== 'resolved');

  return (<>
    <PageHeader title={p.role === 'principal' ? 'Campus overview' : `${greeting}, ${p.name}`} subtitle={p.role === 'principal' ? 'Live status of complaints, rooms, notices and services.' : 'What needs attention on campus today.'} />
    <div className="stats">
      <Stat label="Total complaints" value={counts.total} to="/app/complaints" />
      <Stat label="Pending" value={counts.pending} tone="pending" to="/app/complaints" />
      <Stat label="In progress" value={counts.assigned + counts.progress} tone="progress" sub={`${counts.assigned} assigned`} to="/app/complaints" />
      <Stat label="Resolved" value={`${pct}%`} tone="resolved" sub={`${counts.resolved} of ${counts.total}`} to="/app/complaints" />
    </div>
    <div className="grid-2">
      {p.role === 'principal' && <Section title="Confidential complaints" link={['/app/confidential', 'Open']}>
        {openConfidential.length ? <ul className="list">{openConfidential.slice(0, 4).map(c => <li key={c.id}><Icon name="lock" size={16} /><div><b>{c.title}</b><small>{describeReporter(c.reporter)} · {timeAgo(c.createdAt)}</small></div><Badge tone={c.status === 'pending' ? 'pending' : 'progress'}>{c.status === 'pending' ? 'New' : 'In review'}</Badge></li>)}</ul> : <Empty icon="lock" title="Nothing confidential open">Private complaints are visible only to you.</Empty>}
      </Section>}
      {p.role === 'principal' && <Section title="Waiting for your approval" link={['/app/approvals', 'Review']}>
        {pendingFaculty.length ? <ul className="list">{pendingFaculty.slice(0, 4).map(f => <li key={f.uid}><Icon name="shield" size={16} /><div><b>{f.name}</b><small>{f.email}</small></div></li>)}</ul> : <Empty icon="shield" title="No faculty requests">New faculty and admin requests appear here.</Empty>}
      </Section>}
      {p.role === 'faculty' && <Section title="Assigned to you" link={['/app/complaints', 'Open complaints']}>
        {mineAssigned.length ? <ul className="list">{mineAssigned.slice(0, 4).map(c => <li key={c.id}><Icon name="wrench" size={16} /><div><b>{c.title}</b><small>{c.resourceName || c.location || categoryLabel(c.category)}</small></div><StatusBadge status={c.status} /></li>)}</ul> : <Empty icon="check" title="Nothing assigned">Complaints assigned to you appear here.</Empty>}
        {p.branches?.length > 0 && <p className="muted">{pendingStudents.length} student{pendingStudents.length === 1 ? '' : 's'} waiting for approval in {branchLabel(p.branches[0])}.</p>}
      </Section>}
      <Section title="Complaints by category">{byCat.length ? <Bars rows={byCat} /> : <Empty icon="chart" title="No data yet">Category data appears with the first complaint.</Empty>}</Section>
      <Section title="Repeated issues" link={['/app/complaints', 'See all']}>
        {repeated.length ? <ul className="list">{repeated.slice(0, 4).map(g => <li key={g.place + g.category}><Icon name="alert" size={16} /><div><b>{g.place}</b><small>{categoryLabel(g.category)}</small></div><Badge tone="progress">{g.items.length} open</Badge></li>)}</ul> : <Empty icon="check" title="No repeated issues">Places with several open complaints are flagged here.</Empty>}
      </Section>
      <Section title="Rooms and labs" link={['/app/resources', 'Manage']}>
        {resources.length ? <><p className="muted">{free} free, {resources.length - free} occupied of {resources.length}.</p><ul className="list">{resources.filter(r => r.status === 'occupied').slice(0, 4).map(r => <li key={r.id}><Icon name="door" size={16} /><div><b>{r.name}</b><small>{typeLabel(r.type)} · {r.facultyName || 'In use'}</small></div></li>)}</ul></> : <Empty icon="door" title="No resources yet">{p.role === 'principal' ? 'Add classrooms, labs and halls under Live resources.' : 'The Principal adds campus resources.'}</Empty>}
      </Section>
      <Section title="Latest notices" link={['/app/notices', 'All notices']}>
        {notices.length ? <ul className="list">{notices.slice(0, 4).map(n => <NoticeRow key={n.id} n={n} />)}</ul> : <Empty icon="bell" title="No notices posted" />}
      </Section>
    </div>
  </>);
}
