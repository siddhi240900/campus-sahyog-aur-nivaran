import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerAuth, loginAuth, removeCurrentUser, signOut, sendVerification, authMessage } from '../../services/auth';
import { createProfile, getProfile } from '../../services/users';
import { useAuth } from '../../context/AuthContext';
import { branches, semesters } from '../../config/branches';
import { designationGroups, designations, HOD_ID } from '../../config/designations';
import { normalizeRegNo } from '../../lib/format';
import { AuthShell } from '../../components/layout/AuthShell';
import Icon from '../../components/ui/Icon';
import { Button, Input, Select, ErrorNote } from '../../components/ui/UI';

const blank = { name: '', regNo: '', branch: '', semester: '', email: '', password: '', confirm: '', designations: [], branches: [] };

export default function Register() {
  const { runRegistration } = useAuth();
  const nav = useNavigate();
  const [role, setRole] = useState('');
  const [f, setF] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));
  const toggle = (k, v) => setF(s => ({ ...s, [k]: s[k].includes(v) ? s[k].filter(x => x !== v) : [...s[k], v] }));

  const validate = () => {
    if (f.name.trim().length < 2) return 'Enter your full name.';
    if (f.password.length < 8) return 'Password must have at least 8 characters.';
    if (f.password !== f.confirm) return 'Passwords do not match.';
    if (role === 'student') {
      if (normalizeRegNo(f.regNo).length < 3) return 'Enter a valid registration number (letters, numbers and dashes).';
      if (!f.branch || !f.semester) return 'Choose your branch and semester.';
    } else {
      if (!f.designations.length) return 'Select at least one designation.';
      if (f.designations.includes(HOD_ID) && !f.branches.length) return 'Choose the branch you head as H.O.D.';
    }
    return '';
  };

  const submit = async e => {
    e.preventDefault();
    const problem = validate(); if (problem) return setErr(problem);
    setErr(''); setBusy(true);
    const email = f.email.trim().toLowerCase();
    const data = role === 'student'
      ? { name: f.name.trim(), regNo: normalizeRegNo(f.regNo), branch: f.branch, semester: Number(f.semester), email, role, status: 'pending' }
      : { name: f.name.trim(), email, designations: f.designations, branches: f.branches, role, status: 'pending' };
    try {
      await runRegistration(async () => {
        let cred, created = false;
        try { cred = await registerAuth(email, f.password); created = true; }
        catch (e) {
          // Email exists: maybe an earlier attempt created the login but not the profile. Try to resume it.
          if (e.code !== 'auth/email-already-in-use') throw e;
          try { cred = await loginAuth(email, f.password); } catch { throw new Error('An account already uses this email. Log in instead, or reset your password.'); }
          if (await getProfile(cred.user.uid)) { await signOut(); throw new Error('This email is already registered. Please log in.'); }
        }
        try { await createProfile(cred.user, data); }
        catch (e) {
          if (created) await removeCurrentUser().catch(() => {}); else await signOut();
          if (role === 'student' && e.code === 'permission-denied') throw new Error('This registration number is already registered, or the database rules are outdated. Check the number, or contact the college office.');
          throw e;
        }
        await sendVerification().catch(() => {});   // resend is available on the next screen
      });
      nav('/verify-email', { replace: true });
    } catch (e) { setErr(authMessage(e)); setBusy(false); }
  };

  if (!role) return (
    <AuthShell title="Create your account" subtitle="Choose how you will use CAMPUS.">
      <div className="role-pick">
        <button onClick={() => setRole('student')}><Icon name="book" size={24} /><b>Student</b><span>Notices, routine, chat, complaints and slots.</span></button>
        <button onClick={() => setRole('faculty')}><Icon name="shield" size={24} /><b>Faculty / Admin</b><span>Manage notices, routines, complaints and services. Needs Principal approval.</span></button>
      </div>
      <p className="switch">Already registered? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );

  return (
    <AuthShell wide title={role === 'student' ? 'Student registration' : 'Faculty / Admin registration'} subtitle={role === 'student' ? 'A faculty member of your branch will approve your account after you verify your email.' : 'The Principal will approve your account after you verify your email.'}>
      <form onSubmit={submit} className="stack">
        <Input label="Full name" required autoComplete="name" value={f.name} onChange={e => set('name', e.target.value)} />
        {role === 'student' && <>
          <Input label="Registration number" required value={f.regNo} onChange={e => set('regNo', e.target.value)} hint={f.regNo ? `Saved as ${normalizeRegNo(f.regNo) || '…'}` : 'Slashes and spaces are converted to dashes.'} />
          <div className="two">
            <Select label="Branch" required value={f.branch} onChange={e => set('branch', e.target.value)}><option value="">Choose branch</option>{branches.map(b => <option key={b.id} value={b.id}>{b.label}</option>)}</Select>
            <Select label="Semester" required value={f.semester} onChange={e => set('semester', e.target.value)}><option value="">Choose</option>{semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}</Select>
          </div>
        </>}
        {role === 'faculty' && <>
          <fieldset className="checks"><legend>Designation <small>(select all that apply)</small></legend>
            {Object.entries(designationGroups).map(([g]) => (
              <div key={g} className="check-group"><b>{g}</b>
                {designations.filter(d => d.group === g).map(d => <label key={d.id} className="check"><input type="checkbox" checked={f.designations.includes(d.id)} onChange={() => toggle('designations', d.id)} />{d.label}</label>)}
              </div>))}
          </fieldset>
          <fieldset className="checks"><legend>Branches <small>(optional)</small></legend>
            <p className="hint">Choose a branch if you teach or head it. You will approve new students of those branches.</p>
            <div className="check-row">{branches.map(b => <label key={b.id} className="check"><input type="checkbox" checked={f.branches.includes(b.id)} onChange={() => toggle('branches', b.id)} />{b.short}</label>)}</div>
          </fieldset>
        </>}
        <Input label="Email" type="email" autoComplete="email" required value={f.email} onChange={e => set('email', e.target.value)} />
        <div className="two">
          <Input label="Password" type="password" autoComplete="new-password" required value={f.password} onChange={e => set('password', e.target.value)} hint="At least 8 characters" />
          <Input label="Confirm password" type="password" autoComplete="new-password" required value={f.confirm} onChange={e => set('confirm', e.target.value)} />
        </div>
        <ErrorNote error={err} />
        <Button type="submit" loading={busy}>Create account</Button>
      </form>
      <button className="link-btn" onClick={() => { setRole(''); setErr(''); }}>Change role</button>
      <p className="switch">Already registered? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}
