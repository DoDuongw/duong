import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Share,
  Switch,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Card, Button, Input, StateView, Section, Notice, Segmented, RelativeUnconfirmedAlert, Text } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import {
  acceptFamilyInvite,
  createFamilyInvite,
  getDosesByDate,
  listFamilyConnections,
  revokeFamilyConnection,
  updateFamilyPermissions,
} from '../services/endpoints';
import type { DayDoses, DoseWithMedication, FamilyConnectionItem, FamilyPermissions } from '../types';
import {
  BUOI_LABEL,
  buoiOfIso,
  formatDisplayDate,
  formatTime,
  formatTimezoneLabel,
  shiftYmd,
  todayYmd,
  type Buoi,
} from '../utils/dateTime';
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL } from '../utils/doseStatus';

const BUOIS: Buoi[] = ['sang', 'trua', 'chieu', 'toi'];
const BUOI_ICON: Record<Buoi, string> = { sang: '🌅', trua: '☀️', chieu: '🌤️', toi: '🌙' };

export default function FamilyScreen() {
  const [tab, setTab] = useState<'list' | 'join'>('list');
  const [connections, setConnections] = useState<FamilyConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await listFamilyConnections();
      setConnections(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải kết nối');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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

  function formatRemaining(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  async function handleCreateInvite() {
    try {
      setInviteBusy(true);
      setInviteError(null);
      const created = await createFamilyInvite();
      setInvite({ code: created.code, expiresAt: created.expiresAt });
    } catch (e: any) {
      setInviteError(e?.message || 'Không tạo được mã mời — thử lại');
    } finally {
      setInviteBusy(false);
    }
  }

  async function shareCode() {
    if (!invite) return;
    try {
      await Share.share({ message: `Mã mời kết nối người thân (MedReminder): ${invite.code}\nMã có hạn 15 phút.` });
    } catch {}
  }

  async function handleAcceptInvite() {
    const code = joinCode.trim();
    if (!code) return;
    try {
      setJoinBusy(true);
      setJoinError(null);
      setJoinMessage(null);
      const result = await acceptFamilyInvite(code);
      setJoinCode('');
      setJoinMessage(`Đã kết nối với ${(result as any)?.owner?.displayName ?? 'người thân'}.`);
      setTab('list');
      await load(true);
    } catch (e: any) {
      setJoinError(e?.message || 'Không kết nối được — thử lại');
    } finally {
      setJoinBusy(false);
    }
  }

  async function togglePermission(
    conn: FamilyConnectionItem,
    patch: Partial<{ viewSchedule: boolean; relativeAlerts: boolean }>,
  ) {
    setPermBusyId(conn.id);
    setPermError(null);
    // Optimistic update để trạng thái gạt hiển thị đúng ngay lập tức
    setConnections((prev) =>
      prev.map((c) => {
        if (c.id !== conn.id) return c;
        return {
          ...c,
          permissions: {
            ...c.permissions,
            ...(patch.viewSchedule !== undefined ? { view_schedule: patch.viewSchedule } : {}),
            ...(patch.relativeAlerts !== undefined ? { relative_alerts: patch.relativeAlerts } : {}),
          },
        };
      }),
    );
    try {
      const saved = await updateFamilyPermissions(conn.id, patch);
      // Đồng bộ theo kết quả server (tránh hiểu ngược trạng thái)
      if (saved?.permissions) {
        setConnections((prev) =>
          prev.map((c) => (c.id === conn.id ? { ...c, permissions: saved.permissions } : c)),
        );
      } else {
        await load(true);
      }
    } catch (e: any) {
      setPermError(e?.message || 'Không đổi được quyền — thử lại');
      await load(true); // rollback theo dữ liệu thật
    } finally {
      setPermBusyId(null);
    }
  }

  function handleRevoke(conn: FamilyConnectionItem) {
    const msg = 'Người này sẽ không còn xem được lịch uống thuốc của bạn. Bạn có thể tạo mã mời mới sau.';
    const doRevoke = async () => {
      try {
        setPermBusyId(conn.id);
        await revokeFamilyConnection(conn.id);
        await load(true);
      } catch (e: any) {
        const em = e?.message || 'Không ngắt được kết nối — thử lại';
        if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(em);
        else Alert.alert('Lỗi', em);
      } finally {
        setPermBusyId(null);
      }
    };
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (window.confirm(`Ngắt kết nối?\n\n${msg}`)) void doRevoke();
      return;
    }
    Alert.alert('Ngắt kết nối?', msg, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Ngắt kết nối', style: 'destructive', onPress: () => void doRevoke() },
    ]);
  }

  const list = connections || [];
  const relatives = list.filter((c) => c.role === 'relative');
  const owners = list.filter((c) => c.role === 'owner');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Button variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}>
            ← Quay lại
          </Button>
        </View>

        <Text style={styles.pageTitle}>Người thân</Text>

        <Segmented
          label="Chế độ xem"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'list', label: 'Đã kết nối' },
            { value: 'join', label: 'Nhập mã mời' },
          ]}
        />

        {joinMessage ? (
          <Notice tone="success" icon={false}>
            <Text style={{ color: '#166534', fontWeight: '700' }}>{joinMessage}</Text>
          </Notice>
        ) : null}

        {tab === 'list' ? (
          <>
            {loading ? (
              <StateView state="loading" />
            ) : error ? (
              <StateView
                state="error"
                message={error}
                hint="Kiểm tra Hồ sơ → Cài đặt → “Kết nối máy chủ (chẩn đoán)” để xem API_BASE. Đảm bảo backend đang chạy, điện thoại cùng Wi‑Fi, rồi chạy `npx expo start -c` và reload app để nhận cấu hình mới."
                onRetry={() => load()}
              />
            ) : (
              <>
                {permError ? <Notice tone="error" icon={false}><Text style={{ color: '#991b1b' }}>{permError}</Text></Notice> : null}

                {list.length === 0 ? (
                  <Card>
                    <Text style={styles.emptyTitle}>Chưa có người thân kết nối</Text>
                    <Text style={styles.muted}>Tạo mã mời rồi gửi cho người thân, hoặc nhập mã họ gửi cho bạn.</Text>
                  </Card>
                ) : null}

                {relatives.map((conn) => (
                  <RelativeSchedule
                    key={conn.id}
                    conn={conn}
                    busy={permBusyId === conn.id}
                    onRevoke={() => handleRevoke(conn)}
                  />
                ))}

                {owners.map((conn) => (
                  <Section
                    key={conn.id}
                    title={conn.user.displayName ?? (conn.user as any).phone ?? 'Người thân'}
                    icon="👤"
                  >
                    <Text style={styles.muted}>Bạn là chủ hồ sơ — người này xem lịch uống thuốc của bạn.</Text>
                    <PermissionRow
                      label="Cho phép xem lịch uống thuốc"
                      hint="Bật = người thân xem được lịch/thuốc của bạn."
                      value={!!conn.permissions?.view_schedule}
                      disabled={permBusyId === conn.id}
                      onChange={(v) => void togglePermission(conn, { viewSchedule: !!v })}
                    />
                    <PermissionRow
                      label="Nhận thông báo khi tôi bỏ lỡ thuốc"
                      hint="Bật = gửi cảnh báo cho người thân khi cần."
                      value={!!conn.permissions?.relative_alerts}
                      disabled={permBusyId === conn.id}
                      onChange={(v) => void togglePermission(conn, { relativeAlerts: !!v })}
                    />
                    <Button variant="danger" block style={{ marginTop: spacing.sm }} onPress={() => handleRevoke(conn)} disabled={permBusyId === conn.id}>
                      Ngắt kết nối
                    </Button>
                  </Section>
                ))}

                <Section title="Mời người thân" icon="✉️">
                  <Text style={styles.muted}>Tạo mã 6 chữ số rồi gửi cho người thân. Mã có hạn 15 phút.</Text>
                  <Button block onPress={() => void handleCreateInvite()} loading={inviteBusy} style={{ marginTop: spacing.sm }}>
                    Tạo mã mời
                  </Button>
                  {inviteError ? <Notice tone="error" icon={false}><Text style={{ color: '#991b1b' }}>{inviteError}</Text></Notice> : null}
                  {invite ? (
                    <View style={styles.inviteCard}>
                      <Text style={styles.inviteLabel}>Mã mời của bạn</Text>
                      <Text style={styles.inviteCode} accessibilityLabel="Mã mời 6 chữ số">{invite.code}</Text>
                      <Text style={styles.mutedCenter}>
                        {remaining > 0 ? `Còn lại ${formatRemaining(remaining)}` : 'Mã đã hết hạn — tạo mã mới'}
                      </Text>
                      <Button block variant="secondary" style={{ marginTop: spacing.sm }} onPress={() => void shareCode()} disabled={remaining <= 0}>
                        Sao chép / Chia sẻ mã
                      </Button>
                    </View>
                  ) : null}
                </Section>
              </>
            )}
          </>
        ) : (
          <Section title="Nhập mã mời" icon="🔢">
            <Text style={styles.muted}>Nhập mã 6 chữ số do người thân gửi cho bạn.</Text>
            <Text style={styles.permLabel}>Mã mời 6 chữ số</Text>
            <Input
              value={joinCode}
              onChangeText={(v) => setJoinCode(v.replace(/\D/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="000000"
              maxLength={6}
            />
            {joinError ? <Notice tone="error" icon={false}><Text style={{ color: '#991b1b' }}>{joinError}</Text></Notice> : null}
            <Button block style={{ marginTop: spacing.sm }} disabled={joinCode.length !== 6} loading={joinBusy} onPress={() => void handleAcceptInvite()}>
              Kết nối
            </Button>
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function PermissionRow({
  label,
  hint,
  value,
  disabled,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.permRow}>
      <View style={{ flex: 1, paddingRight: spacing.sm }}>
        <Text style={styles.permLabel}>{label}</Text>
        <Text style={styles.permHint}>
          {value ? (hint ? `${hint} Đang: BẬT.` : 'Đang: BẬT.') : (hint ? `${hint} Đang: TẮT.` : 'Đang: TẮT.')}
        </Text>
      </View>
      <Switch
        value={!!value}
        onValueChange={(next) => onChange(next)}
        disabled={!!disabled}
        trackColor={{ false: '#cbd5e1', true: '#86efac' }}
        thumbColor={Platform.OS === 'android' ? (value ? '#16a34a' : '#f8fafc') : undefined}
        ios_backgroundColor="#cbd5e1"
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityState={{ checked: !!value, disabled: !!disabled }}
      />
    </View>
  );
}

function RelativeSchedule({
  conn,
  busy,
  onRevoke,
}: {
  conn: FamilyConnectionItem;
  busy: boolean;
  onRevoke: () => void;
}) {
  const ownerName = conn.user.displayName ?? (conn.user as any).phone ?? 'người thân';
  const timezone = (conn.user as any).timezone ?? 'Asia/Ho_Chi_Minh';
  const [dateOverride, setDateOverride] = useState<string | null>(null);
  const date = dateOverride ?? todayYmd(timezone);
  const today = todayYmd(timezone);
  const canView = conn.permissions.view_schedule;

  const [loading, setLoading] = useState(canView);
  const [error, setError] = useState<string | null>(null);
  const [doses, setDoses] = useState<DoseWithMedication[]>([]);

  const loadDoses = useCallback(async () => {
    if (!canView) {
      setDoses([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data: DayDoses = await getDosesByDate(date, conn.user.id);
      setDoses(data?.doses || []);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải lịch');
    } finally {
      setLoading(false);
    }
  }, [date, conn.user.id, canView]);

  useEffect(() => {
    loadDoses();
  }, [loadDoses]);

  const grouped: Record<Buoi, DoseWithMedication[]> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const dose of doses) grouped[buoiOfIso(dose.scheduledAt, timezone)].push(dose);

  return (
    <Section title={`Lịch uống thuốc của ${ownerName}`} icon="📅">
      <Text style={styles.muted}>
        {canView
          ? `${formatDisplayDate(date)} · giờ theo múi giờ ${formatTimezoneLabel(timezone)}`
          : ''}
      </Text>
      <Text style={[styles.muted, { marginBottom: spacing.sm }]}>
        Quyền hiện tại: {canView ? 'xem lịch uống thuốc' : 'không xem lịch'}
      </Text>

      {!canView ? (
        <Notice tone="warning" icon="🔒">
          <Text style={{ color: colors.text }}>{ownerName} chưa cho phép bạn xem lịch uống thuốc. Hãy đề nghị họ bật quyền trong màn “Người thân”.</Text>
        </Notice>
      ) : (
        <>
          <Button
            variant="secondary"
            block
            style={{ marginBottom: spacing.sm }}
            onPress={() => router.push(`/(tabs)/schedule?ownerId=${conn.user.id}` as any)}
          >
            Xem lịch uống thuốc
          </Button>

          <View style={styles.dateRow}>
            <Button variant="secondary" size="md" onPress={() => setDateOverride(shiftYmd(date, -1))} style={styles.dateBtn}>←</Button>
            <Button variant="ghost" size="md" onPress={() => setDateOverride(todayYmd(timezone))} disabled={date === todayYmd(timezone)} style={styles.dateBtnMid}>
              Hôm nay
            </Button>
            <Button variant="secondary" size="md" onPress={() => setDateOverride(shiftYmd(date, 1))} style={styles.dateBtn}>→</Button>
          </View>

          {loading ? (
            <StateView state="loading" />
          ) : error ? (
            <StateView
              state="error"
              message={error}
              hint="Kiểm tra kết nối máy chủ (API_BASE trong Hồ sơ → Cài đặt) và chạy lại app với `npx expo start -c` nếu vừa sửa cấu hình."
              onRetry={loadDoses}
            />
          ) : doses.length === 0 ? (
            <StateView state="empty" emptyIcon="🗓️" message={`Không có lần uống nào ngày ${formatDisplayDate(date)}`} />
          ) : (
            <>
              <RelativeUnconfirmedAlert ownerName={ownerName} timeZone={timezone} doses={doses} date={date} today={today} />
              {BUOIS.map((buoi) =>
                grouped[buoi].length === 0 ? null : (
                  <View key={buoi} style={{ marginBottom: spacing.sm }}>
                    <Text style={styles.buoiTitle}>{BUOI_ICON[buoi]} {BUOI_LABEL[buoi]}</Text>
                    {grouped[buoi].map((dose) => (
                      <Card key={dose.id} style={styles.doseCard}>
                        <View style={styles.doseRow}>
                          <Text style={styles.doseTime}>{formatTime(dose.scheduledAt, timezone)}</Text>
                          {dose.imageUrl ? <Image source={{ uri: dose.imageUrl }} style={styles.doseThumb} /> : null}
                          <View style={{ flex: 1 }}>
                            <Text style={styles.doseName}>{dose.medicationName || 'Thuốc'}</Text>
                            <Text style={styles.doseMeta}>
                              {dose.dosageText ? `${dose.dosageText} • ` : ''}
                              {DOSE_STATUS_ICON[dose.status] || ''} {DOSE_STATUS_LABEL[dose.status] || dose.status}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    ))}
                  </View>
                ),
              )}
            </>
          )}

          <Text style={[styles.muted, { marginTop: spacing.xs }]}>
            Bạn chỉ xem được lịch. Việc xác nhận uống thuốc do {ownerName} thực hiện.
          </Text>
        </>
      )}

      <Button variant="danger" block style={{ marginTop: spacing.sm }} onPress={onRevoke} disabled={busy}>
        Ngắt kết nối
      </Button>
    </Section>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  muted: { ...typography.bodySm, color: colors.muted, marginBottom: 4 },
  mutedCenter: { ...typography.bodySm, color: colors.muted, textAlign: 'center', marginTop: 6 },
  emptyTitle: { ...typography.body, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 },
  inviteCard: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: '#b9d5ea',
    backgroundColor: colors.primarySoft || '#eef6fc',
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  inviteLabel: { ...typography.body, fontWeight: '700', color: colors.text },
  inviteCode: { fontSize: 40, fontWeight: '800', letterSpacing: 8, color: colors.primaryDark || colors.primary, marginVertical: 10 },
  permRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  permLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
  permHint: { ...typography.caption, color: colors.muted, marginTop: 2, lineHeight: 18 },
  dateRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.sm },
  dateBtn: { minWidth: 52 },
  dateBtnMid: { flex: 1 },
  buoiTitle: { ...typography.body, fontWeight: '800', color: colors.text, marginBottom: 4 },
  doseCard: { marginBottom: spacing.xs },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doseTime: { ...typography.body, fontWeight: '800', minWidth: 56, color: colors.primaryDark || colors.primary },
  doseThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surface2 },
  doseName: { ...typography.body, fontWeight: '700', color: colors.text },
  doseMeta: { ...typography.bodySm, color: colors.muted },
});
