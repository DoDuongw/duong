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
  setAdminUserRole,
} from '../services/endpoints';
import type {
  AdminAuditItem,
  AdminFailedNotification,
  AdminSummary,
  AdminUserItem,
  AdminUserPage,
  UserRole,
} from '../types';
import { formatTimezoneLabel } from '../utils/dateTime';

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
  admin_set_role: 'Đổi vai trò',
  create: 'Tạo mới',
  update: 'Cập nhật',
  delete: 'Xóa',
  revoke: 'Thu hồi',
  discontinue: 'Ngừng thuốc',
  confirm: 'Xác nhận uống',
  cannot_take: 'Không thể uống',
  snooze: 'Nhắc lại',
  accept_invite: 'Chấp nhận lời mời',
  update_permissions: 'Đổi quyền xem',
  archive: 'Lưu trữ lịch',
  update_version: 'Đổi lịch uống',
};

const ENTITY_LABEL: Record<string, string> = {
  user: 'Tài khoản',
  dose: 'Lần uống thuốc',
  invite: 'Lời mời kết nối',
  connection: 'Kết nối người thân',
  medication: 'Thuốc',
  schedule: 'Lịch uống thuốc',
};

const ROLE_LABEL: Record<UserRole, string> = {
  user: 'Người dùng',
  manager: 'Quản lý',
  admin: 'Quản trị',
};

const NOTIFICATION_ERROR_LABEL: Record<string, string> = {
  no_active_device: 'Thiết bị hiện không hoạt động',
  token_invalid: 'Mã nhận thông báo không còn hiệu lực',
  send_failed: 'Gửi thông báo thất bại',
  FIREBASE_NOT_CONFIGURED: 'Chưa cấu hình dịch vụ gửi thông báo',
  'messaging/registration-token-not-registered': 'Thiết bị đã hủy đăng ký nhận thông báo',
  'messaging/invalid-registration-token': 'Mã nhận thông báo không hợp lệ',
  'messaging/invalid-argument': 'Thông tin gửi thông báo không hợp lệ',
  'messaging/authentication-error': 'Dịch vụ thông báo từ chối xác thực',
  'messaging/third-party-auth-error': 'Dịch vụ thông báo gặp lỗi xác thực',
  'messaging/internal-error': 'Dịch vụ thông báo gặp lỗi nội bộ',
  'messaging/server-unavailable': 'Dịch vụ thông báo tạm thời không khả dụng',
  'messaging/message-rate-exceeded': 'Gửi thông báo quá nhanh, vui lòng thử lại',
  'messaging/device-message-rate-exceeded': 'Thiết bị nhận quá nhiều thông báo',
};

function notificationErrorLabel(item: Pick<AdminFailedNotification, 'error' | 'errorCode'>): string {
  const code = item.errorCode ?? item.error;
  if (!code) return 'Không rõ nguyên nhân';
  if (NOTIFICATION_ERROR_LABEL[code]) return NOTIFICATION_ERROR_LABEL[code];
  // API mới đã trả nhãn tiếng Việt trong `error`; chỉ dùng mã để tra cứu.
  if (item.error && (item.error !== code || /\s/.test(item.error))) return item.error;
  if (code.startsWith('messaging/')) {
    return 'Dịch vụ thông báo gặp lỗi. Kiểm tra cấu hình gửi thông báo.';
  }
  return 'Gửi thông báo thất bại. Kiểm tra thiết bị và cấu hình gửi thông báo.';
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function displayName(user: Pick<AdminUserItem, 'displayName' | 'phone' | 'id'>): string {
  return user.displayName?.trim() || user.phone || `Người dùng ${user.id.slice(-6)}`;
}

function initials(user: AdminUserItem): string {
  const name = user.displayName?.trim();
  if (name) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
  return user.phone?.slice(-2) ?? '?';
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return 'Tài khoản của bạn không có quyền thực hiện thao tác này.';
    return err.message;
  }
  return 'Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.';
}

/**
 * Khu vực vận hành (route /admin) — KHÔNG phải màn hình M09.
 *
 * Quản lý: xem số liệu/danh sách, khóa/mở tài khoản người dùng.
 * Quản trị: thêm đặt lại mật khẩu và đổi vai trò.
 * Không hiển thị nội dung y tế (tên thuốc, lý do không uống) để giảm rủi ro riêng tư.
 */
export function Admin() {
  const { profile } = useAuth();
  const role = profile?.role;
  const isAdmin = role === 'admin';
  const canAccess = role === 'admin' || role === 'manager';

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUserPage | null>(null);
  const [notifications, setNotifications] = useState<AdminFailedNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
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
  const [roleTarget, setRoleTarget] = useState<AdminUserItem | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>('user');
  const [roleError, setRoleError] = useState<string | null>(null);
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

  const loadAll = useCallback(async () => {
    await Promise.all([
      loadSummary(),
      loadUsers(q, page),
      getAdminNotifications(20)
        .then(setNotifications)
        .catch((err) => setError(errorMessage(err))),
      getAdminAuditLogs(20)
        .then(setAuditLogs)
        .catch((err) => setError(errorMessage(err))),
    ]);
    setLastUpdated(new Date());
  }, [loadSummary, loadUsers, q, page]);

  useEffect(() => {
    if (!canAccess) return;
    // oxlint-disable-next-line react/set-state-in-effect -- tải dữ liệu vận hành khi mở trang
    void loadAll();
  }, [canAccess, loadAll]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } finally {
      setRefreshing(false);
    }
  }, [loadAll]);

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);
    setError(null);
    setPage(1);
    setQ(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput('');
    setQ('');
    setPage(1);
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

  function openRole(user: AdminUserItem) {
    setRoleTarget(user);
    setNextRole(user.role);
    setRoleError(null);
    setError(null);
    setNotice(null);
  }

  async function submitRole(event: React.FormEvent) {
    event.preventDefault();
    if (!roleTarget) return;
    setBusy(true);
    setRoleError(null);
    try {
      await setAdminUserRole(roleTarget.id, nextRole);
      setNotice(
        `Đã đổi vai trò của ${displayName(roleTarget)} thành “${ROLE_LABEL[nextRole]}”. Người dùng cần tải lại trang để thấy thay đổi.`,
      );
      setRoleTarget(null);
      await refresh();
    } catch (err) {
      setRoleError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!profile) {
    return (
      <main className="page page--task admin-page">
        <p className="admin-loading" role="status">
          <span className="spinner" aria-hidden="true" /> Đang tải hồ sơ…
        </p>
      </main>
    );
  }

  if (!canAccess) {
    return (
      <main className="page page--task admin-page">
        <div className="admin-denied">
          <p className="admin-eyebrow">Quyền truy cập</p>
          <h1>Khu vực vận hành</h1>
          <Notice tone="error">Tài khoản của bạn không có quyền truy cập khu vực này.</Notice>
          <Link to="/" className="admin-back">
            ← Về trang chủ
          </Link>
        </div>
      </main>
    );
  }

  const totalPages = users ? Math.max(1, Math.ceil(users.total / users.pageSize)) : 1;
  const remainingUnconfirmed = summary ? Math.max(0, summary.doses24h - summary.confirmed24h) : 0;

  return (
    <main className="page page--task admin-page">
      <header className="admin-head">
        <div className="admin-head__main">
          <p className="admin-eyebrow">Khu vực vận hành</p>
          <h1>{isAdmin ? 'Quản trị hệ thống' : 'Khu vực vận hành'}</h1>
          <p className="admin-head__desc">
            {isAdmin
              ? 'Theo dõi hoạt động, khóa tài khoản, đặt lại mật khẩu và phân quyền. Không hiển thị nội dung y tế chi tiết.'
              : 'Theo dõi hoạt động và khóa/mở tài khoản người dùng. Không hiển thị nội dung y tế chi tiết.'}
          </p>
        </div>
        <div className="admin-head__actions">
          <span className="admin-updated">
            <span className="admin-live" aria-hidden="true" />
            {lastUpdated ? `Cập nhật ${formatTime(lastUpdated)}` : 'Đang cập nhật…'}
          </span>
          <Button variant="ghost" loading={refreshing} onClick={() => void refresh()}>
            Tải lại
          </Button>
          <Link to="/" className="admin-back">
            ← Về ứng dụng
          </Link>
        </div>
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

      <section className="admin-overview" aria-labelledby="admin-overview-title">
        <div className="admin-overview__head">
          <div>
            <p className="admin-kicker">Tổng quan vận hành</p>
            <h2 id="admin-overview-title">24 giờ qua</h2>
          </div>
          <span className="admin-overview__note">Số liệu tổng hợp · Không có nội dung y tế chi tiết</span>
        </div>

        {summary ? (
          <div className="admin-stats">
            <div className="admin-stat admin-stat--primary">
              <span className="admin-stat__label">Người dùng</span>
              <strong className="admin-stat__value">{summary.users}</strong>
              <span className="admin-stat__hint">Tài khoản đã đăng ký</span>
            </div>
            <div className="admin-stat admin-stat--danger">
              <span className="admin-stat__label">Tài khoản bị khóa</span>
              <strong className="admin-stat__value">{summary.disabledUsers}</strong>
              <span className="admin-stat__hint">Cần hỗ trợ mở khóa</span>
            </div>
            <div className="admin-stat admin-stat--primary">
              <span className="admin-stat__label">Thuốc đang dùng</span>
              <strong className="admin-stat__value">{summary.activeMedications}</strong>
              <span className="admin-stat__hint">Đang hoạt động</span>
            </div>
            <div className="admin-stat admin-stat--neutral">
              <span className="admin-stat__label">Liều trong 24 giờ</span>
              <strong className="admin-stat__value">{summary.doses24h}</strong>
              <span className="admin-stat__hint">{summary.confirmed24h} đã xác nhận</span>
            </div>
            <div className="admin-stat admin-stat--warning">
              <span className="admin-stat__label">Chưa/không xác nhận</span>
              <strong className="admin-stat__value">{remainingUnconfirmed}</strong>
              <span className="admin-stat__hint">Cần theo dõi</span>
            </div>
            <div className="admin-stat admin-stat--success">
              <span className="admin-stat__label">Kết nối người thân</span>
              <strong className="admin-stat__value">{summary.activeConnections}</strong>
              <span className="admin-stat__hint">Đang hoạt động</span>
            </div>
            <div className="admin-stat admin-stat--success">
              <span className="admin-stat__label">Thiết bị nhận tin</span>
              <strong className="admin-stat__value">{summary.activeDevices}</strong>
              <span className="admin-stat__hint">Đang bật thông báo</span>
            </div>
            <div className="admin-stat admin-stat--danger">
              <span className="admin-stat__label">Lỗi gửi thông báo</span>
              <strong className="admin-stat__value">{summary.failedNotifications24h}</strong>
              <span className="admin-stat__hint">Kiểm tra thiết bị/cấu hình</span>
            </div>
          </div>
        ) : (
          <p className="admin-loading" role="status">
            <span className="spinner" aria-hidden="true" /> Đang tải số liệu…
          </p>
        )}
      </section>

      <div className="admin-dashboard">
        <div className="admin-dashboard__main">
          <Section
            title="Người dùng"
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
                {q && (
                  <button type="button" className="admin-search__clear" onClick={clearSearch}>
                    Xóa lọc
                  </button>
                )}
              </div>
            </form>

            {loadingUsers && (
              <p className="admin-list-status" role="status">
                <span className="spinner" aria-hidden="true" /> Đang tải danh sách…
              </p>
            )}

            {!loadingUsers && users && users.items.length === 0 && (
              <div className="admin-empty">
                <strong>Không tìm thấy người dùng phù hợp.</strong>
                <span>Thử tên khác hoặc số điện thoại đầy đủ.</span>
              </div>
            )}

            {!loadingUsers && users && users.items.length > 0 && (
              <>
                <ul className="admin-users">
                  {users.items.map((user) => (
                    <li key={user.id} className={`admin-user${user.disabled ? ' admin-user--locked' : ''}`}>
                      <div className="admin-user__head">
                        <div className="admin-user__identity">
                          <span className="admin-avatar" aria-hidden="true">
                            {initials(user)}
                          </span>
                          <div>
                            <h3 className="admin-user__name">{displayName(user)}</h3>
                            <p className="admin-user__contact">
                              {user.phone ?? 'Chưa có SĐT'} · {user.email ?? 'Chưa có email'}
                            </p>
                          </div>
                        </div>
                        <div className="admin-user__badges">
                          {user.role === 'admin' && <span className="badge badge--admin">Quản trị</span>}
                          {user.role === 'manager' && <span className="badge badge--manager">Quản lý</span>}
                          {user.disabled ? (
                            <span className="badge badge--locked">Đã khóa</span>
                          ) : (
                            <span className="badge badge--active">Đang hoạt động</span>
                          )}
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

                      <div className="admin-user__footer">
                        <p className="admin-user__meta">
                          Tạo ngày {formatDateTime(user.createdAt)} · Múi giờ{' '}
                          {formatTimezoneLabel(user.timezone)}
                        </p>

                        <div className="admin-user__actions">
                          {(isAdmin ? user.id !== profile.id : user.role === 'user') && (
                            <Button
                              variant={user.disabled ? 'secondary' : 'danger'}
                              onClick={() => setLockTarget(user)}
                              aria-label={`${user.disabled ? 'Mở khóa' : 'Khóa'} tài khoản ${displayName(user)}`}
                            >
                              {user.disabled ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            </Button>
                          )}
                          {isAdmin && (
                            <Button
                              variant="secondary"
                              onClick={() => openReset(user)}
                              aria-label={`Đặt lại mật khẩu cho ${displayName(user)}`}
                            >
                              Đặt lại mật khẩu
                            </Button>
                          )}
                          {isAdmin && user.id !== profile.id && (
                            <Button
                              variant="secondary"
                              onClick={() => openRole(user)}
                              aria-label={`Đổi vai trò cho ${displayName(user)}`}
                            >
                              Đổi vai trò
                            </Button>
                          )}
                          {!isAdmin && user.role !== 'user' && (
                            <span className="admin-user__meta">
                              Chỉ quản trị viên mới thao tác được tài khoản này.
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <nav className="admin-pager" aria-label="Phân trang người dùng">
                  <button
                    type="button"
                    className="admin-pager__btn"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    ← Trang trước
                  </button>
                  <span className="admin-pager__info">
                    Trang {users.page}/{totalPages} · {users.total} người dùng
                  </span>
                  <button
                    type="button"
                    className="admin-pager__btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Trang sau →
                  </button>
                </nav>
              </>
            )}
          </Section>
        </div>

        <aside className="admin-dashboard__side">
          <Section
            title="Lỗi gửi thông báo"
            description="Các lần gửi thông báo đẩy thất bại gần đây — giúp phát hiện thiết bị hết hiệu lực hoặc cấu hình sai."
          >
            {notifications.length === 0 ? (
              <div className="admin-empty">
                <strong>Không có lỗi gửi thông báo.</strong>
                <span>Hệ thống đang gửi thông báo bình thường.</span>
              </div>
            ) : (
              <ul className="admin-log">
                {notifications.map((item) => (
                  <li key={item.id} className="admin-log__row admin-log__row--error">
                    <div className="admin-log__head">
                      <strong>{KIND_LABEL[item.kind] ?? 'Thông báo'}</strong>
                      <time className="admin-log__time" dateTime={item.sentAt}>
                        {formatDateTime(item.sentAt)}
                      </time>
                    </div>
                    <p className="admin-log__error">{notificationErrorLabel(item)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section
            title="Nhật ký thao tác"
            description="Thao tác gần đây, gần nhất trước. Tên hiển thị là tài khoản bị tác động."
          >
            {auditLogs.length === 0 ? (
              <div className="admin-empty">
                <strong>Chưa có thao tác nào.</strong>
                <span>Nhật ký sẽ xuất hiện khi có thay đổi tài khoản.</span>
              </div>
            ) : (
              <ul className="admin-log">
                {auditLogs.map((item) => (
                  <li key={item.id} className="admin-log__row admin-log__row--audit">
                    <div className="admin-log__head">
                      <strong>{ACTION_LABEL[item.action] ?? 'Thao tác khác'}</strong>
                      <time className="admin-log__time" dateTime={item.createdAt}>
                        {formatDateTime(item.createdAt)}
                      </time>
                    </div>
                    <p className="admin-log__actor">
                      Đối tượng: {item.actorName ?? item.actorPhone ?? 'Không rõ'} ·{' '}
                      {ENTITY_LABEL[item.entity] ?? 'Không xác định'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </aside>
      </div>

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

      {roleTarget && (
        <div className="modal-backdrop" onClick={() => !busy && setRoleTarget(null)}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-role-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal__head">
              <h2 className="modal__title" id="admin-role-title">
                Đổi vai trò
              </h2>
              <button
                type="button"
                className="modal__close"
                aria-label="Đóng"
                onClick={() => !busy && setRoleTarget(null)}
              >
                ✕
              </button>
            </div>
            <p className="muted">Tài khoản: {displayName(roleTarget)}</p>
            <form onSubmit={submitRole} className="stack">
              <label>
                Vai trò
                <select
                  className="select"
                  value={nextRole}
                  onChange={(event) => setNextRole(event.target.value as UserRole)}
                >
                  <option value="user">Người dùng</option>
                  <option value="manager">Quản lý</option>
                  <option value="admin">Quản trị</option>
                </select>
              </label>
              <p className="muted admin-hint">
                Quản lý xem số liệu và khóa/mở tài khoản người dùng. Quản trị có toàn quyền khu vực này. Cả hai đều
                không xem nội dung y tế chi tiết.
              </p>
              {roleError && <Notice tone="error">{roleError}</Notice>}
              <div className="admin-modal-actions">
                <Button variant="ghost" onClick={() => setRoleTarget(null)} disabled={busy}>
                  Hủy
                </Button>
                <Button type="submit" loading={busy}>
                  Lưu vai trò
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
