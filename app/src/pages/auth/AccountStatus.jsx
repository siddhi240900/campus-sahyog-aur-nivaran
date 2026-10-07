import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, homePath } from '../../context/AuthContext';
import { sendVerification, signOut, authMessage } from '../../services/auth';
import { AuthShell } from '../../components/layout/AuthShell';
import Icon from '../../components/ui/Icon';
import { Button, ErrorNote } from '../../components/ui/UI';

export function VerifyEmail() {
  const a = useAuth();
  const { user, profile, emailVerified, refreshUser } = a;
  const [left, setLeft] = useState(0);
  const [msg, setMsg] = useState({ text: '', ok: true });
  const [busy, setBusy] = useState(false);

  // Check automatically every few seconds, so the page moves on as soon as the link is clicked.
  useEffect(() => { const t = setInterval(() => refreshUser().catch(() => {}), 4000); return () => clearInterval(t); }, [refreshUser]);
  useEffect(() => { if (left <= 0) return; const t = setTimeout(() => setLeft(left - 1), 1000); return () => clearTimeout(t); }, [left]);

  if (profile?.role === 'principal' || emailVerified) return <Navigate to={homePath(a)} replace />;

  const resend = async () => {
    try { await sendVerification(); setMsg({ ok: true, text: 'Verification email sent. Check inbox and spam.' }); setLeft(60); }
    catch (e) { setMsg({ ok: false, text: authMessage(e) }); setLeft(e.code === 'auth/too-many-requests' ? 120 : 0); }
  };
  const check = async () => {
    setBusy(true);
    try { const ok = await refreshUser(); if (!ok) setMsg({ ok: false, text: 'Not verified yet. Open the link in your email first.' }); }
    catch (e) { setMsg({ ok: false, text: authMessage(e) }); } finally { setBusy(false); }
  };
  return (
    <AuthShell title="Verify your email" subtitle={`We sent a link to ${user?.email}. Open it, then come back here.`}>
      <div className="stack">
        <div className="note"><Icon name="mail" size={18} /><span>This page continues on its own once your email is verified.</span></div>
        {msg.text && (msg.ok ? <div className="note ok">{msg.text}</div> : <ErrorNote error={msg.text} />)}
        <Button onClick={check} loading={busy}>I have verified my email</Button>
        <Button variant="outline" onClick={resend} disabled={left > 0}>{left ? `Resend in ${left}s` : 'Resend verification email'}</Button>
        <button className="link-btn" onClick={() => signOut()}>Log out</button>
      </div>
    </AuthShell>
  );
}

export function AccountStatus() {
  const a = useAuth(); const { profile } = a;
  if (homePath(a) === '/app') return <Navigate to="/app" replace />;
  if (homePath(a) === '/verify-email') return <Navigate to="/verify-email" replace />;
  const faculty = profile.role === 'faculty';
  const copy = {
    pending: [faculty ? 'Waiting for Principal approval' : 'Waiting for faculty approval', faculty ? 'Your email is verified. The Principal must approve every admin account before you get access.' : `Your email is verified. A faculty member of your branch will approve your account soon. You can close this page and log in later.`],
    rejected: ['Request not approved', profile.rejectionReason || 'Please contact the college administration for details.'],
    revoked: ['Access revoked', 'Your access has been withdrawn. Contact the college administration.'],
  }[profile.status] || ['Updating your access', 'Please wait a moment.'];
  return (
    <AuthShell title={copy[0]} subtitle={copy[1]}>
      <div className="stack">
        {profile.status === 'pending' && <div className="note"><Icon name="clock" size={18} /><span>This page updates by itself when you are approved.</span></div>}
        <Button variant="outline" onClick={() => signOut()}>Log out</Button>
      </div>
    </AuthShell>
  );
}
