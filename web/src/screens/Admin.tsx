import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { useAuth } from '../store/authContext';
import { ApiError } from '../services/api';
import {
  adminResetPassword,
  getAdminAuditLogs,
  getAdminNotifications,
  getAdminSummary,
  getAdminUsers,
  setAdminUserDisabled,
} from '../services/endpoints';
import type {
  AdminAuditItem,
  AdminFailedNotification,
  AdminSummary,
  AdminUserItem,
  AdminUserPage,
} from '../types';

const PAGE_SIZE = 10;

const KIND_LABEL: Record<string, string> = {
  scheduled_reminder: 'Nhắc uống thuốc',
  overdue: 'Quá giờ',
  snooze: 'Nhắc lại',
  relative_alert: 'Báo người thân',
  sync: 'Đồng bộ',
};

const ACTION_LABEL: Record<string, string> = {
  admin_lock: 'Khóa tài khoản',
  admin_unlock: 'Mở khóa tài khoản',
  admin_reset_password: 'Đặt lại mật khẩu',
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  revoke: 'Thu hồi',
  discontinue: 'Ngừng thuốc',
  confirm: 'Xác nhận uống',
  snooze: 'Nhắc lại',
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function displayName(user: Pick<AdminUserItem, 'displayName' | 'phone' | 'id'>): string {
  return user.displayName?.trim() || user.phone || `Người dùng ${user.id.slice(-6)}`;
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Tài khoản của bạn không có quyền quản trị.';
    return err.message;
  }
  return 'Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.';
}

/**
 * Khu vực quản trị (route /admin) — KHÔNG phải màn hình M09.
 *
 * Chỉ đọc + khóa/mở tài khoản + đặt lại mật khẩu. Không hiển thị nội dung y tế
 * (tên thuốc, lý do không uống) để giảm rủi ro riêng tư.
 */
export function Admin() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUserPage | null>(null);
  const [notifications, setNotifications] = useState<AdminFailedNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const [lockTarget, setLockTarget] = useState<AdminUserItem | null>(null);
  const [resetTarget, setResetTarget] = useState<AdminUserItem | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      setSummary(await getAdminSummary());
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  const loadUsers = useCallback(async (query: string, targetPage: number) => {
    setLoadingUsers(true);
    try {
      setUsers(await getAdminUsers({ q: query || undefined, page: targetPage, pageSize: PAGE_SIZE }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    // oxlint-disable-next-line react/set-state-in-effect -- tải dữ liệu quản trị khi mở trang
    void loadSummary();
    void loadUsers(q, page);
    void getAdminNotifications(20)
      .then(setNotifications)
      .catch((err) => setError(errorMessage(err)));
    void getAdminAuditLogs(20)
      .then(setAuditLogs)
      .catch((err) => setError(errorMessage(err)));
  }, [isAdmin, loadSummary, loadUsers, q, page]);

  const refresh = useCallback(async () => {
    await Promise.all([loadSummary(), loadUsers(q, page)]);
  }, [loadSummary, loadUsers, q, page]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setError(null);
    setPage(1);
    setQ(searchInput.trim());
  }

  async function confirmLock() {
    if (!lockTarget) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const nextDisabled = !lockTarget.disabled;
      await setAdminUserDisabled(lockTarget.id, nextDisabled);
      setNotice(
        nextDisabled
          ? `Đã khóa tài khoản ${displayName(lockTarget)}. Người này không thể đăng nhập cho đến khi mở khóa.`
          : `Đã mở khóa tài khoản ${displayName(lockTarget)}.`,
      );
      setLockTarget(null);
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function openReset(user: AdminUserItem) {
    setResetTarget(user);
    setPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setError(null);
    setNotice(null);
  }

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (!resetTarget) return;
    if (password.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Hai lần nhập mật khẩu không khớp.');
      return;
    }
    setBusy(true);
    setPasswordError(null);
    try {
      await adminResetPassword(resetTarget.id, password);
      setNotice(
        `Đã đặt lại mật khẩu cho ${displayName(resetTarget)}. Hãy gửi mật khẩu mới cho người dùng qua kênh riêng (điện thoại/gặp trực tiếp).`,
      );
      setResetTarget(null);
      setPassword('');
      setConfirmPassword('');
      await refresh();
    } catch (err) {
      setPasswordError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <main className="page page--task">
        <p role="status">Đang tải hồ sơ…</p>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="page page--task">
        <h1>Quản trị hệ thống</h1>
        <Notice tone="error">Tài khoản của bạn không có quyền truy cập khu vực này.</Notice>
        <Link to="/">← Về trang chủ</Link>
      </main>
    );
  }

  const totalPages = users ? Math.max(1, Math.ceil(users.total / users.pageSize)) : 1;
  const remainingUnconfirmed = summary ? Math.max(0, summary.doses24h - summary.confirmed24h) : 0;

  return (
    <main className="page page--task admin-page">
      <header className="admin-head">
        <div>
          <p className="admin-eyebrow">Khu vực vận hành</p>
          <h1>Quản trị hệ thống</h1>
          <p className="muted admin-head__desc">
            Theo dõi hoạt động, khóa tài khoản và đặt lại mật khẩu. Không hiển thị nội dung y tế chi tiết.
          </p>
        </div>
        <Link to="/" className="admin-back">
          ← Về ứng dụng
        </Link>
      </header>

      {error && (
        <Notice tone="error" icon={false}>
          {error}
        </Notice>
      )}
      {notice && (
        <Notice tone="success" icon={false}>
          {notice}
        </Notice>
      )}

      <Section title="Tổng quan 24 giờ qua" icon="📊" description="Số liệu vận hành, không gồm tên thuốc hay ghi chú y tế.">
        {summary ? (
          <div className="stat-grid">
            <div className="stat">
              <span className="stat__value">{summary.users}</span>
              <span className="stat__label">Người dùng</span>
            </div>
            <div className="stat">
              <span className="stat__value">{summary.disabledUsers}</span>
              <span className="stat__label">Tài khoản bị khóa</span>
            </div>
            <div className="stat">
              <span className="stat__value">{summary.activeMedications}</span>
              <span className="stat__label">Thuốc đang dùng</span>
            </div>
            <div className="stat">
              <span className="stat__value">{summary.doses24h}</span>
              <span className="stat__label">Liều trong 24 giờ</span>
            </div>
            <div className="stat">
              <span className="stat__value">{remainingUnconfirmed}</span>
              <span className="stat__label">Chưa/không xác nhận</span>
            </div>
            <div className="stat">
              <span className="stat__value">{summary.activeConnections}</span>
              <span className="stat__label">Kết nối người thân</span>
            </div>
            <div className="stat">
              <span className="stat__value">{summary.activeDevices}</span>
              <span className="stat__label">Thiết bị nhận tin</span>
            </div>
            <div className="stat">
              <span className="stat__value">{summary.failedNotifications24h}</span>
              <span className="stat__label">Push lỗi</span>
            </div>
          </div>
        ) : (
          <p role="status">Đang tải số liệu…</p>
        )}
      </Section>

      <Section
        title="Người dùng"
        icon="👥"
        description="Tìm theo tên hoặc số điện thoại. Chỉ số đếm — không có nội dung y tế."
      >
        <form className="admin-search" onSubmit={submitSearch} role="search">
          <label className="admin-search__label" htmlFor="admin-search-input">
            Tìm người dùng
          </label>
          <div className="admin-search__row">
            <input
              id="admin-search-input"
              className="input"
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Ví dụ: Bà Lan hoặc 0912345678"
            />
            <Button type="submit" variant="secondary">
              Tìm
            </Button>
          </div>
        </form>

        {loadingUsers && <p role="status">Đang tải danh sách…</p>}

        {!loadingUsers && users && users.items.length === 0 && (
          <p className="muted">Không tìm thấy người dùng phù hợp.</p>
        )}

        {!loadingUsers && users && users.items.length > 0 && (
          <>
            <ul className="admin-users">
              {users.items.map((user) => (
                <li key={user.id} className={`admin-user${user.disabled ? ' admin-user--locked' : ''}`}>
                  <div className="admin-user__head">
                    <div>
                      <h3 className="admin-user__name">{displayName(user)}</h3>
                      <p className="admin-user__contact">
                        {user.phone ?? 'Chưa có SĐT'} · {user.email ?? 'Chưa có email'}
                      </p>
                    </div>
                    <div className="admin-user__badges">
                      {user.role === 'admin' && <span className="badge badge--admin">Quản trị</span>}
                      {user.disabled && <span className="badge badge--locked">Đã khóa</span>}
                    </div>
                  </div>

                  <dl className="admin-metrics">
                    <div>
                      <dt>Thuốc đang dùng</dt>
                      <dd>{user.medicationsActive}</dd>
                    </div>
                    <div>
                      <dt>Liều 7 ngày</dt>
                      <dd>{user.doses7d}</dd>
                    </div>
                    <div>
                      <dt>Đã xác nhận</dt>
                      <dd>{user.confirmed7d}</dd>
                    </div>
                    <div>
                      <dt>Thiết bị</dt>
                      <dd>{user.devicesActive}</dd>
                    </div>
                  </dl>

                  <p className="admin-user__meta">
                    Tạo ngày {formatDateTime(user.createdAt)} · Múi giờ {user.timezone}
                  </p>

                  <div className="admin-user__actions">
                    <Button
                      variant={user.disabled ? 'secondary' : 'danger'}
                      onClick={() => setLockTarget(user)}
                      aria-label={`${user.disabled ? 'Mở khóa' : 'Khóa'} tài khoản ${displayName(user)}`}
                    >
                      {user.disabled ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => openReset(user)}
                      aria-label={`Đặt lại mật khẩu cho ${displayName(user)}`}
                    >
                      Đặt lại mật khẩu
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            <nav className="admin-pager" aria-label="Phân trang người dùng">
              <Button
                variant="ghost"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                ← Trang trước
              </Button>
              <span className="admin-pager__info">
                Trang {users.page}/{totalPages} · {users.total} người dùng
              </span>
              <Button
                variant="ghost"
                disabled={page >= totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Trang sau →
              </Button>
            </nav>
          </>
        )}
      </Section>

      <Section
        title="Lỗi gửi thông báo"
        icon="🔔"
        description="Các lần gửi Web Push thất bại gần đây — giúp phát hiện token hết hiệu lực hoặc cấu hình sai."
      >
        {notifications.length === 0 ? (
          <p className="muted">Không có lỗi gửi thông báo.</p>
        ) : (
          <ul className="admin-log">
            {notifications.map((item) => (
              <li key={item.id} className="admin-log__row">
                <div>
                  <strong>{KIND_LABEL[item.kind] ?? item.kind}</strong>
                  <span className="admin-log__time">{formatDateTime(item.sentAt)}</span>
                </div>
                <p className="admin-log__error">{item.error ?? 'Không rõ lỗi'}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section
        title="Nhật ký thao tác"
        icon="📝"
        description="Thao tác gần đây, gần nhất trước. Tên hiển thị là tài khoản bị tác động."
      >
        {auditLogs.length === 0 ? (
          <p className="muted">Chưa có thao tác nào.</p>
        ) : (
          <ul className="admin-log">
            {auditLogs.map((item) => (
              <li key={item.id} className="admin-log__row">
                <div>
                  <strong>{ACTION_LABEL[item.action] ?? item.action}</strong>
                  <span className="admin-log__time">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="admin-log__actor">
                  Đối tượng: {item.actorName ?? item.actorPhone ?? 'Không rõ'} · {item.entity}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {lockTarget && (
        <div className="modal-backdrop" onClick={() => !busy && setLockTarget(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-lock-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__head">
              <h2 className="modal__title" id="admin-lock-title">
                {lockTarget.disabled ? 'Mở khóa tài khoản?' : 'Khóa tài khoản?'}
              </h2>
              <button
                type="button"
                className="modal__close"
                aria-label="Đóng"
                onClick={() => !busy && setLockTarget(null)}
              >
                ✕
              </button>
            </div>
            <p>
              {lockTarget.disabled
                ? `${displayName(lockTarget)} sẽ đăng nhập và sử dụng ứng dụng lại bình thường.`
                : `${displayName(lockTarget)} sẽ bị đăng xuất và không thể đăng nhập cho đến khi bạn mở khóa.`}
            </p>
            <div className="admin-modal-actions">
              <Button variant="ghost" onClick={() => setLockTarget(null)} disabled={busy}>
                Hủy
              </Button>
              <Button variant={lockTarget.disabled ? 'primary' : 'danger'} loading={busy} onClick={confirmLock}>
                {lockTarget.disabled ? 'Mở khóa' : 'Khóa tài khoản'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {resetTarget && (
        <div className="modal-backdrop" onClick={() => !busy && setResetTarget(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-reset-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__head">
              <h2 className="modal__title" id="admin-reset-title">
                Đặt lại mật khẩu
              </h2>
              <button
                type="button"
                className="modal__close"
                aria-label="Đóng"
                onClick={() => !busy && setResetTarget(null)}
              >
                ✕
              </button>
            </div>
            <p className="muted">Tài khoản: {displayName(resetTarget)}</p>
            <form onSubmit={submitReset} className="stack">
              <label>
                Mật khẩu mới (ít nhất 8 ký tự)
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              <label>
                Nhập lại mật khẩu mới
                <input
                  className="input"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>
              {passwordError && <Notice tone="error">{passwordError}</Notice>}
              <p className="muted admin-hint">
                Sau khi đặt lại, hãy gửi mật khẩu mới cho người dùng qua điện thoại hoặc gặp trực tiếp. Không gửi qua
                nhóm công khai.
              </p>
              <div className="admin-modal-actions">
                <Button variant="ghost" onClick={() => setResetTarget(null)} disabled={busy}>
                  Hủy
                </Button>
                <Button type="submit" loading={busy}>
                  Đặt lại mật khẩu
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
