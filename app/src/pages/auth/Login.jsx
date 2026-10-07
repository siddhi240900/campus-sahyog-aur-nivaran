import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { loginAuth, resetPassword, authMessage, signOut } from '../../services/auth';
import { useAuth } from '../../context/AuthContext';
import { AuthShell } from '../../components/layout/AuthShell';
import { Button, Input, ErrorNote } from '../../components/ui/UI';
import { markRulesPending, clearRulesPending } from '../../components/layout/RulesNotice';

export default function Login() {
  const { profileMissing, user, registering } = useAuth();
  const [f, setF] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ text: '', ok: false });

  // Signed in but no profile (e.g. registration was interrupted): explain and sign out cleanly.
  useEffect(() => {
    if (user && profileMissing && !registering) {
      setMsg({ ok: false, text: 'We could not find your CAMPUS profile. Please register again with the same email and password to finish setting up.' });
      signOut();
    }
  }, [user, profileMissing, registering]);

  const submit = async e => {
    e.preventDefault(); setBusy(true); setMsg({ text: '' });
    markRulesPending();   // the student rules notice shows once after every successful login
    try { await loginAuth(f.email.trim(), f.password); /* PublicOnly redirects once the profile loads */ }
    catch (err) { clearRulesPending(); setMsg({ ok: false, text: authMessage(err) }); setBusy(false); }
  };
  const forgot = async () => {
    if (!f.email.trim()) return setMsg({ ok: false, text: 'Type your email above first, then choose “Forgot password”.' });
    try { await resetPassword(f.email.trim()); setMsg({ ok: true, text: 'Password reset email sent. Check your inbox and spam folder.' }); }
    catch (err) { setMsg({ ok: false, text: authMessage(err) }); }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your CAMPUS account.">
      <form onSubmit={submit} className="stack">
        <Input label="Email" type="email" autoComplete="email" required value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <Input label="Password" type="password" autoComplete="current-password" required value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        <button type="button" className="link-btn" onClick={forgot}>Forgot password?</button>
        {msg.text && (msg.ok ? <div className="note ok">{msg.text}</div> : <ErrorNote error={msg.text} />)}
        <Button type="submit" loading={busy}>Log in</Button>
      </form>
      <p className="switch">New to CAMPUS? <Link to="/register">Create an account</Link></p>
    </AuthShell>
  );
}
