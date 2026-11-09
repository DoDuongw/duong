import { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, Alert, RefreshControl, TouchableOpacity, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Card, Button, Section, Notice, Text } from "../../components";
import { colors, spacing, typography, radius } from "../../theme";
import { useAuth } from "../../hooks/useAuth";
import { confirmDose, getTodayDoses, newClientRequestId } from "../../services/endpoints";
import type { DoseWithMedication, TodayDoses } from "../../types";
import { buoiOfIso, formatTime, todayYmd } from "../../utils/dateTime";
import { nextActionable } from "../../utils/doseStatus";

export default function HomeScreen() {
  const { user, profile, timezone } = useAuth();
  const [data, setData] = useState<TodayDoses | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getTodayDoses();
      setData(res);
    } catch (e) {
      setData(null);
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

  const doses: DoseWithMedication[] = data?.doses || [];
  const next = nextActionable(doses);
  const stats = data?.stats || { confirmed: 0, remaining: 0, total: 0 };
  const taken = stats.confirmed;
  const total = stats.total;
  const remaining = stats.remaining;
  const pct = total === 0 ? 0 : Math.round((taken / total) * 100);

  async function handleConfirm(dose?: DoseWithMedication | null) {
    const target = dose ?? next;
    if (!target) return;
    try {
      setActing(true);
      await confirmDose(target.id, newClientRequestId());
      await load();
      Alert.alert('Thành công', 'Đã ghi nhận đã uống thuốc');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể xác nhận');
    } finally {
      setActing(false);
    }
  }



  const groups: Record<string, DoseWithMedication[]> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const d of doses) {
    groups[buoiOfIso(d.scheduledAt, timezone)].push(d);
  }

  const displayName = (profile as any)?.displayName || (user as any)?.displayName;

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.primary} />}
      >
        <View style={styles.greeting}>
          <View style={styles.greetingTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>Xin chào{displayName ? `, ${displayName}` : ''} 👋</Text>
              <Text style={styles.date}>{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</Text>
            </View>
          </View>
          <View style={styles.progressCard}>
            <View style={styles.progressHead}>
              <Text style={styles.progressLabel}>Tiến độ hôm nay</Text>
              <Text style={styles.progressValue}>{taken}/{total} liều</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(pct, 100)}%` }]} />
            </View>
            <Text style={styles.progressHint}>{total === 0 ? 'Chưa có lịch uống thuốc hôm nay' : `Hoàn thành ${pct}%`}</Text>
          </View>
        </View>

        {next ? (
          <View style={styles.nowCard}>
            <View style={styles.nowLabelRow}>
              <Text style={styles.nowLabelText}>🔔 Cần uống bây giờ</Text>
            </View>
            <View style={styles.nowHead}>
              <Text style={styles.nowTime}>{formatTime(next.scheduledAt, timezone)}</Text>
              {next.imageUrl ? <Image source={{ uri: next.imageUrl }} style={styles.nowThumb} /> : null}
              <View style={styles.nowInfo}>
                <Text style={styles.nowName}>{next.medicationName || 'Thuốc'}</Text>
                <Text style={styles.nowMeta}>{next.dosageText || '1 viên'}</Text>
                {next.instructions ? <Text style={styles.nowMeta}>{next.instructions}</Text> : null}
              </View>
            </View>
            <Button loading={acting} disabled={acting} onPress={() => handleConfirm()}>
              Đã uống thuốc
            </Button>
            <Button
              variant="ghost"
              style={{ marginTop: 8 }}
              onPress={() => router.push(`/dose/${next.id}` as any)}
            >
              Nhắc lại sau / Không thể uống
            </Button>
          </View>
        ) : (
          <Notice tone="info" icon="✅">
            {total === 0 ? 'Hôm nay chưa có liều thuốc nào.' : 'Bạn đã hoàn thành tất cả liều thuốc hôm nay!'}
          </Notice>
        )}

        <Section title="Tiến độ hôm nay" icon="📊" description={`Hoàn thành ${pct}% số liều hôm nay.`}>
          <View style={styles.statGrid}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.success }]}>{taken}</Text>
              <Text style={styles.statLabel}>Đã uống</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{remaining}</Text>
              <Text style={styles.statLabel}>Còn lại</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{total}</Text>
              <Text style={styles.statLabel}>Tổng liều</Text>
            </View>
          </View>
          <Text style={styles.statSummary}>Đã xác nhận {taken} / còn {remaining} (tổng {total})</Text>
        </Section>

        <Section title="Lịch hôm nay theo buổi" icon="🗓️">
          {[
            { key: 'sang', label: 'Sáng', icon: '🌅' },
            { key: 'trua', label: 'Trưa', icon: '☀️' },
            { key: 'chieu', label: 'Chiều', icon: '🌤️' },
            { key: 'toi', label: 'Tối', icon: '🌙' },
          ].map((buoi) => (
            <View key={buoi.key} style={styles.dayPart}>
              <View style={styles.dayPartHead}>
                <Text style={styles.dayPartIcon}>{buoi.icon}</Text>
                <Text style={styles.dayPartTitle}>{buoi.label}</Text>
                <Text style={styles.dayPartCount}>{groups[buoi.key].length === 0 ? '—' : groups[buoi.key].length}</Text>
              </View>
              {groups[buoi.key].length === 0 ? (
                <Text style={styles.dayPartEmpty}>Không có lần uống nào</Text>
              ) : (
                groups[buoi.key].map((d) => (
                  <TouchableOpacity key={d.id} style={styles.doseItem} onPress={() => router.push(`/dose/${d.id}` as any)} activeOpacity={0.75}>
                    <Text style={styles.doseTime}>{formatTime(d.scheduledAt, timezone)}</Text>
                    {d.imageUrl ? <Image source={{ uri: d.imageUrl }} style={styles.doseThumb} /> : null}
                    <Text style={styles.doseName}>
                      {d.medicationName || 'Thuốc'} • {d.status === 'confirmed' ? 'Đã uống' : d.status === 'pending' || d.status === 'snoozed' || d.status === 'overdue' ? 'Chưa uống' : d.status === 'missed' ? 'Bỏ lỡ' : d.status === 'cannot_take' ? 'Không thể uống' : d.status}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ))}
        </Section>

        <View style={styles.shortcuts}>
          <Button variant="secondary" style={styles.shortcutBtn} onPress={() => router.push('/(tabs)/schedule')}>📅 Xem lịch</Button>
          <Button variant="secondary" style={styles.shortcutBtn} onPress={() => router.push('/family' as any)}>👨‍👩‍👧 Người thân</Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  greeting: {
    marginBottom: spacing.lg,
  },
  greetingTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  hello: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 2,
  },
  date: {
    ...typography.body,
    color: colors.muted,
  },
  progressCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.body,
    color: '#e8f3fb',
    fontWeight: '600',
  },
  progressValue: {
    ...typography.h2,
    color: '#fff',
  },
  progressBarBg: {
    height: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#7fd8a0',
    borderRadius: 999,
  },
  progressHint: {
    ...typography.bodySm,
    color: '#d4e7f5',
    marginTop: spacing.sm,
  },
  nowCard: {
    backgroundColor: '#fffcf2',
    borderWidth: 2,
    borderColor: '#f0c98a',
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  nowLabelRow: {
    marginBottom: spacing.md,
  },
  nowLabelText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8a5b00',
    letterSpacing: 0.3,
  },
  nowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e9d7a8',
    marginBottom: spacing.md,
  },
  nowTime: {
    fontSize: 42,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  nowThumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: '#fef3c7' },
  nowInfo: {
    flex: 1,
  },
  nowName: {
    ...typography.h2,
    color: colors.text,
  },
  nowMeta: {
    ...typography.bodySm,
    color: colors.muted,
    marginTop: 2,
  },
  statGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  stat: {
    flex: 1,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 2,
  },
  statSummary: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  dayPart: {
    marginBottom: spacing.md,
  },
  dayPartHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  dayPartIcon: {
    fontSize: 18,
  },
  dayPartTitle: {
    ...typography.body,
    fontWeight: '700',
    flex: 1,
  },
  dayPartCount: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: '600',
  },
  dayPartEmpty: {
    ...typography.bodySm,
    color: colors.muted,
    fontStyle: 'italic',
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shortcutBtn: {
    flex: 1,
  },
  nowActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  nowActionBtn: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: 4 },
  modalSub: { ...typography.bodySm, color: colors.muted, marginBottom: spacing.md },
  modalInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 48,
    color: colors.text,
    backgroundColor: colors.surface2,
    marginBottom: spacing.md,
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1 },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.sm,
    marginBottom: spacing.xs,
  },
  doseTime: {
    ...typography.body,
    fontWeight: '700',
    minWidth: 56,
    color: colors.primaryDark,
  },
  doseThumb: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface },
  doseName: {
    ...typography.bodySm,
    color: colors.text,
    flex: 1,
  },
});

