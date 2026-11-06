import { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button, Section, Notice } from "../../components";
import { colors, spacing, typography, radius } from "../../theme";
import { useAuth } from "../../hooks/useAuth";
import { confirmDose, getTodayDoses, newClientRequestId } from "../../services/endpoints";
import type { DoseWithMedication, TodayDoses } from "../../types";
import { BUOI_LABEL, formatTime } from "../../utils/dateTime";
import { nextActionable } from "../../utils/doseStatus";

export default function HomeScreen() {
  const { user } = useAuth();
  const [data, setData] = useState<TodayDoses | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const res = await getTodayDoses();
      setData(res);
    } catch (e) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const doses: DoseWithMedication[] = data?.doses || [];
  const next = nextActionable(doses);
  const taken = doses.filter((d) => d.status === 'taken').length;
  const total = doses.length;
  const remaining = total - taken;
  const pct = total === 0 ? 0 : Math.round((taken / total) * 100);

  async function handleConfirm() {
    if (!next) return;
    try {
      setActing(true);
      await confirmDose(next.id, newClientRequestId());
      await load();
      Alert.alert('Thành công', 'Đã ghi nhận đã uống thuốc');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể xác nhận');
    } finally {
      setActing(false);
    }
  }

  const groups: Record<string, DoseWithMedication[]> = {
    sang: [],
    trua: [],
    chieu: [],
    toi: [],
  };
  for (const d of doses) {
    const h = d.scheduledTime ? new Date(d.scheduledTime).getHours() : 8;
    if (h >= 5 && h < 11) groups.sang.push(d);
    else if (h >= 11 && h < 14) groups.trua.push(d);
    else if (h >= 14 && h < 18) groups.chieu.push(d);
    else groups.toi.push(d);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.greeting}>
          <Text style={styles.hello}>Xin chào{(user as any)?.displayName ? `, ${(user as any).displayName}` : ''} 👋</Text>
          <Text style={styles.date}>Hôm nay • {new Date().toLocaleDateString('vi-VN')}</Text>
          <View style={styles.progressWrap}>
            <View style={styles.progressHead}>
              <Text style={styles.progressText}>Tiến độ hôm nay</Text>
              <Text style={styles.progressText}>{taken}/{total} liều</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
            </View>
          </View>
        </View>

        {next ? (
          <View style={styles.nowCard}>
            <View style={styles.nowLabelRow}>
              <Text style={styles.nowLabelText}>🔔 Cần uống bây giờ</Text>
            </View>
            <View style={styles.nowHead}>
              <Text style={styles.nowTime}>{formatTime(next.scheduledTime)}</Text>
              <View style={styles.nowInfo}>
                <Text style={styles.nowName}>{next.medication?.name || 'Thuốc'}</Text>
                <Text style={styles.nowMeta}>Liều: {next.doseAmount ? `${next.doseAmount} ${next.doseUnit || ''}`.trim() : (next.medication?.dosageText || '1 viên')}</Text>
                {next.medication?.instructions ? <Text style={styles.nowMeta}>{next.medication.instructions}</Text> : null}
              </View>
            </View>
            <Button loading={acting} onPress={handleConfirm}>Đã uống thuốc</Button>
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
                  <View key={d.id} style={styles.doseItem}>
                    <Text style={styles.doseTime}>{formatTime(d.scheduledTime)}</Text>
                    <Text style={styles.doseName}>{d.medication?.name} • {d.status === 'taken' ? 'Đã uống' : d.status === 'pending' ? 'Chưa uống' : d.status}</Text>
                  </View>
                ))
              )}
            </View>
          ))}
        </Section>

        <View style={styles.shortcuts}>
          <Button variant="secondary" style={styles.shortcutBtn}>📅 Xem lịch uống thuốc</Button>
          <Button variant="secondary" style={styles.shortcutBtn}>👨‍👩‍👧 Người thân</Button>
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
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  hello: {
    ...typography.h1,
    color: '#fff',
    marginBottom: 4,
  },
  date: {
    ...typography.body,
    color: '#c8dcec',
  },
  progressWrap: {
    marginTop: spacing.lg,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressText: {
    ...typography.bodySm,
    color: '#fff',
    fontWeight: '600',
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
  },
  nowCard: {
    backgroundColor: colors.surface,
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
    ...typography.body,
    fontWeight: '700',
    color: colors.warning,
    letterSpacing: 0.5,
  },
  nowHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    flexWrap: 'wrap',
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e4c89a',
    borderStyle: 'dashed',
    marginBottom: spacing.md,
  },
  nowTime: {
    fontSize: 44,
    fontWeight: '800',
    color: colors.primaryDark,
  },
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
  ghostBtn: {
    marginTop: spacing.sm,
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
    fontSize: 30,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.muted,
  },
  statSummary: {
    ...typography.body,
    fontWeight: '600',
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
  },
  dayPartEmpty: {
    ...typography.bodySm,
    color: colors.muted,
  },
  shortcuts: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  shortcutBtn: {
    flex: 1,
  },
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  doseTime: {
    ...typography.body,
    fontWeight: '700',
    minWidth: 60,
  },
  doseName: {
    ...typography.bodySm,
    color: colors.text,
    flex: 1,
  },
});

