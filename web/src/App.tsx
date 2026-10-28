import { useState, type ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Banner } from './components/Banner';
import { DueBanner } from './components/DueBanner';
import { TabBar } from './components/TabBar';
import { AdminShortcut } from './components/AdminShortcut';
import { useHealth } from './hooks/useHealth';
import { M01 } from './screens/M01';
import { M02 } from './screens/M02';
import { M03 } from './screens/M03';
import { M04 } from './screens/M04';
import { M05 } from './screens/M05';
import { M06 } from './screens/M06';
import { M07 } from './screens/M07';
import { M08 } from './screens/M08';
import { Admin } from './screens/Admin';
import { Login } from './screens/Login';
import { AuthProvider } from './store/auth';
import { useAuth } from './store/authContext';

function EmailVerificationBanner() {
  const { user, resendVerification, reloadUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!user || user.emailVerified) return null;
  if (user.email.toLowerCase().endsWith('@med.local')) return null;

  async function handleResend() {
    setSending(true);
    setMsg(null);
    try {
      await resendVerification();
      setSent(true);
      setMsg('Đã gửi email xác minh. Vui lòng kiểm tra hộp thư (cả thư rác).');
    } catch (e) {
      setMsg((e as Error).message || 'Không gửi được email xác minh');
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    setMsg(null);
    try {
      await reloadUser();
      setMsg('Đã kiểm tra trạng thái. Nếu bạn đã bấm link xác minh, vui lòng thử đăng nhập lại.');
    } catch (e) {
      setMsg((e as Error).message || 'Không kiểm tra được');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div style={{ background: '#fff3cd', color: '#664d03', padding: '10px 16px', textAlign: 'center', fontSize: 'calc(15px * var(--font-mult))', borderBottom: '1px solid #ffecb5' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <span>Tài khoản chưa xác minh email. Vui lòng kiểm tra hộp thư để xác minh tài khoản.</span>
        <button type="button" onClick={handleResend} disabled={sending || sent} style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontWeight: 700, cursor: 'pointer' }}>
          {sent ? 'Đã gửi lại' : sending ? 'Đang gửi...' : 'Gửi lại email xác minh'}
        </button>
        <button type="button" onClick={handleCheck} disabled={checking} style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontWeight: 700, cursor: 'pointer' }}>
          {checking ? 'Đang kiểm tra...' : 'Tôi đã xác minh'}
        </button>
      </div>
      {msg && <div style={{ marginTop: 6 }}>{msg}</div>}
    </div>
  );
}

/** Chưa đăng nhập → về /login, giữ đường dẫn đích để quay lại sau */
function RequireAuth({ children }: { children: ReactNode }) {
  const { initializing, user } = useAuth();
  const location = useLocation();

  if (initializing) {
    return (
      <main className="page page--task">
        <div role="status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 0' }}>
          <div className="spinner" aria-hidden="true" />
          <p>Đang kiểm tra phiên đăng nhập…</p>
        </div>
      </main>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

/** Khung có điều hướng: 5 màn hình chính hiện tab; màn tác vụ ẩn tab */
function Shell({ children, showTabs = true }: { children: ReactNode; showTabs?: boolean }) {
  const { online } = useHealth();
  return (
    <div className="app-shell">
      <Banner online={online} />
      <EmailVerificationBanner />
      {showTabs && <TabBar />}
      <AdminShortcut />
      <main className={showTabs ? 'page' : 'page page--task'}>{children}</main>
      <DueBanner />
    </div>
  );
}

/** 5 màn hình chính (M01, M03, M04, M06, M08): hiện tab; màn tác vụ ẩn tab */
function TabLayout() {
  return (
    <Shell>
      <Outlet />
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <RequireAuth>
                <TabLayout />
              </RequireAuth>
            }
          >
            <Route path="/" element={<M01 />} />
            <Route path="/schedule" element={<M03 />} />
            <Route path="/medications" element={<M04 />} />
            <Route path="/history" element={<M06 />} />
            <Route path="/settings" element={<M08 />} />
            <Route path="/dose/:id" element={<M02 />} />
            <Route path="/dose/new" element={<M05 />} />
            <Route path="/dose/:id/edit" element={<M05 />} />
            <Route path="/family/schedule/:ownerId" element={<M07 />} />
          </Route>
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Admin />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
