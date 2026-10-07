import { useState } from 'react';
import { collection, query, where } from 'firebase/firestore';
import { db } from '../../firebase';
import { useAuth } from '../../context/AuthContext';
import { useLive } from '../../hooks/useLive';
import { reviewUser, setFacultyBranches } from '../../services/users';
import { branches, branchLabel } from '../../config/branches';
import { designations } from '../../config/designations';
import { fmtDate } from '../../lib/format';
import { Button, Modal, PageHeader, Empty, Loading, ErrorNote, Tabs, useToast } from '../../components/ui/UI';

const dName = id => designations.find(d => d.id === id)?.label || id;
const STATUS = [['pending', 'Pending'], ['active', 'Approved'], ['rejected', 'Rejected'], ['revoked', 'Revoked']];

function Person({ u, role, me, isPrincipal, canAct, onEdit }) {
  const toast = useToast(); const [busy, setBusy] = useState(false);
  const run = async (status, extra) => {
    if (status === 'rejected' && !extra) { const r = prompt('Reason (shown to the applicant, optional):'); if (r === null) return; extra = r ? { rejectionReason: r } : { rejectionReason: '' }; }
    if (status === 'revoked' && !confirm(`Revoke access for ${u.name}?`)) return;
    setBusy(true);
    try { await reviewUser(u.uid, status, me, extra); toast(`${u.name}: ${status === 'active' ? 'approved' : status}`); }
    catch (e) { toast(e.code === 'permission-denied' ? 'You cannot change this account.' : e.message, 'err'); } finally { setBusy(false); }
  };
  return (
    <article className="person">
      <div className="avatar lg">{u.name[0]?.toUpperCase()}</div>
      <div className="person-body">
        <b>{u.name}</b><small>{u.email}</small>
        <small>{role === 'student' ? `${u.regNo} · ${branchLabel(u.branch)} Sem ${u.semester}` : (u.designations || []).map(dName).join(', ')}</small>
        {role === 'faculty' && <small>Branches: {u.branches?.length ? u.branches.map(branchLabel).join(', ') : 'none'}{u.status === 'active' && canAct && <> · <button className="link-btn inline" onClick={() => onEdit(u)}>Edit</button></>}</small>}
        <small className="muted">Requested {fmtDate(u.createdAt)}</small>
      </div>
      {canAct && <div className="person-actions">
        {u.status === 'pending' && <><Button size="sm" loading={busy} onClick={() => run('active')}>Approve</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => run('rejected')}>Reject</Button></>}
        {u.status === 'active' && isPrincipal && <Button size="sm" variant="danger" disabled={busy} onClick={() => run('revoked')}>Revoke</Button>}
        {(u.status === 'rejected' || u.status === 'revoked') && <Button size="sm" variant="outline" loading={busy} onClick={() => run('active')}>Approve again</Button>}
      </div>}
    </article>);
}

function EditBranches({ u, onClose }) {
  const toast = useToast(); const [b, setB] = useState(u.branches || []); const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await setFacultyBranches(u.uid, b); toast('Branches updated'); onClose(); } catch (e) { toast(e.message, 'err'); setBusy(false); } };
  return (
    <Modal title={`Branches for ${u.name}`} onClose={onClose}>
      <div className="stack"><p className="muted">This faculty member approves new students of the selected branches.</p>
        <div className="check-row">{branches.map(x => <label key={x.id} className="check"><input type="checkbox" checked={b.includes(x.id)} onChange={() => setB(b.includes(x.id) ? b.filter(i => i !== x.id) : [...b, x.id])} />{x.label}</label>)}</div>
        <Button loading={busy} onClick={save}>Save branches</Button></div>
    </Modal>);
}

export default function Approvals() {
  const { profile: p, user } = useAuth();
  const principal = p.role === 'principal';
  const [role, setRole] = useState(principal ? 'faculty' : 'student');
  // Faculty with assigned branches approve those branches; faculty with none can approve students of every branch.
  const myBranches = p.branches || [];
  const scoped = !principal && myBranches.length > 0;
  const chipBranches = scoped ? myBranches : branches.map(b => b.id);
  const [status, setStatus] = useState('pending'); const [branch, setBranch] = useState(scoped ? myBranches[0] : 'all'); const [edit, setEdit] = useState(null);

  const { data, loading, error } = useLive(() => {
    if (principal) return query(collection(db, 'users'), where('role', '==', role));
    const students = query(collection(db, 'users'), where('role', '==', 'student'));
    return branch === 'all' ? students : query(students, where('branch', '==', branch));
  }, [principal, role, branch]);
  const counts = s => data.filter(u => u.status === s).length;
  const list = data.filter(u => u.status === status).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  return (<>
    <PageHeader title="People & approvals" subtitle={principal ? 'Every faculty / admin account needs your approval. You can also revoke access any time.' : scoped ? 'Approve new students of your branches.' : 'Approve new students. Pick a branch to narrow the list.'} />
    {principal && <Tabs value={role} onChange={r => { setRole(r); setStatus('pending'); }} options={[{ id: 'faculty', label: 'Faculty / Admin' }, { id: 'student', label: 'Students' }]} />}
    {!principal && <div className="chips">{!scoped && <button className={`chip ${branch === 'all' ? 'on' : ''}`} onClick={() => setBranch('all')}>All branches</button>}{chipBranches.map(b => <button key={b} className={`chip ${branch === b ? 'on' : ''}`} onClick={() => setBranch(b)}>{branchLabel(b)}</button>)}</div>}
    {(<>
      <Tabs value={status} onChange={setStatus} options={STATUS.filter(([id]) => principal || id !== 'revoked').map(([id, label]) => ({ id, label, count: counts(id) }))} />
      <ErrorNote error={error} />
      {loading ? <Loading /> : !list.length ? <Empty icon="users" title={`No ${STATUS.find(s => s[0] === status)[1].toLowerCase()} requests`}>New requests appear here instantly.</Empty>
        : <div className="people">{list.map(u => <Person key={u.uid} u={u} role={role} me={user.uid} isPrincipal={principal} canAct={principal || (u.role === 'student' && (!scoped || myBranches.includes(u.branch)) && u.status !== 'revoked')} onEdit={setEdit} />)}</div>}
    </>)}
    {edit && <EditBranches u={edit} onClose={() => setEdit(null)} />}
  </>);
}
