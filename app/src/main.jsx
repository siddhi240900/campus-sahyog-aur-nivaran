import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicOnly, NeedsLogin, AppGuard, RoleOnly } from './routes/guards';
import { ToastProvider } from './components/ui/UI';
import { AppShell } from './components/layout/AppShell';
import { applyTheme } from './config/theme';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import { VerifyEmail, AccountStatus } from './pages/auth/AccountStatus';
import Dashboard from './pages/app/Dashboard';
import Notices from './pages/app/Notices';
import Routine from './pages/app/Routine';
import Resources from './pages/app/Resources';
import Chat from './pages/app/Chat';
import Complaints from './pages/app/Complaints';
import QueueLess from './pages/app/QueueLess';
import PaperPulse from './pages/app/PaperPulse';
import Approvals from './pages/app/Approvals';
import Confidential from './pages/app/Confidential';
import ErrorBoundary from './components/ErrorBoundary';
import './styles.css';

applyTheme();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>
              <Route element={<NeedsLogin />}>
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/status" element={<AccountStatus />} />
              </Route>
              <Route path="/app" element={<AppGuard />}>
                <Route element={<AppShell />}>
                  <Route index element={<Dashboard />} />
                  <Route path="notices" element={<Notices />} />
                  <Route path="routine" element={<Routine />} />
                  <Route path="resources" element={<Resources />} />
                  <Route path="chat" element={<Chat />} />
                  <Route path="complaints" element={<Complaints />} />
                  <Route path="queueless" element={<QueueLess />} />
                  <Route path="paperpulse" element={<PaperPulse />} />
                  <Route path="confidential" element={<Confidential />} />
                  <Route path="approvals" element={<RoleOnly roles={['faculty', 'principal']}><Approvals /></RoleOnly>} />
                </Route>
              </Route>
              {/* old links */}
              <Route path="/student/*" element={<Navigate to="/app" replace />} />
              <Route path="/faculty/*" element={<Navigate to="/app" replace />} />
              <Route path="/principal/*" element={<Navigate to="/app" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
