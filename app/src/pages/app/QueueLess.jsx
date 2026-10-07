import { useMemo, useState } from 'react';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { createSlots, setSlotStatus, deleteSlot } from '../../services/data';
import { SERVICES, serviceLabel } from '../../config/constants';
import { branches, semesters, branchLabel } from '../../config/branches';
import { displayName } from '../../lib/people';
import { todayISO, fmtISODate, to12h, addMinutes, toMinutes } from '../../lib/format';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Textarea, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, Tabs, useToast } from '../../components/ui/UI';

const tone = { scheduled: 'assigned', done: 'resolved', missed: 'danger' };

function SlotCard({ s, staff, onChange }) {
  const toast = useToast();
  const act = async fn => { try { await fn(); } catch { toast('Could not update.', 'err'); } };
  return (
    <article className={`slot ${s.status}`}>
      <div className="slot-when"><b>{to12h(s.time)}</b>{s.endTime && <small>to {to12h(s.endTime)}</small>}<small>{fmtISODate(s.date)}</small></div>
      <div className="slot-body">
        <div className="slot-top"><b>{serviceLabel(s.service)}</b><Badge tone={tone[s.status]}>{s.status === 'scheduled' ? 'Scheduled' : s.status === 'done' ? 'Completed' : 'Missed'}</Badge></div>
        {staff && <span className="muted">{s.studentName} · {s.regNo} · {branchLabel(s.branch)} Sem {s.semester}</span>}
        <span><Icon name="map" size={15} />{s.location}</span>
        {s.documents?.length > 0 && <span><Icon name="file" size={15} />Bring: {s.documents.join(', ')}</span>}
        {s.note && <span className="muted">{s.note}</span>}
        {staff && <div className="row-btns">
          {s.status !== 'done' && <Button size="sm" variant="outline" onClick={() => act(() => setSlotStatus(s.id, 'done'))}>Completed</Button>}
          {s.status === 'scheduled' && <Button size="sm" variant="outline" onClick={() => act(() => setSlotStatus(s.id, 'missed'))}>Missed</Button>}
          {s.status !== 'scheduled' && <Button size="sm" variant="outline" onClick={() => act(() => setSlotStatus(s.id, 'scheduled'))}>Reschedule</Button>}
          <button className="icon-btn" onClick={() => confirm('Delete this slot?') && act(() => deleteSlot(s.id))} aria-label="Delete slot"><Icon name="trash" size={17} /></button>
        </div>}
      </div>
    </article>);
}

function Assign({ onClose }) {
  const { profile: p, user } = useAuth(); const toast = useToast();
  const students = useLive(() => query(collection(db, 'users'), where('role', '==', 'student'), where('status', '==', 'active')), []).data;
  const [fb, setFb] = useState(p.branches?.[0] || 'all'); const [fs, setFs] = useState('all'); const [q, setQ] = useState('');
  const [picked, setPicked] = useState([]);
  const [f, setF] = useState({ service: 'scholarship', date: todayISO(), from: '10:00', to: '13:00', every: 10, location: '', docs: SERVICES[0].docs.join(', '), note: '' });
  const [busy, setBusy] = useState(false);
  const shown = students.filter(s => (fb === 'all' || s.branch === fb) && (fs === 'all' || s.semester === Number(fs)) && (`${s.name} ${s.regNo}`.toLowerCase().includes(q.toLowerCase()))).sort((a, b) => a.regNo.localeCompare(b.regNo, undefined, { numeric: true }));
  const toggle = uid => setPicked(x => x.includes(uid) ? x.filter(i => i !== uid) : [...x, uid]);
  const chosen = picked.map(id => students.find(s => s.uid === id)).filter(Boolean);
  // Slots are handed out one after another between "From" and "To". Gap is fully custom (minutes per student).
  const gap = Math.floor(Number(f.every));
  const windowMin = toMinutes(f.to) - toMinutes(f.from);
  const gapOk = gap >= 1 && gap <= 240;
  const capacity = gapOk && windowMin > 0 ? Math.floor(windowMin / gap) : 0;
  const problem = windowMin <= 0 ? '“To” time must be after “From” time.' : !gapOk ? 'Gap must be between 1 and 240 minutes.' : chosen.length > capacity ? `Only ${capacity} student${capacity === 1 ? '' : 's'} fit between ${to12h(f.from)} and ${to12h(f.to)} with a ${gap}-minute gap. Select fewer students, widen the time range, or shorten the gap.` : '';
  const submit = async e => {
    e.preventDefault(); if (!chosen.length) return toast('Select at least one student.', 'err');
    if (problem) return toast(problem, 'err');
    setBusy(true);
    try {
      const docs = f.docs.split(',').map(x => x.trim()).filter(Boolean);
      await createSlots(chosen.map((s, i) => ({ studentId: s.uid, studentName: s.name, regNo: s.regNo, branch: s.branch, semester: s.semester, service: f.service, date: f.date, time: addMinutes(f.from, i * gap), endTime: addMinutes(f.from, (i + 1) * gap), location: f.location.trim(), documents: docs, note: f.note.trim() })), { uid: user.uid, name: displayName(p) });
      toast(`${chosen.length} slot${chosen.length > 1 ? 's' : ''} assigned`); onClose();
    } catch (err) { toast(err.message, 'err'); setBusy(false); }
  };
  return (
    <Modal wide title="Assign time slots" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <div className="two"><Select label="Service" value={f.service} onChange={e => setF({ ...f, service: e.target.value, docs: SERVICES.find(s => s.id === e.target.value).docs.join(', ') })}>{SERVICES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</Select>
          <Input label="Location" required placeholder="e.g. Accounts office, Room 12" value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
        <div className="two"><Input label="Date" type="date" min={todayISO()} required value={f.date} onChange={e => setF({ ...f, date: e.target.value })} />
          <Input label="Gap per student (minutes)" type="number" min="1" max="240" step="1" required value={f.every} onChange={e => setF({ ...f, every: e.target.value })} hint="Type any number, or tap a quick value below." /></div>
        <div className="two"><Input label="From" type="time" required value={f.from} onChange={e => setF({ ...f, from: e.target.value })} />
          <Input label="To" type="time" required value={f.to} onChange={e => setF({ ...f, to: e.target.value })} /></div>
        <div className="chips">{[5, 10, 15, 20, 30, 45, 60].map(m => <button type="button" key={m} className={`chip ${gap === m ? 'on' : ''}`} onClick={() => setF({ ...f, every: m })}>{m} min</button>)}</div>
        <Textarea label="Documents to bring" rows={2} value={f.docs} onChange={e => setF({ ...f, docs: e.target.value })} hint="Separate with commas." />
        <Input label="Note for students (optional)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <fieldset className="picker"><legend>Students <small>({chosen.length} selected)</small></legend>
          <div className="filters tight"><Select label="Branch" value={fb} onChange={e => setFb(e.target.value)}><option value="all">All</option>{branches.map(b => <option key={b.id} value={b.id}>{b.short}</option>)}</Select>
            <Select label="Semester" value={fs} onChange={e => setFs(e.target.value)}><option value="all">All</option>{semesters.map(s => <option key={s} value={s}>{s}</option>)}</Select>
            <Input label="Search" value={q} onChange={e => setQ(e.target.value)} placeholder="Name or reg. no." /></div>
          <div className="picker-actions"><button type="button" className="link-btn" onClick={() => setPicked([...new Set([...picked, ...shown.map(s => s.uid)])])}>Select all shown</button><button type="button" className="link-btn" onClick={() => setPicked([])}>Clear</button></div>
          <ul className="picker-list">{shown.map(s => <li key={s.uid}><label className="check"><input type="checkbox" checked={picked.includes(s.uid)} onChange={() => toggle(s.uid)} /><span>{s.name}<small>{s.regNo} · {branchLabel(s.branch)} Sem {s.semester}</small></span></label></li>)}
            {!shown.length && <li className="muted pad">No approved students match.</li>}</ul>
        </fieldset>
        {windowMin > 0 && gapOk && <small className="muted">{to12h(f.from)} – {to12h(f.to)} fits up to {capacity} student{capacity === 1 ? '' : 's'}{chosen.length > 0 && !problem ? `. Your ${chosen.length} slot${chosen.length === 1 ? '' : 's'} run${chosen.length === 1 ? 's' : ''} ${to12h(f.from)} – ${to12h(addMinutes(f.from, chosen.length * gap))}.` : '.'}</small>}
        {problem && chosen.length > 0 && <div className="note danger" role="alert"><Icon name="alert" size={18} /><span>{problem}</span></div>}
        <Button type="submit" loading={busy} disabled={!!problem && chosen.length > 0}>Assign {chosen.length || ''} slot{chosen.length === 1 ? '' : 's'}</Button>
      </form>
    </Modal>);
}

export default function QueueLess() {
  const { profile: p, user } = useAuth();
  const staff = p.role !== 'student';
  const { data, loading, error } = useLive(() => staff ? query(collection(db, 'slots'), orderBy('date', 'desc'), limit(300)) : query(collection(db, 'slots'), where('studentId', '==', user.uid)), [staff]);
  const [tab, setTab] = useState('upcoming'); const [open, setOpen] = useState(false);
  const t = todayISO();
  const sorted = useMemo(() => [...data].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)), [data]);
  const list = sorted.filter(s => tab === 'upcoming' ? (s.date >= t && s.status === 'scheduled') : tab === 'today' ? s.date === t : s.date < t || s.status !== 'scheduled');
  return (<>
    <PageHeader title="QueueLess" subtitle={staff ? 'Give each student an exact time for scholarship, certificate and verification work.' : 'Your assigned times for scholarship, certificates and verification.'} actions={staff && <Button icon="plus" onClick={() => setOpen(true)}>Assign slots</Button>} />
    <Tabs value={tab} onChange={setTab} options={[{ id: 'upcoming', label: 'Upcoming' }, ...(staff ? [{ id: 'today', label: 'Today' }] : []), { id: 'past', label: 'Past' }]} />
    <ErrorNote error={error} />
    {loading ? <Loading /> : !list.length ? <Empty icon="ticket" title={staff ? 'No slots here' : 'No slot assigned'} action={staff && tab === 'upcoming' && <Button onClick={() => setOpen(true)}>Assign slots</Button>}>{staff ? 'Assign times so students do not wait in queues.' : 'When the college office assigns you a time, the date, time, place and documents show here.'}</Empty>
      : <div className="slot-list">{list.map(s => <SlotCard key={s.id} s={s} staff={staff} />)}</div>}
    {open && <Assign onClose={() => setOpen(false)} />}
  </>);
}
