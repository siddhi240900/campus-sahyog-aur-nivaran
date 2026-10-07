import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { noticesQ, saveNotice, deleteNotice, noticeForStudent } from '../../services/data';
import { branches, semesters, branchLabel } from '../../config/branches';
import { displayName } from '../../lib/people';
import { fmtDateTime } from '../../lib/format';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, Textarea, Modal, PageHeader, Empty, Loading, ErrorNote, Badge, useToast, Tabs } from '../../components/ui/UI';

const blank = { title: '', body: '', target: 'all', branch: '', semester: '', pinned: false };

export default function Notices() {
  const { profile: p, user } = useAuth();
  const toast = useToast();
  const { data, loading, error } = useLive(noticesQ, []);
  const staff = p.role !== 'student';
  const [edit, setEdit] = useState(null);
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('mine');

  const list = [...(staff || tab === 'all' ? data : data.filter(n => noticeForStudent(n, p)))].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const open = n => { setEdit(n || {}); setF(n ? { title: n.title, body: n.body, target: n.target, branch: n.branch || '', semester: n.semester || '', pinned: !!n.pinned } : blank); };
  const save = async e => {
    e.preventDefault();
    if (f.target !== 'all' && !f.branch) return toast('Choose a branch for this notice.', 'err');
    if (f.target === 'semester' && !f.semester) return toast('Choose a semester.', 'err');
    setBusy(true);
    try {
      const data = { title: f.title.trim(), body: f.body.trim(), target: f.target, branch: f.target === 'all' ? null : f.branch, semester: f.target === 'semester' ? Number(f.semester) : null, pinned: f.pinned };
      await saveNotice(edit.id, edit.id ? data : { ...data, authorId: user.uid, authorName: p.name, authorRole: p.role });
      toast(edit.id ? 'Notice updated' : 'Notice published'); setEdit(null);
    } catch (err) { toast(err.code === 'permission-denied' ? 'You cannot do this.' : err.message, 'err'); } finally { setBusy(false); }
  };
  const remove = async n => { if (!confirm('Delete this notice?')) return; try { await deleteNotice(n.id); toast('Notice deleted'); } catch { toast('Could not delete.', 'err'); } };
  const canEdit = n => p.role === 'principal' || n.authorId === user.uid;

  return (<>
    <PageHeader title="Notices" subtitle={staff ? 'Post to the whole college, a branch or one semester.' : 'Notices for your branch, semester and the whole college.'} actions={staff && <Button icon="plus" onClick={() => open()}>New notice</Button>} />
    {!staff && <Tabs value={tab} onChange={setTab} options={[{ id: 'mine', label: 'For me' }, { id: 'all', label: 'Everything' }]} />}
    <ErrorNote error={error} />
    {loading ? <Loading /> : !list.length ? <Empty icon="bell" title="No notices yet" action={staff && <Button onClick={() => open()}>Post the first notice</Button>}>Nothing has been posted for you.</Empty> : (
      <div className="notice-list">
        {list.map(n => (
          <article key={n.id} className={`notice ${n.pinned ? 'pinned' : ''}`}>
            <div className="notice-top">
              <div className="chips">
                {n.pinned && <Badge tone="gold"><Icon name="pin" size={12} /> Pinned</Badge>}
                <Badge tone={n.target === 'all' ? 'resolved' : 'assigned'}>{n.target === 'all' ? 'Whole college' : `${branchLabel(n.branch)}${n.target === 'semester' ? ` · Sem ${n.semester}` : ''}`}</Badge>
              </div>
              {staff && canEdit(n) && <div className="row-actions"><button className="icon-btn" onClick={() => open(n)} aria-label="Edit"><Icon name="edit" size={17} /></button><button className="icon-btn" onClick={() => remove(n)} aria-label="Delete"><Icon name="trash" size={17} /></button></div>}
            </div>
            <h2>{n.title}</h2><p className="body">{n.body}</p>
            <small className="meta">{displayName({ name: n.authorName, role: n.authorRole })} · {fmtDateTime(n.createdAt)}</small>
          </article>
        ))}
      </div>)}
    {edit && <Modal title={edit.id ? 'Edit notice' : 'New notice'} onClose={() => setEdit(null)}>
      <form onSubmit={save} className="stack">
        <Input label="Title" required maxLength={150} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
        <Textarea label="Message" required rows={5} maxLength={5000} value={f.body} onChange={e => setF({ ...f, body: e.target.value })} />
        <Select label="Who should see it" value={f.target} onChange={e => setF({ ...f, target: e.target.value })}>
          <option value="all">Whole college</option><option value="branch">One branch</option><option value="semester">One branch and semester</option>
        </Select>
        {f.target !== 'all' && <div className="two">
          <Select label="Branch" value={f.branch} onChange={e => setF({ ...f, branch: e.target.value })}><option value="">Choose</option>{branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</Select>
          {f.target === 'semester' && <Select label="Semester" value={f.semester} onChange={e => setF({ ...f, semester: e.target.value })}><option value="">Choose</option>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select>}
        </div>}
        <label className="check"><input type="checkbox" checked={f.pinned} onChange={e => setF({ ...f, pinned: e.target.checked })} />Pin to the top</label>
        <Button type="submit" loading={busy}>{edit.id ? 'Save changes' : 'Publish notice'}</Button>
      </form>
    </Modal>}
  </>);
}
