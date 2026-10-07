import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { complaintsQ, resourcesQ, submitComplaint, updateComplaint, deleteComplaint, photoRef } from '../../services/data';
import { classifyComplaint } from '../../lib/classifier';
import { aiClassify } from '../../lib/ai';
import { findSimilar, repeatedIssues } from '../../lib/similarity';
import { compressImage } from '../../lib/image';
import { CATEGORIES, categoryLabel, COMPLAINT_STATUSES, statusLabel } from '../../config/constants';
import { fmtDateTime, timeAgo } from '../../lib/format';
import { getProfile } from '../../services/users';
import { designationText } from '../../config/designations';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Textarea, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, StatusTrail, Tabs, useToast } from '../../components/ui/UI';

const blank = { title: '', description: '', category: 'other', resourceId: '', location: '' };

// Newer complaints store the reporter's registration number. For older ones, staff look it up once from the student's profile.
const regCache = new Map();
function useRegNo(c, staff) {
  const [reg, setReg] = useState(c.ownerRegNo || regCache.get(c.ownerId) || '');
  useEffect(() => {
    if (reg || !staff || !c.ownerId) return;
    let live = true;
    getProfile(c.ownerId).then(u => { const r = u?.regNo || ''; regCache.set(c.ownerId, r); if (live) setReg(r); }).catch(() => {});
    return () => { live = false; };
  }, [c.ownerId, reg, staff]);
  return reg;
}
const reporterText = (name, reg) => reg ? `${name} (${reg})` : name;
const handlerText = (c, faculty) => {
  if (!c.assignedToName) return '';
  const d = c.assignedToDesignation || designationText(faculty?.find(x => x.uid === c.assignedTo)?.designations);
  return d ? `${c.assignedToName}, ${d}` : c.assignedToName;
};

function Photo({ id }) {
  const [src, setSrc] = useState(null); const [state, setState] = useState('idle');
  const load = async () => { setState('loading'); try { const s = await getDoc(photoRef(id)); setSrc(s.exists() ? s.data().data : null); setState('done'); } catch { setState('error'); } };
  if (state === 'idle') return <button className="link-btn" onClick={load}><Icon name="camera" size={15} /> Show photo</button>;
  if (state === 'loading') return <small className="muted">Loading photo…</small>;
  return src ? <img className="c-photo" src={src} alt="Complaint evidence" /> : <small className="muted">Photo not available.</small>;
}

function Detail({ c, staff, faculty, onClose }) {
  const { profile: p, user } = useAuth(); const toast = useToast();
  const [note, setNote] = useState(''); const [assignee, setAssignee] = useState(c.assignedTo || ''); const [busy, setBusy] = useState(false);
  const move = async (status, extra = {}) => {
    setBusy(true);
    try { await updateComplaint(c.id, { status, ...extra }, { status, by: p.name, note: note.trim() }); toast(`Marked ${statusLabel(status).toLowerCase()}`); setNote(''); }
    catch (e) { toast(e.code === 'permission-denied' ? 'You cannot update complaints.' : e.message, 'err'); } finally { setBusy(false); }
  };
  const assign = () => {
    const f = faculty.find(x => x.uid === assignee); if (!f) return toast('Choose who to assign.', 'err');
    move('assigned', { assignedTo: f.uid, assignedToName: f.name, assignedToDesignation: designationText(f.designations) });
  };
  const idx = COMPLAINT_STATUSES.findIndex(s => s.id === c.status);
  const reg = useRegNo(c, staff) || (c.ownerId === user.uid ? p.regNo || '' : '');
  return (
    <Modal wide title={c.title} onClose={onClose}>
      <div className="stack">
        <StatusTrail status={c.status} />
        <p className="c-desc">{c.description}</p>
        <div className="meta-grid">
          <span><b>Category</b>{categoryLabel(c.category)}</span>
          <span><b>Place</b>{c.resourceName || c.location || 'Not given'}</span>
          <span><b>Reported by</b>{staff || c.ownerId === user.uid ? reporterText(c.ownerName, reg) : 'A student'}</span>
          <span><b>Handled by</b>{handlerText(c, faculty) || 'Not assigned yet'}</span>
        </div>
        {c.hasPhoto && (staff || c.ownerId === user.uid) && <Photo id={c.id} />}
        <div><h3 className="h-sm">History</h3>
          <ol className="history">{[...(c.history || [])].reverse().map((h, i) => <li key={i}><b>{statusLabel(h.status)}</b><span>{h.by} · {fmtDateTime(h.at)}</span>{h.note && <p>{h.note}</p>}</li>)}</ol></div>
        {staff && c.status !== 'resolved' && (
          <div className="admin-box">
            <h3 className="h-sm">Update this complaint</h3>
            <div className="assign-row">
              <Select label="Assign to" value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Choose faculty / admin</option>{faculty.map(f => <option key={f.uid} value={f.uid}>{f.name}{f.designations?.length ? ` — ${designationText(f.designations)}` : ''}</option>)}</Select>
              <Button variant="outline" onClick={assign} disabled={busy}>Assign</Button>
            </div>
            <Input label="Note (optional)" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Technician called, part ordered" />
            <div className="row-btns">
              {idx < 2 && <Button variant="outline" disabled={busy} onClick={() => move('in_progress')}>Start work</Button>}
              {idx === 2 && <Button variant="outline" disabled={busy} onClick={() => move('assigned')}>Back to assigned</Button>}
              <Button disabled={busy} onClick={() => move('resolved')}>Mark resolved</Button>
            </div>
          </div>)}
        {staff && c.status === 'resolved' && <Button variant="outline" onClick={() => move('in_progress')}>Reopen</Button>}
        {p.role === 'principal' && <Button variant="danger" size="sm" onClick={async () => { if (confirm('Delete this complaint permanently?')) { await deleteComplaint(c.id); onClose(); } }}>Delete complaint</Button>}
      </div>
    </Modal>);
}

function NewComplaint({ complaints, resources, onClose }) {
  const { profile: p, user } = useAuth(); const toast = useToast();
  const [f, setF] = useState(blank); const [touched, setTouched] = useState(false);
  const [photo, setPhoto] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const upd = (k, v) => {
    const next = { ...f, [k]: v };
    if (!touched && (k === 'title' || k === 'description')) next.category = classifyComplaint(`${next.title} ${next.description}`).category;
    setF(next);
  };
  const similar = useMemo(() => (f.title.length > 3 ? findSimilar(f, complaints) : []), [f, complaints]);
  const onPhoto = async e => { const file = e.target.files[0]; if (!file) return; setErr(''); try { setPhoto(await compressImage(file)); } catch (x) { setErr(x.message); } };
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = resources.find(r => r.id === f.resourceId);
      let category = f.category;
      if (!touched) category = (await aiClassify(`${f.title}. ${f.description}`)) || category;     // optional AI, falls back to rules
      const { priority } = classifyComplaint(`${f.title} ${f.description}`);
      await submitComplaint({ title: f.title.trim(), description: f.description.trim(), category, priority, resourceId: res?.id || null, resourceName: res?.name || '', location: res ? '' : f.location.trim(), ownerName: p.name, ownerRegNo: p.regNo || '', ownerBranch: p.branch || '', similarCount: similar.length }, photo, { uid: user.uid, name: p.name });
      toast('Complaint submitted'); onClose();
    } catch (x) { setErr(x.code === 'permission-denied' ? 'The database refused this complaint. Publish the latest firestore.rules.' : x.message); setBusy(false); }
  };
  return (
    <Modal wide title="Report a problem" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Input label="What is wrong?" required maxLength={150} placeholder="e.g. Projector not turning on" value={f.title} onChange={e => upd('title', e.target.value)} />
        <Textarea label="Details" required rows={4} maxLength={2000} value={f.description} onChange={e => upd('description', e.target.value)} />
        <div className="two">
          <Select label="Where" value={f.resourceId} onChange={e => upd('resourceId', e.target.value)}><option value="">Other / not listed</option>{resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</Select>
          {!f.resourceId && <Input label="Location" required placeholder="e.g. Ground floor washroom" value={f.location} onChange={e => upd('location', e.target.value)} />}
        </div>
        <Select label="Category" hint={touched ? '' : 'Picked automatically from your description. You can change it.'} value={f.category} onChange={e => { setTouched(true); setF({ ...f, category: e.target.value }); }}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</Select>
        {similar.length > 0 && <div className="note warn"><Icon name="alert" size={18} /><span><b>{similar.length} similar complaint{similar.length > 1 ? 's are' : ' is'} already open.</b> {similar[0].title}{similar.length > 1 ? ` and ${similar.length - 1} more` : ''}. You can still submit; repeated reports help the office spot recurring problems.</span></div>}
        <div className="field"><span className="field-label">Photo (optional)</span>
          <label className="photo-pick">{photo ? <img src={photo} alt="Preview" /> : <><Icon name="camera" size={24} /><span>Take or choose a photo</span></>}<input type="file" accept="image/*" capture="environment" onChange={onPhoto} hidden /></label>
          {photo && <button type="button" className="link-btn" onClick={() => setPhoto(null)}>Remove photo</button>}
        </div>
        <ErrorNote error={err} />
        <Button type="submit" loading={busy}>Submit complaint</Button>
      </form>
    </Modal>);
}

function ComplaintCard({ c, staff, faculty, onOpen }) {
  const reg = useRegNo(c, staff);
  return (
    <button className="c-card" onClick={onOpen}>
      <div className="c-top"><b>{c.title}</b>{c.priority === 'high' && <Badge tone="danger">Urgent</Badge>}</div>
      <small className="muted">{c.resourceName || c.location || 'No place given'} · {categoryLabel(c.category)} · {timeAgo(c.createdAt)}</small>
      {staff && <small className="muted">Reported by {reporterText(c.ownerName, reg)}</small>}
      <StatusTrail status={c.status} compact />
      {c.assignedToName && <small className="muted">Handled by {handlerText(c, faculty)}</small>}
    </button>);
}

export default function Complaints() {
  const { profile: p, user } = useAuth();
  const staff = p.role !== 'student';
  const { data, loading, error } = useLive(complaintsQ, []);
  const resources = useLive(resourcesQ, []).data;
  const faculty = useLive(() => (staff ? query(collection(db, 'users'), where('role', '==', 'faculty'), where('status', '==', 'active')) : null), [staff]).data;
  const [tab, setTab] = useState(staff ? 'open' : 'mine');
  const [cat, setCat] = useState('all'); const [sel, setSel] = useState(null); const [newOpen, setNewOpen] = useState(false);

  const list = data.filter(c => {
    if (tab === 'mine' && c.ownerId !== user.uid) return false;
    if (tab === 'open' && c.status === 'resolved') return false;
    if (tab === 'resolved' && c.status !== 'resolved') return false;
    if (tab === 'assigned' && c.assignedTo !== user.uid) return false;
    return cat === 'all' || c.category === cat;
  });
  const repeated = staff ? repeatedIssues(data) : [];
  const selected = data.find(c => c.id === sel?.id) || null;
  const tabs = staff
    ? [{ id: 'open', label: 'Open', count: data.filter(c => c.status !== 'resolved').length }, { id: 'assigned', label: 'Assigned to me' }, { id: 'resolved', label: 'Resolved' }, { id: 'all', label: 'All' }]
    : [{ id: 'mine', label: 'My complaints' }, { id: 'open', label: 'Open on campus' }, { id: 'resolved', label: 'Resolved' }];

  return (<>
    <PageHeader title={<><span className="hi">निवारण</span> · Complaints</>} subtitle="Report a problem with a photo and follow it from Pending to Resolved." actions={<Button icon="plus" onClick={() => setNewOpen(true)}>Report a problem</Button>} />
    {repeated.length > 0 && <div className="note warn stack-tight"><Icon name="alert" size={18} /><div><b>Repeated issues</b><ul className="plain">{repeated.slice(0, 3).map(g => <li key={g.place + g.category}>{g.place}: {g.items.length} open {categoryLabel(g.category).toLowerCase()} complaints</li>)}</ul></div></div>}
    <Tabs value={tab} onChange={setTab} options={tabs} />
    <div className="filters"><Select label="Category" value={cat} onChange={e => setCat(e.target.value)}><option value="all">All categories</option>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</Select></div>
    <ErrorNote error={error} />
    {loading ? <Loading /> : !list.length ? <Empty icon="wrench" title={tab === 'mine' ? 'You have not reported anything' : 'No complaints here'} action={tab === 'mine' && <Button onClick={() => setNewOpen(true)}>Report a problem</Button>}>Broken PC, projector, tap or light? Tell the office and track it here.</Empty> : (
      <div className="c-list">
        {list.map(c => <ComplaintCard key={c.id} c={c} staff={staff} faculty={faculty} onOpen={() => setSel(c)} />)}
      </div>)}
    {selected && <Detail c={selected} staff={staff} faculty={faculty} onClose={() => setSel(null)} />}
    {newOpen && <NewComplaint complaints={data} resources={resources} onClose={() => setNewOpen(false)} />}
  </>);
}
