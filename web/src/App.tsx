import type { ReactNode } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Banner } from './components/Banner';
import { DueBanner } from './components/DueBanner';
import { TabBar } from './components/TabBar';
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
      {showTabs && <TabBar />}
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
          </Route>
          <Route
            path="/dose/:doseId"
            element={
              <RequireAuth>
                <Shell showTabs={false}>
                  <M02 />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/medications/new"
            element={
              <RequireAuth>
                <Shell showTabs={false}>
                  <M05 />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/medications/:id/edit"
            element={
              <RequireAuth>
                <Shell showTabs={false}>
                  <M05 />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/family"
            element={
              <RequireAuth>
                <Shell showTabs={false}>
                  <M07 />
                </Shell>
              </RequireAuth>
            }
          />
          <Route
            path="/admin"
            element={
              <RequireAuth>
                <Shell showTabs={false}>
                  <Admin />
                </Shell>
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
