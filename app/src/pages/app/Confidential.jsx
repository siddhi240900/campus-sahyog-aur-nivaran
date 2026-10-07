import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { confidentialQ, myConfidentialQ, confidentialRef, submitConfidential, updateConfidential, deleteConfidential } from '../../services/data';
import { CONF_CATEGORIES, CONF_STATUSES, confCategoryLabel, confStatusLabel } from '../../config/constants';
import { fmtDateTime, timeAgo } from '../../lib/format';
import { describeReporter } from '../../lib/reporter';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Textarea, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, Tabs, StatusTrail, useToast } from '../../components/ui/UI';

const tone = { pending: 'pending', in_progress: 'progress', resolved: 'resolved' };
const blank = { title: '', description: '', category: 'harassment' };

const Trail = ({ status }) => <StatusTrail status={status} steps={CONF_STATUSES} compact />;

function PrivacyNote({ principal }) {
  return (
    <div className="note conf-note">
      <Icon name="lock" size={18} />
      <span>{principal
        ? <><b>Only you can see this section.</b> Each complaint shows who filed it (name, registration number or designation, branch) so you can identify and resolve it. No other faculty, student or page can see it.</>
        : <><b>Only the Principal can see this.</b> Your name and details are shared with the Principal alone so the matter can be resolved. It never appears in निवारण, in chat, or to any other student or faculty.</>}</span>
    </div>);
}

// ---- Principal: one complaint ----
function PrincipalDetail({ c, onClose }) {
  const { profile: p } = useAuth(); const toast = useToast();
  const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const move = async status => {
    setBusy(true);
    try { await updateConfidential(c.id, { status }, { status, by: 'Principal', note: note.trim() }); toast(`Marked ${confStatusLabel(status).toLowerCase()}`); setNote(''); }
    catch (e) { toast(e.code === 'permission-denied' ? 'Only the Principal can update this.' : e.message, 'err'); } finally { setBusy(false); }
  };
  const reply = async () => {
    if (!note.trim()) return toast('Write a message first.', 'err');
    setBusy(true);
    try { await updateConfidential(c.id, { status: c.status }, { status: c.status, by: 'Principal', note: note.trim() }); toast('Reply sent'); setNote(''); }
    catch (e) { toast(e.message, 'err'); } finally { setBusy(false); }
  };
  const del = async () => { if (confirm('Delete this confidential complaint permanently?')) { try { await deleteConfidential(c.id); onClose(); } catch (e) { toast(e.message, 'err'); } } };
  return (
    <Modal wide title={c.title} onClose={onClose}>
      <div className="stack">
        <Trail status={c.status} />
        <p className="c-desc">{c.description}</p>
        <div className="meta-grid"><span><b>Type</b>{confCategoryLabel(c.category)}</span><span><b>Received</b>{fmtDateTime(c.createdAt)}</span><span className="wide-cell"><b>Reported by</b>{describeReporter(c.reporter)}</span><span><b>Handled by</b>{p.name} (Principal)</span></div>
        <div><h3 className="h-sm">Conversation</h3>
          <ol className="history">{[...(c.history || [])].reverse().map((h, i) => <li key={i}><b>{h.by === 'Principal' ? 'You' : 'Reporter'} · {confStatusLabel(h.status)}</b><span>{fmtDateTime(h.at)}</span>{h.note && <p>{h.note}</p>}</li>)}</ol></div>
        <div className="admin-box">
          <h3 className="h-sm">Update this complaint</h3>
          <Textarea label="Message to the reporter (optional)" rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. I am looking into this. Please share the time or place if you can." />
          <div className="row-btns">
            <Button variant="outline" disabled={busy} onClick={reply}>Send reply</Button>
            {c.status === 'pending' && <Button variant="outline" disabled={busy} onClick={() => move('in_progress')}>Start review</Button>}
            {c.status !== 'resolved' && <Button disabled={busy} onClick={() => move('resolved')}>Mark resolved</Button>}
            {c.status === 'resolved' && <Button variant="outline" disabled={busy} onClick={() => move('in_progress')}>Reopen</Button>}
          </div>
        </div>
        <Button variant="danger" size="sm" onClick={del}>Delete complaint</Button>
      </div>
    </Modal>);
}

// ---- Reporter: one of my complaints (follow-up allowed) ----
function MineDetail({ c, onClose }) {
  const toast = useToast(); const [msg, setMsg] = useState(''); const [busy, setBusy] = useState(false);
  const send = async e => {
    e.preventDefault(); if (!msg.trim()) return; setBusy(true);
    try { await updateConfidential(c.id, {}, { status: c.status, by: 'Reporter', note: msg.trim() }); setMsg(''); toast('Message sent to the Principal'); }
    catch (x) { toast(x.message, 'err'); } finally { setBusy(false); }
  };
  return (
    <Modal wide title={c.title} onClose={onClose}>
      <div className="stack">
        <Trail status={c.status} />
        <p className="c-desc">{c.description}</p>
        <div className="meta-grid"><span><b>Type</b>{confCategoryLabel(c.category)}</span><span><b>Sent</b>{fmtDateTime(c.createdAt)}</span></div>
        <div><h3 className="h-sm">Conversation</h3>
          <ol className="history">{[...(c.history || [])].reverse().map((h, i) => <li key={i}><b>{h.by === 'Principal' ? 'Principal' : 'You'} · {confStatusLabel(h.status)}</b><span>{fmtDateTime(h.at)}</span>{h.note && <p>{h.note}</p>}</li>)}</ol></div>
        {c.status !== 'resolved' && <form onSubmit={send} className="stack-tight">
          <Textarea label="Add more details or reply" rows={3} maxLength={1000} value={msg} onChange={e => setMsg(e.target.value)} />
          <Button type="submit" variant="outline" loading={busy}>Send</Button>
        </form>}
      </div>
    </Modal>);
}

// A reporter's list entry loads its own complaint document live.
function MineCard({ id, onOpen }) {
  const { data: c, loading, error } = useLive(() => confidentialRef(id), [id], { single: true });
  if (loading) return <div className="c-card"><small className="muted">Loading…</small></div>;
  if (error || !c) return null;
  return (
    <button className="c-card conf-card" onClick={() => onOpen(c)}>
      <div className="c-top"><b>{c.title}</b><Badge tone={tone[c.status]}>{confStatusLabel(c.status)}</Badge></div>
      <small className="muted">{confCategoryLabel(c.category)} · {timeAgo(c.createdAt)}</small>
      <Trail status={c.status} />
    </button>);
}

function NewConfidential({ onClose }) {
  const { user, profile } = useAuth(); const toast = useToast();
  const [f, setF] = useState(blank); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { await submitConfidential({ title: f.title.trim(), description: f.description.trim(), category: f.category }, profile, user); toast('Sent privately to the Principal'); onClose(); }
    catch (x) { setErr(x.code === 'permission-denied' ? 'The database refused this. Publish the latest firestore.rules, then try again.' : x.message); setBusy(false); }
  };
  return (
    <Modal wide title="Confidential complaint" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <PrivacyNote />
        <Select label="What is this about?" value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CONF_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
        <Input label="Short title" required maxLength={150} placeholder="e.g. Being troubled by someone repeatedly" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <Textarea label="What happened?" required rows={6} maxLength={3000} hint="Say what, when and where. Your own details are added automatically for the Principal." value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        <ErrorNote error={err} />
        <Button type="submit" loading={busy}>Send to the Principal</Button>
      </form>
    </Modal>);
}

function PrincipalView() {
  const { data, loading, error } = useLive(confidentialQ, []);
  const [tab, setTab] = useState('open'); const [sel, setSel] = useState(null);
  const count = s => data.filter(c => c.status === s).length;
  const list = data.filter(c => tab === 'all' || (tab === 'open' ? c.status !== 'resolved' : c.status === 'resolved'));
  const selected = data.find(c => c.id === sel) || null;
  return (<>
    <PageHeader title={<><span className="hi">गोपनीय शिकायत</span> · Confidential</>} subtitle="Private complaints, visible only to the Principal. Each one shows who filed it." />
    <PrivacyNote principal />
    <Tabs value={tab} onChange={setTab} options={[{ id: 'open', label: 'Open', count: data.length - count('resolved') }, { id: 'resolved', label: 'Resolved', count: count('resolved') }, { id: 'all', label: 'All' }]} />
    <ErrorNote error={error} />
    {loading ? <Loading /> : !list.length ? <Empty icon="lock" title="No confidential complaints">New private complaints appear here instantly.</Empty>
      : <div className="c-list">{list.map(c => (
        <button key={c.id} className="c-card conf-card" onClick={() => setSel(c.id)}>
          <div className="c-top"><b>{c.title}</b><Badge tone={tone[c.status]}>{confStatusLabel(c.status)}</Badge></div>
          <small className="muted">{confCategoryLabel(c.category)} · {timeAgo(c.createdAt)}</small>
          <small className="reporter-line"><Icon name="users" size={14} /> {describeReporter(c.reporter)}</small>
          <Trail status={c.status} />
        </button>))}</div>}
    {selected && <PrincipalDetail c={selected} onClose={() => setSel(null)} />}
  </>);
}

function ReporterView() {
  const { user } = useAuth();
  const { data, loading, error } = useLive(() => myConfidentialQ(user.uid), [user.uid]);
  const [newOpen, setNewOpen] = useState(false); const [sel, setSel] = useState(null);
  const ids = [...data].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).map(d => d.id);
  return (<>
    <PageHeader title={<><span className="hi">गोपनीय शिकायत</span> · Confidential</>} subtitle="Report a problem privately. Only the Principal can read it." actions={<Button icon="lock" onClick={() => setNewOpen(true)}>New confidential complaint</Button>} />
    <PrivacyNote />
    <h2 className="h-sm sec-title">Your confidential complaints</h2>
    <ErrorNote error={error} />
    {loading ? <Loading /> : !ids.length ? <Empty icon="lock" title="Nothing sent yet" action={<Button onClick={() => setNewOpen(true)}>Report privately</Button>}>If someone is troubling you and you cannot say it openly, tell the Principal here.</Empty>
      : <div className="c-list">{ids.map(id => <MineCard key={id} id={id} onOpen={setSel} />)}</div>}
    {sel && <MineDetailLive id={sel.id} onClose={() => setSel(null)} />}
    {newOpen && <NewConfidential onClose={() => setNewOpen(false)} />}
  </>);
}

// Keeps the open dialog live, so a Principal reply shows without reopening.
function MineDetailLive({ id, onClose }) {
  const { data: c } = useLive(() => confidentialRef(id), [id], { single: true });
  return c ? <MineDetail c={c} onClose={onClose} /> : null;
}

export default function Confidential() {
  const { profile } = useAuth();
  return profile.role === 'principal' ? <PrincipalView /> : <ReporterView />;
}
