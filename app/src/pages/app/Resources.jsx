import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { resourcesQ, complaintsQ, createResource, updateResource, deleteResource } from '../../services/data';
import { RESOURCE_TYPES, typeLabel } from '../../config/constants';
import { fmtTime, pad } from '../../lib/format';
import { displayName } from '../../lib/people';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, Tabs, useToast } from '../../components/ui/UI';
import { Link } from 'react-router-dom';

const releaseFromTime = hhmm => { if (!hhmm) return null; const [h, m] = hhmm.split(':').map(Number); const d = new Date(); d.setHours(h, m, 0, 0); if (d < new Date()) d.setDate(d.getDate() + 1); return d.getTime(); };
const timeFromRelease = ms => { if (!ms) return ''; const d = new Date(ms); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

export default function Resources() {
  const { profile: p, user } = useAuth();
  const toast = useToast();
  const { data, loading, error } = useLive(resourcesQ, []);
  const complaints = useLive(complaintsQ, []).data;
  const [type, setType] = useState('all');
  const [upd, setUpd] = useState(null);    // resource being updated
  const [add, setAdd] = useState(false);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const staff = p.role !== 'student', principal = p.role === 'principal';

  const items = data.filter(r => type === 'all' || r.type === type).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const issues = id => complaints.filter(c => c.resourceId === id && c.status !== 'resolved').length;
  const isFree = r => r.status === 'available' || (r.releaseAt && r.releaseAt < Date.now());
  const openUpdate = r => { setUpd(r); setF({ status: isFree(r) ? 'occupied' : 'available', facultyName: displayName(p), purpose: '', release: '' }); };

  const saveStatus = async e => {
    e.preventDefault(); setBusy(true);
    try {
      const occupied = f.status === 'occupied';
      await updateResource(upd.id, { status: f.status, facultyName: occupied ? f.facultyName.trim() : '', purpose: occupied ? f.purpose.trim() : '', releaseAt: occupied ? releaseFromTime(f.release) : null }, user.uid);
      toast(`${upd.name} marked ${f.status}`); setUpd(null);
    } catch (err) { toast(err.message, 'err'); } finally { setBusy(false); }
  };
  const create = async e => {
    e.preventDefault(); setBusy(true);
    try { await createResource({ name: f.name.trim(), type: f.type || 'classroom', location: (f.location || '').trim(), capacity: f.capacity ? Number(f.capacity) : null }); toast('Resource added'); setAdd(false); }
    catch (err) { toast(err.code === 'permission-denied' ? 'Only the Principal can add resources.' : err.message, 'err'); } finally { setBusy(false); }
  };
  const remove = async r => { if (!confirm(`Delete ${r.name}?`)) return; try { await deleteResource(r.id); toast('Resource deleted'); } catch { toast('Could not delete.', 'err'); } };

  return (<>
    <PageHeader title="Live resources" subtitle="Classrooms, labs, library and halls, and whether they are free right now." actions={principal && <Button icon="plus" onClick={() => { setF({ type: 'classroom' }); setAdd(true); }}>Add resource</Button>} />
    <Tabs value={type} onChange={setType} options={[{ id: 'all', label: 'All', count: data.length }, ...RESOURCE_TYPES.map(t => ({ id: t.id, label: t.label, count: data.filter(r => r.type === t.id).length }))]} />
    <ErrorNote error={error} />
    {loading ? <Loading /> : !items.length ? <Empty icon="door" title="No resources here" action={principal && <Button onClick={() => { setF({ type: 'classroom' }); setAdd(true); }}>Add a resource</Button>}>{principal ? 'Create classrooms, labs, the library and seminar halls.' : 'The Principal adds campus resources.'}</Empty> : (
      <div className="res-grid">
        {items.map(r => {
          const free = isFree(r); const n = issues(r.id);
          return (
            <article key={r.id} className={`res ${free ? 'free' : 'busy'}`}>
              <div className="res-top"><div><b>{r.name}</b><small>{typeLabel(r.type)}{r.location ? ` · ${r.location}` : ''}{r.capacity ? ` · ${r.capacity} seats` : ''}</small></div>
                <Badge tone={free ? 'resolved' : 'danger'}>{free ? 'Available' : 'Occupied'}</Badge></div>
              {!free && <div className="res-detail"><span><Icon name="users" size={15} />{r.facultyName || 'In use'}</span>{r.purpose && <span><Icon name="book" size={15} />{r.purpose}</span>}{r.releaseAt && <span><Icon name="clock" size={15} />Free around {fmtTime(r.releaseAt)}</span>}</div>}
              {r.status === 'occupied' && free && <small className="muted">Release time has passed, so it is shown as available.</small>}
              {n > 0 && <Link to="/app/complaints" className="res-issue"><Icon name="alert" size={15} />{n} open complaint{n > 1 ? 's' : ''}</Link>}
              {staff && <div className="res-actions"><Button size="sm" variant="outline" onClick={() => openUpdate(r)}>Update status</Button>{principal && <button className="icon-btn" onClick={() => remove(r)} aria-label={`Delete ${r.name}`}><Icon name="trash" size={17} /></button>}</div>}
            </article>);
        })}
      </div>)}
    {upd && <Modal title={`Update ${upd.name}`} onClose={() => setUpd(null)}>
      <form onSubmit={saveStatus} className="stack">
        <div className="seg">{['available', 'occupied'].map(s => <button type="button" key={s} className={f.status === s ? 'on' : ''} onClick={() => setF({ ...f, status: s })}>{s === 'available' ? 'Available' : 'Occupied'}</button>)}</div>
        {f.status === 'occupied' && <>
          <Input label="Faculty name" required value={f.facultyName} onChange={e => setF({ ...f, facultyName: e.target.value })} />
          <Input label="Purpose" required placeholder="e.g. CSE Sem 4 practical" value={f.purpose} onChange={e => setF({ ...f, purpose: e.target.value })} />
          <Input label="Expected release time" type="time" required value={f.release} onChange={e => setF({ ...f, release: e.target.value })} />
        </>}
        <Button type="submit" loading={busy}>Save status</Button>
      </form>
    </Modal>}
    {add && <Modal title="Add campus resource" onClose={() => setAdd(false)}>
      <form onSubmit={create} className="stack">
        <Input label="Name" required placeholder="e.g. Computer Lab 2" value={f.name || ''} onChange={e => setF({ ...f, name: e.target.value })} />
        <Select label="Type" value={f.type} onChange={e => setF({ ...f, type: e.target.value })}>{RESOURCE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
        <div className="two"><Input label="Building / floor" placeholder="Block A, 1st floor" value={f.location || ''} onChange={e => setF({ ...f, location: e.target.value })} /><Input label="Seats" type="number" min="1" value={f.capacity || ''} onChange={e => setF({ ...f, capacity: e.target.value })} /></div>
        <Button type="submit" loading={busy}>Add resource</Button>
      </form>
    </Modal>}
  </>);
}
