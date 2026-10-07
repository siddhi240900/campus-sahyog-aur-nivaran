import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth, homePath } from '../context/AuthContext';
import { Loading, Button } from '../components/ui/UI';
import { AuthShell } from '../components/layout/AuthShell';
import { signOut } from '../services/auth';

function Gate({ children }) {
  const { ready, error, retry, user } = useAuth();
  if (!ready) return <div className="splash"><img src="/assets/campus-mark.png" alt="" /><Loading text="Loading your campus…" /></div>;
  if (error) return (
    <AuthShell title="Something needs attention" subtitle={error}>
      <div className="stack"><Button onClick={retry}>Try again</Button>{user && <Button variant="outline" onClick={() => signOut()}>Log out</Button>}</div>
    </AuthShell>
  );
  return children;
}

// Logged-out pages (login/register). Signed-in people are sent to the right place.
export function PublicOnly() {
  const a = useAuth();
  return (
    <Gate>
      {a.user && a.profile && !a.registering ? <Navigate to={homePath(a)} replace /> : <Outlet />}
    </Gate>
  );
}

// Pages that need a signed-in user with a profile (verify-email, status).
export function NeedsLogin() {
  const a = useAuth(); const loc = useLocation();
  return (
    <Gate>
      {!a.user ? <Navigate to="/login" replace state={{ from: loc.pathname }} />
        : a.profile ? <Outlet /> : <Navigate to="/login" replace />}
    </Gate>
  );
}

// The main app: verified + approved only.
export function AppGuard() {
  const a = useAuth();
  return (
    <Gate>
      {!a.user ? <Navigate to="/login" replace />
        : !a.profile ? <Navigate to="/login" replace />
        : homePath(a) !== '/app' ? <Navigate to={homePath(a)} replace />
        : <Outlet />}
    </Gate>
  );
}

// Inside the app: limit a page to some roles.
export function RoleOnly({ roles, children }) {
  const { profile } = useAuth();
  return roles.includes(profile.role) ? children : <Navigate to="/app" replace />;
}
