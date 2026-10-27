import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { Text } from '../components/Text';
import { useAuth } from '../store/authContext';
import { applyFontScale, FONT_SCALE_LABEL, readFontScale, type FontScale } from '../utils/fontScale';
import { formatTimezoneLabel } from '../utils/dateTime';
import { isSoundEnabled, setSoundEnabled } from '../utils/sound';
import { isSpeechEnabled, setSpeechEnabled, speechSupported } from '../utils/speech';
import { isValidAddress, isValidPhone, phoneFromInternalEmail } from '../utils/phone';
import { ApiError } from '../services/api';
import {
  listFamilyConnections,
  updateFamilyPermissions,
  updateNotificationSettings,
  updateProfile,
} from '../services/endpoints';
import {
  currentPushToken,
  enableWebPush,
  isIosSafari,
  isStandalone,
  type PushSetupResult,
} from '../services/messaging';
import type { FamilyConnectionItem } from '../types';

const SNOOZE_MINUTE_OPTIONS = [5, 10, 15, 20, 30];
const SNOOZE_MAX_OPTIONS = [1, 2, 3, 4, 5];

/** Danh sách múi giờ dự phòng khi trình duyệt không hỗ trợ Intl.supportedValuesOf */
const FALLBACK_TIMEZONES = [
  'Asia/Ho_Chi_Minh',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
  'UTC',
];

function timezoneOptions(current: string): string[] {
  let list: string[] = [];
  try {
    const supported = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] })
      .supportedValuesOf;
    if (typeof supported === 'function') list = supported('timeZone');
  } catch {
    list = [];
  }
  if (list.length === 0) list = FALLBACK_TIMEZONES;
  return list.includes(current) ? list : [current, ...list];
}

/**
 * M08 — Cá nhân và cài đặt (INTERFACE_SPEC).
 *
 * Toàn bộ nhóm cài đặt hiển thị trên một trang, mỗi nhóm là một thẻ có
 * tiêu đề + mô tả ngắn để người cao tuổi dễ tìm.
 */
export function M08() {
  const { user, profile, timezone: ctxTimezone, logout, refreshProfile } = useAuth();

  const [scale, setScale] = useState<FontScale>(() => readFontScale());
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [pushState, setPushState] = useState<PushSetupResult | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [hasToken, setHasToken] = useState(() => currentPushToken() !== null);

  // Tài khoản
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [address, setAddress] = useState(profile?.address ?? '');
  const [timezone, setTimezone] = useState(ctxTimezone);
  const [accountBusy, setAccountBusy] = useState(false);
  const [accountMessage, setAccountMessage] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  // Âm thanh / giọng đọc
  const [sound, setSound] = useState(() => isSoundEnabled());
  const [speech, setSpeech] = useState(() => isSpeechEnabled());
  const canSpeak = speechSupported();

  // Cài đặt nhắc lại
  const [snoozeMinutes, setSnoozeMinutes] = useState<number>(() =>
    Number(profile?.preferences?.snoozeMinutes ?? 10),
  );
  const [snoozeMax, setSnoozeMax] = useState<number>(() => Number(profile?.preferences?.snoozeMax ?? 3));
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Thông báo cho người thân (chỉ các kết nối tôi là chủ hồ sơ)
  const [connections, setConnections] = useState<FamilyConnectionItem[]>([]);
  const [connLoading, setConnLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  const [connBusyId, setConnBusyId] = useState<string | null>(null);

  // Đồng bộ lại khi hồ sơ backend được tải/đổi (ví dụ sau refreshProfile)
  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- đồng bộ state form với hồ sơ tải từ server
    setDisplayName(profile?.displayName ?? '');
    setPhone(profile?.phone ?? '');
    setAddress(profile?.address ?? '');
    setTimezone(profile?.timezone ?? ctxTimezone);
    setSnoozeMinutes(Number(profile?.preferences?.snoozeMinutes ?? 10));
    setSnoozeMax(Number(profile?.preferences?.snoozeMax ?? 3));
  }, [profile, ctxTimezone]);

  /**
   * Nhãn tài khoản đăng nhập ở đầu mục "Thông tin cá nhân".
   * Tài khoản tạo bằng SĐT có `user.email` là email nội bộ `<sđt>@med.local`
   * → hiển thị lại dạng SĐT cho dễ hiểu.
   */
  const accountIdentifierLabel = (() => {
    const loggedInEmail = user?.email ?? '';
    if (!loggedInEmail) return 'Tài khoản: —';
    const asPhone = phoneFromInternalEmail(loggedInEmail);
    return asPhone ? `Số điện thoại đăng nhập: ${asPhone}` : `Email: ${loggedInEmail}`;
  })();

  const loadConnections = useCallback(async () => {    setConnLoading(true);
    setConnError(null);
    try {
      const all = await listFamilyConnections();
      setConnections(all.filter((c) => c.role === 'owner'));
    } catch (e) {
      setConnError(e instanceof ApiError ? e.message : 'Không tải được danh sách người thân');
    } finally {
      setConnLoading(false);
    }
  }, []);

  useEffect(() => {
    // oxlint-disable-next-line react/set-state-in-effect -- tải danh sách người thân khi màn hình mở
    void loadConnections();
  }, [loadConnections]);

  function chooseScale(next: FontScale) {
    setScale(next);
    applyFontScale(next);
  }

  async function requestPermission() {
    if (typeof Notification === 'undefined') return;
    setPushBusy(true);
    try {
      const result = await enableWebPush();
      setPushState(result);
      setPermission(Notification.permission);
      setHasToken(result.status === 'registered' || currentPushToken() !== null);
    } finally {
      setPushBusy(false);
    }
  }

  async function saveAccount() {
    const name = displayName.trim();
    if (!name) {
      setAccountError('Tên hiển thị không được để trống');
      return;
    }
    // SĐT/địa chỉ không bắt buộc; nhập thì phải đúng định dạng (backend kiểm lại)
    const phoneValue = phone.trim();
    if (phoneValue !== '' && !isValidPhone(phoneValue)) {
      setAccountError('Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)');
      return;
    }
    const addressValue = address.trim();
    if (addressValue !== '' && !isValidAddress(addressValue)) {
      setAccountError('Địa chỉ tối đa 200 ký tự');
      return;
    }
    setAccountBusy(true);
    setAccountError(null);
    setAccountMessage(null);
    try {
      await updateProfile({
        displayName: name,
        // '' → null để xoá hẳn giá trị đã lưu
        phone: phoneValue === '' ? null : phoneValue,
        address: addressValue === '' ? null : addressValue,
        timezone,
      });
      await refreshProfile();
      setAccountMessage('Đã lưu thông tin cá nhân.');
    } catch (e) {
      setAccountError(e instanceof ApiError ? e.message : 'Không lưu được — thử lại');
    } finally {
      setAccountBusy(false);
    }
  }

  async function saveSnooze() {
    setSettingsBusy(true);
    setSettingsError(null);
    setSettingsMessage(null);
    try {
      await updateNotificationSettings({ snoozeMinutes, snoozeMax });
      await refreshProfile();
      setSettingsMessage('Đã lưu cài đặt nhắc lại.');
    } catch (e) {
      setSettingsError(e instanceof ApiError ? e.message : 'Không lưu được — thử lại');
    } finally {
      setSettingsBusy(false);
    }
  }

  async function toggleRelativeAlerts(conn: FamilyConnectionItem, next: boolean) {
    setConnBusyId(conn.id);
    setConnError(null);
    try {
      await updateFamilyPermissions(conn.id, { relativeAlerts: next });
      setConnections((prev) =>
        prev.map((c) => (c.id === conn.id ? { ...c, permissions: { ...c.permissions, relative_alerts: next } } : c)),
      );
    } catch (e) {
      setConnError(e instanceof ApiError ? e.message : 'Không đổi được quyền — thử lại');
    } finally {
      setConnBusyId(null);
    }
  }

  function toggleSound(next: boolean) {
    setSound(next);
    setSoundEnabled(next);
  }

  function toggleSpeech(next: boolean) {
    setSpeech(next);
    setSpeechEnabled(next);
  }

  const permissionText: Record<NotificationPermission | 'unsupported', string> = {
    default: 'Chưa cấp — bấm nút bên dưới để trình duyệt hỏi',
    granted: 'Đã cấp',
    denied: 'Bị từ chối — cần bật lại trong cài đặt trình duyệt',
    unsupported: 'Trình duyệt này không hỗ trợ thông báo',
  };

  const pushMessage = (() => {
    if (!pushState) return null;
    switch (pushState.status) {
      case 'registered':
        return 'Đã bật thông báo đẩy trên trình duyệt này.';
      case 'denied':
        return pushState.reason + ' — mở cài đặt trình duyệt để cấp lại quyền.';
      case 'unsupported':
      case 'unconfigured':
      case 'error':
        return pushState.reason;
    }
  })();

  const needsIosInstall = isIosSafari() && !isStandalone();
  const tzOptions = useMemo(() => timezoneOptions(timezone), [timezone]);

  return (
    <>
      <h1>Cá nhân và cài đặt</h1>

      {/* ================= Tài khoản ================= */}
      <Section title="Thông tin cá nhân" icon="👤">
            <Text muted style={{ marginBottom: 4 }}>
              {accountIdentifierLabel}
            </Text>
            <label style={{ display: 'block', marginTop: 8, marginBottom: 6, fontWeight: 600 }} htmlFor="displayName">
              Tên hiển thị
            </label>
            <input
              id="displayName"
              className="input"
              value={displayName}
              maxLength={100}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <label style={{ display: 'block', marginTop: 12, marginBottom: 6, fontWeight: 600 }} htmlFor="accountPhone">
              Số điện thoại
            </label>
            <input
              id="accountPhone"
              className="input"
              type="tel"
              value={phone}
              maxLength={20}
              autoComplete="tel"
              placeholder="0912345678"
              onChange={(e) => setPhone(e.target.value)}
            />
            <Text muted style={{ marginTop: 4 }}>
              Dùng để người thân liên hệ; để trống nếu không muốn khai.
            </Text>
            <label style={{ display: 'block', marginTop: 12, marginBottom: 6, fontWeight: 600 }} htmlFor="accountAddress">
              Địa chỉ
            </label>
            <input
              id="accountAddress"
              className="input"
              value={address}
              maxLength={200}
              autoComplete="street-address"
              placeholder="12 Lê Lợi, Q.1, TP.HCM"
              onChange={(e) => setAddress(e.target.value)}
            />
            <label style={{ display: 'block', marginTop: 12, marginBottom: 6, fontWeight: 600 }} htmlFor="timezone">
              Múi giờ
            </label>
            <select
              id="timezone"
              className="select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
            >
              {tzOptions.map((tz) => (
                <option key={tz} value={tz}>
                  {formatTimezoneLabel(tz)}
                </option>
              ))}
            </select>
            <Button block style={{ marginTop: 12 }} loading={accountBusy} onClick={() => void saveAccount()}>
              Lưu thông tin
            </Button>
            {accountMessage && (
              <Notice tone="success" icon={false}>
                <Text strong as="span" style={{ color: 'inherit' }}>
                  {accountMessage}
                </Text>
              </Notice>
            )}
            {accountError && (
              <Notice tone="error" icon={false}>
                {accountError}
              </Notice>
            )}
          </Section>

      <Section title="Cỡ chữ" icon="🔠" description="Chọn cỡ chữ dễ đọc nhất với bạn.">
            <div style={{ display: 'flex', gap: 8 }} role="radiogroup" aria-label="Chọn cỡ chữ">
              {(['sm', 'md', 'lg'] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={scale === value}
                  onClick={() => chooseScale(value)}
                  className="segmented__item"
                  style={{
                    border: `2px solid ${scale === value ? 'var(--c-primary)' : 'var(--c-border)'}`,
                    background: scale === value ? 'var(--c-primary)' : 'var(--c-surface)',
                    color: scale === value ? '#fff' : 'var(--c-text)',
                  }}
                >
                  {FONT_SCALE_LABEL[value]}
                </button>
              ))}
            </div>
          </Section>

      <Section title="Đăng xuất" icon="🚪">
        {!confirmLogout ? (
          <Button variant="danger" block onClick={() => setConfirmLogout(true)}>
            Đăng xuất
          </Button>
        ) : (
          <>
            <Text strong>Bạn chắc chắn muốn đăng xuất?</Text>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="ghost" block onClick={() => setConfirmLogout(false)}>
                Hủy
              </Button>
              <Button variant="danger" block onClick={() => void logout()}>
                Đăng xuất
              </Button>
            </div>
          </>
        )}
      </Section>

      {/* ================= Nhắc uống ================= */}
      <Section
        title="Cài đặt nhắc lại"
        icon="🔁"
        description="Áp dụng cho các lần uống tiếp theo. Mặc định: 10 phút × 3 lần."
      >
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600 }} htmlFor="snoozeMinutes">
              Nhắc lại sau (phút)
            </label>
            <select
              id="snoozeMinutes"
              className="select"
              value={snoozeMinutes}
              onChange={(e) => setSnoozeMinutes(Number(e.target.value))}
            >
              {SNOOZE_MINUTE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} phút
                </option>
              ))}
            </select>
            <label style={{ display: 'block', marginTop: 12, marginBottom: 6, fontWeight: 600 }} htmlFor="snoozeMax">
              Số lần nhắc lại tối đa
            </label>
            <select
              id="snoozeMax"
              className="select"
              value={snoozeMax}
              onChange={(e) => setSnoozeMax(Number(e.target.value))}
            >
              {SNOOZE_MAX_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n} lần
                </option>
              ))}
            </select>
            <Button block style={{ marginTop: 12 }} loading={settingsBusy} onClick={() => void saveSnooze()}>
              Lưu cài đặt nhắc lại
            </Button>
            {settingsMessage && (
              <Notice tone="success" icon={false}>
                <Text strong as="span" style={{ color: 'inherit' }}>
                  {settingsMessage}
                </Text>
              </Notice>
            )}
            {settingsError && (
              <Notice tone="error" icon={false}>
                {settingsError}
              </Notice>
            )}
          </Section>

          <Section
            title="Âm thanh và giọng đọc"
            icon="🔊"
            description="Chỉ hoạt động khi trang đang mở."
          >
            <label className="check-row">
              <input type="checkbox" checked={sound} onChange={(e) => toggleSound(e.target.checked)} />
              Bật âm thanh khi trang đang mở
            </label>
            {canSpeak ? (
              <>
                <label className="check-row" style={{ marginTop: 8 }}>
                  <input type="checkbox" checked={speech} onChange={(e) => toggleSpeech(e.target.checked)} />
                  Đọc to tên thuốc và hướng dẫn khi đến giờ
                </label>
                <Button
                  variant="secondary"
                  block
                  style={{ marginTop: 12 }}
                  onClick={() => window.speechSynthesis.speak(new SpeechSynthesisUtterance('Đến giờ uống thuốc'))}
                >
                  Thử giọng đọc
                </Button>
              </>
            ) : (
              <Text muted style={{ marginTop: 8 }}>
                Trình duyệt này không hỗ trợ giọng đọc.
              </Text>
            )}
      </Section>

      {/* ================= Thông báo ================= */}
      <Section
        title="Thông báo đẩy"
        icon="🔔"
        description="Nhắc uống thuốc ngay trên thiết bị này."
      >
            <Text>Quyền thông báo: {permissionText[permission]}</Text>
            {hasToken && <Text muted>Đã đăng ký thiết bị nhận thông báo đẩy trên trình duyệt này.</Text>}
            {(permission === 'default' || (!hasToken && permission !== 'denied')) && (
              <Button variant="secondary" block disabled={pushBusy} onClick={() => void requestPermission()}>
                {pushBusy ? 'Đang bật…' : 'Bật thông báo nhắc uống thuốc'}
              </Button>
            )}
            {pushMessage && (
              <Notice tone="info" icon={false}>
                {pushMessage}
              </Notice>
            )}
            <Text muted>
              {needsIosInstall
                ? 'iOS/iPadOS: cần bấm “Chia sẻ” → “Thêm vào màn hình chính” rồi mở lại từ biểu tượng để nhận thông báo.'
                : 'Trình duyệt phải được mở (kể cả ở nền) để nhận thông báo. iOS cần “Thêm vào màn hình chính” (PWA).'}
            </Text>
          </Section>

          <Section
            title="Thông báo cho người thân"
            icon="👨‍👩‍👧"
            description="Người thân sẽ nhận thông báo khi bạn bỏ lỡ một lần uống thuốc."
          >
            {connLoading && <Text muted>Đang tải…</Text>}
            {!connLoading && connError && (
              <Notice tone="error" icon={false}>
                {connError}
              </Notice>
            )}
            {!connLoading && !connError && connections.length === 0 && (
              <Text muted>
                Chưa có người thân kết nối. <Link to="/family">Thêm người thân</Link>
              </Text>
            )}
            {connections.map((conn) => (
              <label key={conn.id} className="check-row" style={{ marginBottom: 8 }}>
                <input
                  type="checkbox"
                  checked={conn.permissions.relative_alerts}
                  disabled={connBusyId === conn.id}
                  onChange={(e) => void toggleRelativeAlerts(conn, e.target.checked)}
                />
                {`Cho ${conn.user.displayName ?? conn.user.phone ?? 'người thân'} nhận thông báo khi tôi bỏ lỡ`}
              </label>
            ))}
          </Section>
    </>
  );
}
