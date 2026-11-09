import { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Image, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Card, Button, StateView, Notice, Segmented, HistoryPanel, Text } from "../../components";
import { colors, spacing, typography } from "../../theme";
import { discontinueMedication, listMedications } from "../../services/endpoints";
import { useOwnerView } from "../../hooks/useOwnerView";
import type { Medication, MedicationStatus } from "../../types";

type MedTab = MedicationStatus | 'history';

const TAB_OPTIONS = [
  { value: 'active', label: 'Đang dùng' },
  { value: 'discontinued', label: 'Đã ngừng' },
  { value: 'history', label: 'Lịch sử' },
];

export default function MedicationsScreen() {
  const { ownerId, isViewingOther, ownerName } = useOwnerView();
  const [tab, setTab] = useState<MedTab>('active');
  const [items, setItems] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (tab === 'history') {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const data = await listMedications(tab, ownerId);
      setItems(Array.isArray(data) ? data : (data as any)?.items || []);
    } catch (e: any) {
      setError(e?.message || 'Không thể tải danh sách thuốc');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, ownerId]);

  useFocusEffect(
    useCallback(() => {
      if (tab === 'history') return;
      setLoading(true);
      load();
    }, [load, tab]),
  );

  async function doDiscontinue(med: Medication) {
    try {
      await discontinueMedication(med.id);
      await load();
    } catch (e: any) {
      const msg = e?.message || 'Không thể ngừng thuốc';
      if (Platform.OS === 'web' && typeof window !== 'undefined') window.alert(msg);
      else Alert.alert('Lỗi', msg);
    }
  }

  async function handleDiscontinue(med: Medication) {
    if (isViewingOther) return;
    const msg = `Ngừng “${med.name}”? Các lần uống sắp tới sẽ bị hủy, lịch sử vẫn giữ nguyên.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) void doDiscontinue(med);
      return;
    }
    Alert.alert('Ngừng thuốc', msg, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Ngừng thuốc', style: 'destructive', onPress: () => void doDiscontinue(med) },
    ]);
  }

  function onRefresh() {
    if (tab === 'history') {
      setRefreshing(true);
      setHistoryRefreshKey((k) => k + 1);
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    load();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{isViewingOther ? `Thuốc của ${ownerName}` : 'Thuốc của bạn'}</Text>
          <Text style={styles.pageSub}>
            {isViewingOther ? 'Chỉ xem' : 'Quản lý thuốc, lịch uống và xem lại lịch sử'}
          </Text>
        </View>

        {isViewingOther ? (
          <Notice tone="info" icon="👀">
            <Text style={{ color: colors.text }}>Bạn đang xem thuốc của {ownerName} — chỉ xem, không thêm/sửa/ngừng được.</Text>
            <Button variant="ghost" style={{ marginTop: 8, minHeight: 44 }} onPress={() => router.push('/family')}>
              ← Về danh sách người thân
            </Button>
          </Notice>
        ) : null}

        <Segmented value={tab} onChange={(v) => setTab(v as MedTab)} options={TAB_OPTIONS} />

        {tab === 'history' ? (
          <HistoryPanel refreshKey={historyRefreshKey} ownerId={ownerId} />
        ) : loading ? (
          <StateView state="loading" />
        ) : error ? (
          <StateView state="error" message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>
              {tab === 'active'
                ? 'Chưa có thuốc nào đang dùng'
                : 'Chưa có thuốc nào đã ngừng'}
            </Text>
            {tab === 'active' && !isViewingOther ? (
              <Text style={[styles.empty, { marginTop: 6 }]}>Bấm “Thêm thuốc” để bắt đầu.</Text>
            ) : null}
          </Card>
        ) : (
          items.map((m) => {
            const times = (m.schedules || []).map((s: any) => String(s.timeOfDay || '').slice(0, 5)).filter(Boolean).join(' · ');
            const isActive = m.status === 'active';
            return (
              <Card key={m.id} style={styles.medCard}>
                <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.medName}>{m.name}</Text>
                    {m.dosageText ? <Text style={styles.medMeta}>Liều: {m.dosageText}</Text> : null}
                    <Text style={styles.medMeta}>Giờ uống: {times || '—'}</Text>
                    <Text style={styles.medMeta}>
                      Từ {m.startDate}{m.endDate ? ` đến ${m.endDate}` : ' (không hạn)'}
                    </Text>
                    {m.instructions ? <Text style={styles.medMeta}>Hướng dẫn: {m.instructions}</Text> : null}
                    {!isActive ? <Text style={styles.medMeta}>Đã ngừng — chỉ xem, không sửa được nữa.</Text> : null}
                  </View>
                  {m.imageUrl ? (
                    <Image source={{ uri: m.imageUrl }} style={styles.thumb} />
                  ) : null}
                </View>
                {isActive && !isViewingOther ? (
                  <View style={styles.cardActions}>
                    <Button
                      variant="secondary"
                      size="md"
                      style={styles.cardActionBtn}
                      onPress={() => router.push(`/medication/${m.id}` as any)}
                    >
                      Sửa
                    </Button>
                    <Button
                      variant="danger"
                      size="md"
                      style={styles.cardActionBtn}
                      onPress={() => handleDiscontinue(m)}
                    >
                      Ngừng
                    </Button>
                  </View>
                ) : null}
              </Card>
            );
          })
        )}

        {tab === 'active' && !isViewingOther ? (
          <Button style={styles.addBtn} onPress={() => router.push('/medication-new' as any)}>
            + Thêm thuốc
          </Button>
        ) : null}

        {tab !== 'history' && !isViewingOther && items.length > 0 ? (
          <Text style={styles.hint}>Ngừng thuốc sẽ hủy các lần uống tương lai nhưng giữ nguyên lịch sử đã uống.</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageHeader: { marginBottom: spacing.lg },
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 4 },
  pageSub: { ...typography.body, color: colors.muted },
  empty: { ...typography.body, color: colors.muted, textAlign: 'center' },
  medCard: { marginBottom: spacing.md },
  medName: { ...typography.h2, marginBottom: spacing.xs, color: colors.text },
  medMeta: { ...typography.bodySm, color: colors.muted, marginTop: 2, lineHeight: 20 },
  addBtn: { marginTop: spacing.sm },
  cardActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  cardActionBtn: { flex: 1 },
  thumb: { width: 56, height: 56, borderRadius: 12, backgroundColor: colors.surface2 },
  hint: { ...typography.caption, color: colors.muted, marginTop: spacing.sm },
});
