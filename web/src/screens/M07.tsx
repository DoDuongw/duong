import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import { DoseRow } from '../components/DoseRow';
import { Notice } from '../components/Notice';
import { RelativeUnconfirmedAlert } from '../components/RelativeUnconfirmedAlert';
import { Section } from '../components/Section';
import { Segmented } from '../components/Segmented';
import { StateView } from '../components/StateView';
import { Text } from '../components/Text';
import { useApi } from '../hooks/useApi';
import { ApiError } from '../services/api';
import {
  acceptFamilyInvite,
  createFamilyInvite,
  getDosesByDate,
  listFamilyConnections,
  revokeFamilyConnection,
  updateFamilyPermissions,
} from '../services/endpoints';
import type { DayDoses, FamilyConnectionItem } from '../types';
import {
  BUOI_LABEL,
  formatDisplayDate,
  formatTimezoneLabel,
  shiftYmd,
  todayYmd,
  buoiOfIso,
  type Buoi,
} from '../utils/dateTime';

const BUOIS: Buoi[] = ['sang', 'trua', 'chieu', 'toi'];

/**
 * M07 — Người thân và kết nối (INTERFACE_SPEC).
 *
 * Vai trò **chủ hồ sơ**: tạo mã mời, cấp/thu quyền, ngắt kết nối.
 * Vai trò **người thân**: xem **trực tiếp** lịch uống thuốc của chủ hồ sơ ngay
 * trong màn này (không còn phải bấm “Xem lịch uống thuốc” rồi mới thấy).
 */
export function M07() {
  const [tab, setTab] = useState<'list' | 'join'>('list');
  const navigate = useNavigate();
  const location = useLocation();
  const { loading, data: connections, error, refetch } = useApi(() => listFamilyConnections(), []);

  /** Về trang trước; nếu mở trực tiếp bằng URL thì về Trang chủ (không thoát khỏi ứng dụng) */
  function goBack() {
    if (location.key !== 'default') navigate(-1);
    else navigate('/');
  }

  const [invite, setInvite] = useState<{ code: string; expiresAt: string } | null>(null);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const [joinCode, setJoinCode] = useState('');
  const [joinBusy, setJoinBusy] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  const [permBusyId, setPermBusyId] = useState<string | null>(null);
  const [permError, setPermError] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<FamilyConnectionItem | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  // Đếm ngược hạn mã mời (mã có hạn 15 phút — BUSINESS_RULES)
  useEffect(() => {
    if (!invite) return;
    const update = () => {
      const left = Math.max(0, Math.floor((new Date(invite.expiresAt).getTime() - Date.now()) / 1000));
      setRemaining(left);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [invite]);

  const createInvite = useCallback(async () => {
    setInviteBusy(true);
    setInviteError(null);
    try {
      const created = await createFamilyInvite();
      setInvite(created);
    } catch (e) {
      setInviteError(e instanceof ApiError ? e.message : 'Không tạo được mã mời — thử lại');
    } finally {
      setInviteBusy(false);
    }
  }, []);

  async function submitJoin() {
    setJoinBusy(true);
    setJoinError(null);
    setJoinMessage(null);
    try {
      const result = await acceptFamilyInvite(joinCode);
      setJoinCode('');
      setJoinMessage(`Đã kết nối với ${result.owner.displayName ?? 'người thân'}.`);
      setTab('list');
      refetch();
    } catch (e) {
      setJoinError(e instanceof ApiError ? e.message : 'Không kết nối được — thử lại');
    } finally {
      setJoinBusy(false);
    }
  }

  async function togglePermission(
    conn: FamilyConnectionItem,
    patch: { viewSchedule?: boolean; relativeAlerts?: boolean },
  ) {
    setPermBusyId(conn.id);
    setPermError(null);
    try {
      await updateFamilyPermissions(conn.id, patch);
      refetch();
    } catch (e) {
      setPermError(e instanceof ApiError ? e.message : 'Không đổi được quyền — thử lại');
    } finally {
      setPermBusyId(null);
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    setRevokeBusy(true);
    setPermError(null);
    try {
      await revokeFamilyConnection(revokeTarget.id);
      setRevokeTarget(null);
      refetch();
    } catch (e) {
      setPermError(e instanceof ApiError ? e.message : 'Không ngắt được kết nối — thử lại');
    } finally {
      setRevokeBusy(false);
    }
  }

  function copyCode() {
    if (invite) void navigator.clipboard?.writeText(invite.code).catch(() => undefined);
  }

  function formatRemaining(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  const list = connections ?? [];
  const relatives = list.filter((c) => c.role === 'relative');
  const owners = list.filter((c) => c.role === 'owner');

  return (
    <>
      <div style={{ marginBottom: 4 }}>
        <Button variant="ghost" onClick={goBack} aria-label="Quay lại">
          ← Quay lại
        </Button>
      </div>

      <h1>Người thân</h1>

      <Segmented
        label="Chế độ xem"
        value={tab}
        onChange={setTab}
        role="button"
        options={[
          { value: 'list', label: 'Đã kết nối' },
          { value: 'join', label: 'Nhập mã mời' },
        ]}
      />

      {joinMessage && (
        <Notice tone="success" icon={false}>
          <Text strong as="span" style={{ color: 'inherit' }}>
            {joinMessage}
          </Text>
        </Notice>
      )}

      {tab === 'list' ? (
        <>
          {loading && (
            <Card>
              <StateView state="loading" />
            </Card>
          )}
          {!loading && error && (
            <Card>
              <StateView state="error" message={error} onRetry={refetch} />
            </Card>
          )}

          {permError && (
            <Notice tone="error" icon={false}>
              {permError}
            </Notice>
          )}

          {!loading && !error && list.length === 0 && (
            <Card>
              <StateView
                state="empty"
                message="Chưa có người thân kết nối"
                hint="Tạo mã mời rồi gửi cho người thân, hoặc nhập mã họ gửi cho bạn."
              />
            </Card>
          )}

          {/* ---------- Người thân: xem lịch uống thuốc ngay tại đây ---------- */}
          {relatives.map((conn) => (
            <RelativeSchedule
              key={conn.id}
              conn={conn}
              busy={permBusyId === conn.id}
              onRevoke={() => setRevokeTarget(conn)}
            />
          ))}
          {/* ---------- Chủ hồ sơ: quản lý quyền của người thân ---------- */}
          {owners.map((conn) => (
            <Section
              key={conn.id}
              title={conn.user.displayName ?? conn.user.phone ?? 'Người thân'}
              icon="👤"
              description="Bạn là chủ hồ sơ — người này xem lịch uống thuốc của bạn."
            >
              <div className="stack">
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={conn.permissions.view_schedule}
                    disabled={permBusyId === conn.id}
                    onChange={(event) => void togglePermission(conn, { viewSchedule: event.target.checked })}
                  />
                  Cho phép xem lịch uống thuốc
                </label>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={conn.permissions.relative_alerts}
                    disabled={permBusyId === conn.id}
                    onChange={(event) => void togglePermission(conn, { relativeAlerts: event.target.checked })}
                  />
                  Nhận thông báo khi tôi bỏ lỡ thuốc
                </label>
                <Button variant="danger" block onClick={() => setRevokeTarget(conn)} disabled={permBusyId === conn.id}>
                  Ngắt kết nối
                </Button>
              </div>
            </Section>
          ))}

          <Section
            title="Mời người thân"
            icon="✉️"
            description="Tạo mã 6 chữ số rồi gửi cho người thân. Mã có hạn 15 phút."
          >
            <Button block onClick={() => void createInvite()} loading={inviteBusy}>
              Tạo mã mời
            </Button>
            {inviteError && (
              <Notice tone="error" icon={false}>
                {inviteError}
              </Notice>
            )}

            {invite && (
              <div
                style={{
                  marginTop: 12,
                  border: '1px solid #b9d5ea',
                  background: 'var(--c-primary-soft)',
                  borderRadius: 'var(--r-md)',
                  padding: 16,
                  textAlign: 'center',
                }}
              >
                <Text strong>Mã mời của bạn</Text>
                <p
                  aria-label="Mã mời 6 chữ số"
                  style={{
                    fontSize: 'calc(40px * var(--font-mult))',
                    letterSpacing: '0.25em',
                    fontWeight: 700,
                    margin: '10px 0',
                    color: 'var(--c-primary-dark)',
                  }}
                >
                  {invite.code}
                </p>
                <Text muted role="status">
                  {remaining > 0 ? `Còn lại ${formatRemaining(remaining)}` : 'Mã đã hết hạn — tạo mã mới'}
                </Text>
                <Button
                  block
                  variant="secondary"
                  style={{ marginTop: 12 }}
                  onClick={copyCode}
                  disabled={remaining <= 0}
                >
                  Sao chép mã
                </Button>
              </div>
            )}
          </Section>
        </>
      ) : (
        <Section title="Nhập mã mời" icon="🔢" description="Nhập mã 6 chữ số do người thân gửi cho bạn.">
          <input
            className="input input--code"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            aria-label="Mã mời 6 chữ số"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          />
          {joinError && (
            <Notice tone="error" icon={false}>
              {joinError}
            </Notice>
          )}
          <Button
            block
            style={{ marginTop: 12 }}
            disabled={joinCode.length !== 6}
            loading={joinBusy}
            onClick={() => void submitJoin()}
          >
            Kết nối
          </Button>
        </Section>
      )}

      {revokeTarget && (
        <ConfirmDialog
          title="Ngắt kết nối?"
          message="Người này sẽ không còn xem được lịch uống thuốc của bạn. Bạn có thể tạo mã mời mới sau."
          confirmLabel="Ngắt kết nối"
          danger
          loading={revokeBusy}
          error={permError}
          onCancel={() => setRevokeTarget(null)}
          onConfirm={() => void confirmRevoke()}
        />
      )}
    </>
  );
}

/**
 * Khối lịch uống thuốc của **một chủ hồ sơ** mà người đăng nhập là người thân.
 * Tải trực tiếp `GET /doses?date=&ownerId=` nên người thân thấy ngay lịch,
 * không cần mở màn M03.
 */
function RelativeSchedule({
  conn,
  busy,
  onRevoke,
}: {
  conn: FamilyConnectionItem;
  busy: boolean;
  onRevoke: () => void;
}) {
  const navigate = useNavigate();
  const ownerName = conn.user.displayName ?? conn.user.phone ?? 'người thân';
  const timezone = conn.user.timezone ?? 'Asia/Ho_Chi_Minh';

  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const date = dateOverride ?? todayYmd(timezone);
  const today = todayYmd(timezone);
  const canView = conn.permissions.view_schedule;

  const { loading, data, error, refetch } = useApi<DayDoses>(
    () => (canView ? getDosesByDate(date, conn.user.id) : Promise.resolve({ date, doses: [] })),
    [date, conn.user.id, canView],
  );

  const doses = data?.doses ?? [];
  const grouped: Record<Buoi, typeof doses> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const dose of doses) grouped[buoiOfIso(dose.scheduledAt, timezone)].push(dose);

  return (
    <Section
      title={`Lịch uống thuốc của ${ownerName}`}
      icon="📅"
      description={
        canView
          ? `${formatDisplayDate(date)} · giờ theo múi giờ ${formatTimezoneLabel(timezone)}`
          : undefined
      }
    >
      <Text muted style={{ marginBottom: 12 }}>
        Quyền hiện tại: {canView ? 'xem lịch uống thuốc' : 'không xem lịch'}
      </Text>

      {!canView ? (
        <Notice tone="warning" icon="🔒">
          {ownerName} chưa cho phép bạn xem lịch uống thuốc. Hãy đề nghị họ bật quyền trong màn “Người thân”.
        </Notice>
      ) : (
        <>
          <Button variant="secondary" block style={{ marginBottom: 12 }} onClick={() => navigate(`/schedule?ownerId=${conn.user.id}`)}>
            Xem lịch uống thuốc
          </Button>

          <div className="row" style={{ marginBottom: 12 }}>
            <Button variant="secondary" onClick={() => setDateOverride(shiftYmd(date, -1))} aria-label="Ngày trước">
              ← Ngày trước
            </Button>
            <Button
              variant="ghost"
              onClick={() => setDateOverride(todayYmd(timezone))}
              disabled={date === todayYmd(timezone)}
            >
              Hôm nay
            </Button>
            <Button variant="secondary" onClick={() => setDateOverride(shiftYmd(date, 1))} aria-label="Ngày sau">
              Ngày sau →
            </Button>
          </div>

          {loading ? (
            <StateView state="loading" />
          ) : error ? (
            <StateView state="error" message={error} onRetry={refetch} />
          ) : doses.length === 0 ? (
            <StateView
              state="empty"
              emptyIcon="🗓️"
              message={`Không có lần uống nào ngày ${formatDisplayDate(date)}`}
            />
          ) : (
            <>
              <RelativeUnconfirmedAlert
                ownerName={ownerName}
                timeZone={timezone}
                doses={doses}
                date={date}
                today={today}
              />
              {BUOIS.map((buoi) =>
                grouped[buoi].length === 0 ? null : (
                  <div key={buoi} style={{ marginBottom: 8 }}>
                    <Text strong>{BUOI_LABEL[buoi]}</Text>
                    {grouped[buoi].map((dose) => (
                      <DoseRow key={dose.id} dose={dose} timeZone={timezone} />
                    ))}
                  </div>
                ),
              )}
            </>
          )}

          <Text muted style={{ marginTop: 8 }}>
            Bạn chỉ xem được lịch. Việc xác nhận uống thuốc do {ownerName} thực hiện.
          </Text>
        </>
      )}

      <Button variant="danger" block style={{ marginTop: 8 }} onClick={onRevoke} disabled={busy}>
        Ngắt kết nối
      </Button>
    </Section>
  );
}
