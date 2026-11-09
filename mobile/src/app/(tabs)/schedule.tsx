import { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Alert, TouchableOpacity, Platform, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Card, Section, StateView, Button, Notice, ReasonDialog, Text } from "../../components";
import { colors, spacing, typography, radius } from "../../theme";
import { useAuth } from "../../hooks/useAuth";
import { useOwnerView } from "../../hooks/useOwnerView";
import { cannotTakeDose, confirmDose, getDosesByDate, newClientRequestId, snoozeDose } from "../../services/endpoints";
import type { DoseWithMedication } from "../../types";
import { buoiOfIso, formatTime, formatDisplayDate, shiftYmd, todayYmd, BUOI_LABEL, formatTimezoneLabel } from "../../utils/dateTime";
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL, isActionable } from "../../utils/doseStatus";

const BUOI_ICON: Record<string, string> = { sang: '🌅', trua: '☀️', chieu: '🌤️', toi: '🌙' };

export default function ScheduleScreen() {
  const { timezone } = useAuth();
  const { ownerId, isViewingOther, ownerName, ownerTimezone } = useOwnerView();
  const viewTimezone = ownerTimezone ?? timezone;

  const [date, setDate] = useState<string | null>(null);
  const effectiveDate = date ?? todayYmd(viewTimezone);
  const isToday = effectiveDate === todayYmd(viewTimezone);

  const [doses, setDoses] = useState<DoseWithMedication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [cannotTarget, setCannotTarget] = useState<DoseWithMedication | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getDosesByDate(effectiveDate, ownerId);
      setDoses(res?.doses || []);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải lịch');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [effectiveDate, ownerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  function shiftDate(days: number) {
    setDate(shiftYmd(effectiveDate, days));
  }

  const groups: Record<string, DoseWithMedication[]> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const d of doses) {
    groups[buoiOfIso(d.scheduledAt, viewTimezone)].push(d);
  }

  function canAct(d: DoseWithMedication) {
    return !isViewingOther && (d as any).canAct !== false && isActionable(d.status);
  }

  function showError(msg: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof window.alert === 'function') {
      window.alert(msg);
    } else {
      Alert.alert('Lỗi', msg);
    }
  }

  async function actConfirm(d: DoseWithMedication) {
    try {
      setActingId(d.id);
      setActionError(null);
      await confirmDose(d.id, newClientRequestId());
      await load();
    } catch (e: any) {
      showError(e?.message || 'Không thể xác nhận');
    } finally {
      setActingId(null);
    }
  }

  async function actSnooze(d: DoseWithMedication) {
    try {
      setActingId(d.id);
      setActionError(null);
      await snoozeDose(d.id);
      await load();
    } catch (e: any) {
      showError(e?.message || 'Không thể hoãn');
    } finally {
      setActingId(null);
    }
  }

  async function submitCannotTake(reason: string) {
    if (!cannotTarget) return;
    try {
      setActingId(cannotTarget.id);
      setActionError(null);
      await cannotTakeDose(cannotTarget.id, reason);
      setCannotTarget(null);
      await load();
    } catch (e: any) {
      setActionError(e?.message || 'Không thể ghi nhận');
    } finally {
      setActingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{isViewingOther ? `Lịch uống của ${ownerName}` : 'Lịch uống thuốc'}</Text>
          <Text style={styles.pageSub}>{isViewingOther ? 'Chỉ xem — không thay đổi được' : 'Xem chi tiết theo ngày và buổi'}</Text>
        </View>

        {isViewingOther ? (
          <Notice tone="info" icon="👀">
            <Text style={{ color: colors.text }}>Đang xem lịch của {ownerName} — Bạn chỉ xem được, không thay đổi được lịch uống thuốc.</Text>
            <Button variant="ghost" style={{ marginTop: 8, minHeight: 44 }} onPress={() => router.push('/family')}>
              ← Về danh sách người thân
            </Button>
          </Notice>
        ) : null}

        <Card style={styles.dateCard}>
          <View style={styles.dateRow}>
            <Button variant="secondary" size="md" onPress={() => shiftDate(-1)} style={styles.dateBtn}>←</Button>
            <View style={styles.dateCenter}>
              <Text style={styles.dateText}>{formatDisplayDate(effectiveDate)}</Text>
              <Text style={styles.dateSub}>{doses.length ? `${doses.length} lần uống trong ngày` : 'Giờ theo ' + formatTimezoneLabel(viewTimezone)}</Text>
            </View>
            <Button variant="secondary" size="md" onPress={() => shiftDate(1)} style={styles.dateBtn}>→</Button>
          </View>
          <Button variant="ghost" size="md" onPress={() => setDate(null)} disabled={isToday}>Hôm nay</Button>
        </Card>

        {loading ? (
          <StateView state="loading" />
        ) : error ? (
          <StateView state="error" message={error} onRetry={load} />
        ) : doses.length === 0 ? (
          <Card>
            <Text style={styles.empty}>Không có lần uống nào ngày {formatDisplayDate(effectiveDate)}</Text>
          </Card>
        ) : (
          (['sang', 'trua', 'chieu', 'toi'] as const).map((b) => (
            groups[b].length === 0 ? null : (
              <Section key={b} title={`${BUOI_ICON[b]} ${BUOI_LABEL[b]}`} icon={undefined}>
                {groups[b].map((d) => (
                  <Card key={d.id} style={styles.doseCard}>
                    <TouchableOpacity
                      style={styles.doseRow}
                      onPress={() => { if (!isViewingOther) router.push(`/dose/${d.id}` as any); }}
                      activeOpacity={isViewingOther ? 1 : 0.75}
                      disabled={isViewingOther}
                    >
                      <Text style={styles.doseTime}>{formatTime(d.scheduledAt, viewTimezone)}</Text>
                      {d.imageUrl ? <Image source={{ uri: d.imageUrl }} style={styles.doseThumb} /> : null}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.doseName}>{d.medicationName || 'Thuốc'}</Text>
                        <Text style={styles.doseMeta}>
                          {d.dosageText ? `${d.dosageText} • ` : ''}
                          {DOSE_STATUS_ICON[d.status] || ''} {DOSE_STATUS_LABEL[d.status] || d.status}
                          {(d as any).isLateConfirmation ? ' (muộn)' : ''}
                        </Text>
                      </View>
                    </TouchableOpacity>
                    {canAct(d) ? (
                      <View style={styles.actionRow}>
                        <Button size="md" loading={actingId === d.id} disabled={!!actingId} onPress={() => actConfirm(d)} style={styles.actionBtn}>
                          Đã uống
                        </Button>
                        <Button variant="secondary" size="md" disabled={!!actingId} onPress={() => actSnooze(d)} style={styles.actionBtn}>
                          Hoãn
                        </Button>
                        <Button variant="secondary" size="md" disabled={!!actingId} onPress={() => { setCannotTarget(d); setActionError(null); }} style={styles.actionBtn}>
                          Không thể
                        </Button>
                      </View>
                    ) : null}
                  </Card>
                ))}
              </Section>
            )
          ))
        )}
      </ScrollView>

      <ReasonDialog
        title="Không thể uống thuốc"
        visible={!!cannotTarget}
        loading={!!actingId}
        error={actionError}
        onCancel={() => { setCannotTarget(null); setActionError(null); }}
        onConfirm={(reason) => void submitCannotTake(reason)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageHeader: { marginBottom: spacing.lg },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSub: { ...typography.body, color: colors.muted },
  dateCard: { marginBottom: spacing.lg },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dateBtn: { minWidth: 52 },
  dateCenter: { flex: 1, alignItems: 'center' },
  dateText: { ...typography.body, fontWeight: '700', color: colors.text },
  dateSub: { ...typography.bodySm, color: colors.muted, textAlign: 'center' },
  empty: { ...typography.body, color: colors.muted, textAlign: 'center' },
  doseCard: { marginBottom: spacing.sm },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  doseTime: { ...typography.body, fontWeight: '800', minWidth: 60, color: colors.primaryDark },
  doseThumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: colors.surface2 },
  doseName: { ...typography.body, fontWeight: '700', color: colors.text },
  doseMeta: { ...typography.bodySm, color: colors.muted },
  actionRow: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
