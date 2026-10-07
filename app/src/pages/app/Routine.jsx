import { useEffect, useState } from 'react';
import { onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { routineRef, saveRoutine, resourcesQ, routineImageRef, saveRoutineImage, deleteRoutineImage } from '../../services/data';
import { branches, semesters } from '../../config/branches';
import { DAYS } from '../../config/constants';
import { to12h, fmtDate } from '../../lib/format';
import { compressRoutineImage } from '../../lib/image';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Modal, PageHeader, Empty, Loading, Tabs, ErrorNote, useToast } from '../../components/ui/UI';

const todayName = DAYS[(new Date().getDay() + 6) % 7] || 'Monday';
const blank = { day: 'Monday', start: '09:00', end: '10:00', subject: '', teacher: '', room: '' };
const nowHHMM = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };


// Photo / scan of the whole routine. Staff upload it once per branch + semester and can replace it any time.
function RoutineImage({ branch, sem, staff, img, loading }) {
  const { profile: p, user } = useAuth(); const toast = useToast();
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [zoom, setZoom] = useState(false);
  const label = `${branches.find(b => b.id === branch)?.short || branch} Sem ${sem}`;
  const pick = async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    setErr(''); setBusy(true);
    try {
      const data = await compressRoutineImage(file);
      await saveRoutineImage(branch, sem, data, { name: p.name, uid: user.uid });
      toast(img ? 'Routine image replaced' : 'Routine image uploaded');
    } catch (x) { setErr(x.code === 'permission-denied' ? 'You cannot upload routines. Publish the latest firestore.rules.' : x.message); }
    finally { setBusy(false); }
  };
  const remove = async () => { if (!confirm(`Remove the routine image for ${label}?`)) return; try { await deleteRoutineImage(branch, sem); toast('Routine image removed'); } catch (x) { toast(x.message, 'err'); } };
  if (loading) return <Loading />;
  const picker = (text, variant = 'primary') => <label className={`btn ${variant} ${busy ? 'is-busy' : ''}`}><Icon name="upload" size={16} />{busy ? 'Uploading…' : text}<input type="file" accept="image/*" hidden disabled={busy} onChange={pick} /></label>;
  if (!img) return (<>
    <ErrorNote error={err} />
    {staff
      ? <div className="routine-drop"><div className="empty-icon"><Icon name="image" size={26} /></div><b>Upload the routine for {label}</b><p>Take a photo or choose the routine image. Students of this branch and semester will see it right away. You can replace it whenever the routine changes.</p>{picker('Choose routine image')}</div>
      : <Empty icon="image" title="Routine image not uploaded yet">Faculty have not uploaded the routine for {label}.</Empty>}
  </>);
  return (<>
    <ErrorNote error={err} />
    <figure className="routine-img">
      <button type="button" className="routine-img-btn" onClick={() => setZoom(true)} aria-label="Open routine image full screen"><img src={img.data} alt={`Routine for ${label}`} /></button>
      <figcaption><span>Tap the image to zoom{img.updatedAt ? ` · Updated ${fmtDate(img.updatedAt)}` : ''}{img.updatedBy ? ` by ${img.updatedBy}` : ''}</span>
        <span className="row-btns"><a className="btn outline sm" href={img.data} download={`routine-${branch}-sem${sem}.jpg`}><Icon name="download" size={15} />Save</a>
          {staff && <>{picker('Replace', 'outline sm')}<button className="btn danger sm" onClick={remove}><Icon name="trash" size={15} />Remove</button></>}</span>
      </figcaption>
    </figure>
    {zoom && <Modal wide title={`Routine · ${label}`} onClose={() => setZoom(false)}><div className="zoom-box"><img src={img.data} alt={`Routine for ${label}`} /></div></Modal>}
  </>);
}

export default function Routine() {
  const { profile: p, user } = useAuth();
  const toast = useToast();
  const staff = p.role !== 'student';
  const [branch, setBranch] = useState(p.branch || p.branches?.[0] || 'cse');
  const [sem, setSem] = useState(p.semester || 1);
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState(DAYS.includes(todayName) ? todayName : 'Monday');
  const [form, setForm] = useState(null);      // {index?, ...entry}
  const [img, setImg] = useState(null); const [imgLoading, setImgLoading] = useState(true);
  const [view, setView] = useState(null);       // null = automatic: image if there is one, else periods
  const rooms = useLive(resourcesQ, []).data;

  useEffect(() => {
    setLoading(true);
    return onSnapshot(routineRef(branch, sem), s => { setDoc(s.exists() ? s.data() : null); setLoading(false); }, () => setLoading(false));
  }, [branch, sem]);
  useEffect(() => {
    setImgLoading(true); setView(null);
    return onSnapshot(routineImageRef(branch, sem), s => { setImg(s.exists() ? s.data() : null); setImgLoading(false); }, () => { setImg(null); setImgLoading(false); });
  }, [branch, sem]);

  const entries = doc?.entries || [];
  const dayList = entries.map((e, i) => ({ ...e, i })).filter(e => e.day === day).sort((a, b) => a.start.localeCompare(b.start));
  const persist = async next => {
    try { await saveRoutine(branch, sem, next, { name: p.name, uid: user.uid }); toast('Routine saved'); }
    catch (e) { toast(e.code === 'permission-denied' ? 'You cannot edit routines.' : e.message, 'err'); }
  };
  const submit = async e => {
    e.preventDefault();
    if (form.end <= form.start) return toast('End time must be after start time.', 'err');
    const { index, ...entry } = form; const next = [...entries];
    index == null ? next.push(entry) : (next[index] = entry);
    await persist(next); setForm(null); setDay(entry.day);
  };
  const remove = async i => { if (confirm('Remove this period?')) await persist(entries.filter((_, k) => k !== i)); };
  const now = nowHHMM();
  const mode = view || (img || !entries.length ? 'image' : 'periods');

  return (<>
    <PageHeader title="Routine" subtitle={mode === 'periods' && doc?.updatedAt ? `Last updated ${fmtDate(doc.updatedAt)} by ${doc.updatedBy}` : 'Pick a branch and semester.'} actions={staff && mode === 'periods' && <Button icon="plus" onClick={() => setForm({ ...blank, day })}>Add period</Button>} />
    <div className="filters">
      <Select label="Branch" value={branch} onChange={e => setBranch(e.target.value)}>{branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</Select>
      <Select label="Semester" value={sem} onChange={e => setSem(Number(e.target.value))}>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select>
    </div>
    <Tabs value={mode} onChange={setView} options={[{ id: 'image', label: 'Routine image' }, { id: 'periods', label: 'Day-wise periods', count: entries.length || null }]} />
    {mode === 'image' ? <RoutineImage branch={branch} sem={sem} staff={staff} img={img} loading={imgLoading} /> : (<>
    <div className="day-tabs" role="tablist">
      {DAYS.map(d => <button key={d} role="tab" aria-selected={day === d} className={`${day === d ? 'on' : ''} ${d === todayName ? 'today' : ''}`} onClick={() => setDay(d)}>{d.slice(0, 3)}</button>)}
    </div>
    {loading ? <Loading /> : !entries.length ? <Empty icon="calendar" title="No routine uploaded yet" action={staff && <Button onClick={() => setForm({ ...blank })}>Add the first period</Button>}>{staff ? 'Add periods for this branch and semester.' : 'Faculty have not uploaded this routine yet.'}</Empty>
      : !dayList.length ? <Empty icon="calendar" title={`No periods on ${day}`} />
      : <ul className="periods">{dayList.map(e => {
          const live = day === todayName && now >= e.start && now < e.end;
          return (
            <li key={e.i} className={live ? 'live' : ''}>
              <div className="p-time"><b>{to12h(e.start)}</b><small>{to12h(e.end)}</small></div>
              <div className="p-body"><b>{e.subject}</b><small>{[e.teacher, e.room].filter(Boolean).join(' · ')}</small></div>
              {live && <span className="badge resolved">Now</span>}
              {staff && <div className="row-actions"><button className="icon-btn" onClick={() => setForm({ ...e, index: e.i })} aria-label="Edit"><Icon name="edit" size={17} /></button><button className="icon-btn" onClick={() => remove(e.i)} aria-label="Delete"><Icon name="trash" size={17} /></button></div>}
            </li>);
        })}</ul>}
    </>)}
    {form && <Modal title={form.index == null ? 'Add period' : 'Edit period'} onClose={() => setForm(null)}>
      <form onSubmit={submit} className="stack">
        <Select label="Day" value={form.day} onChange={e => setForm({ ...form, day: e.target.value })}>{DAYS.map(d => <option key={d}>{d}</option>)}</Select>
        <div className="two"><Input label="Starts" type="time" required value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} /><Input label="Ends" type="time" required value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} /></div>
        <Input label="Subject" required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
        <Input label="Teacher" value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })} />
        <Input label="Room or lab" list="room-list" value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} hint="Pick a campus room or type your own." />
        <datalist id="room-list">{rooms.map(r => <option key={r.id} value={r.name} />)}</datalist>
        <Button type="submit">Save period</Button>
      </form>
    </Modal>}
  </>);
}
