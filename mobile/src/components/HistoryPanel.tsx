import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { Card } from "./Card";
import { Section } from "./Section";
import { StateView } from "./StateView";
import { Button } from "./Button";
import { Text } from "./Text";
import { colors, spacing, typography, radius } from "../theme";
import { useAuth } from "../hooks/useAuth";
import { getHistory, listMedications } from "../services/endpoints";
import type { HistoryItem, Medication } from "../types";
import { formatDateTime, shiftYmd, todayYmd } from "../utils/dateTime";
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL } from "../utils/doseStatus";

const PAGE_SIZE = 20;
const RANGE_PRESETS: { label: string; days: number }[] = [
  { label: "7 ngày", days: 7 },
  { label: "30 ngày", days: 30 },
  { label: "90 ngày", days: 90 },
];

interface HistoryPanelProps {
  /** Tăng giá trị này để tải lại (dùng cho pull-to-refresh của màn cha). */
  refreshKey?: number;
  /** Khi người thân đang xem hồ sơ chủ khác. */
  ownerId?: string;
}

/** Nội dung "Lịch sử uống thuốc" — dùng chung trong tab Thuốc và route riêng. */
export function HistoryPanel({ refreshKey = 0, ownerId }: HistoryPanelProps) {
  const { timezone } = useAuth();
  const [from, setFrom] = useState(() => shiftYmd(todayYmd(timezone), -6));
  const [to, setTo] = useState(() => todayYmd(timezone));
  const [medicationId, setMedicationId] = useState("");
  const [page, setPage] = useState(1);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listMedications("active", ownerId), listMedications("discontinued", ownerId)])
      .then(([a, s]) => setMeds([...(a || []), ...(s || [])]))
      .catch(() => {});
  }, [ownerId]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getHistory({
        from,
        to,
        medicationId: medicationId || undefined,
        ownerId,
        page,
        pageSize: PAGE_SIZE,
      });
      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (e: any) {
      setError(e?.message || "Không thể tải lịch sử");
    } finally {
      setLoading(false);
    }
  }, [from, to, medicationId, page, ownerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, refreshKey]);

  function applyPreset(days: number) {
    setFrom(shiftYmd(todayYmd(timezone), -(days - 1)));
    setTo(todayYmd(timezone));
    setPage(1);
  }

  function adjustRange(which: "from" | "to", delta: number) {
    if (which === "from") setFrom((v) => shiftYmd(v, delta));
    else setTo((v) => shiftYmd(v, delta));
    setPage(1);
  }

  const activePreset = RANGE_PRESETS.find(
    (p) => from === shiftYmd(todayYmd(timezone), -(p.days - 1)) && to === todayYmd(timezone),
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <View>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Lịch sử uống thuốc</Text>
        <Text style={styles.pageSub}>Xem lại theo khoảng thời gian và thuốc</Text>
      </View>

      <Section title="Bộ lọc" icon="🔎">
        <View style={styles.rowWrap}>
          {RANGE_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.days}
              style={[styles.chip, activePreset?.days === preset.days && styles.chipActive]}
              onPress={() => applyPreset(preset.days)}
            >
              <Text style={[styles.chipText, activePreset?.days === preset.days && styles.chipTextActive]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.dateRange}>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Từ ngày</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity onPress={() => adjustRange("from", -1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.dateValue}>{from}</Text>
              <TouchableOpacity onPress={() => adjustRange("from", 1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
          <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>Đến ngày</Text>
            <View style={styles.dateControls}>
              <TouchableOpacity onPress={() => adjustRange("to", -1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.dateValue}>{to}</Text>
              <TouchableOpacity onPress={() => adjustRange("to", 1)} style={styles.smallBtn}><Text style={styles.smallBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <Text style={styles.filterLabel}>Thuốc</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rowWrap}>
          <TouchableOpacity
            style={[styles.chip, !medicationId && styles.chipActive]}
            onPress={() => {
              setMedicationId("");
              setPage(1);
            }}
          >
            <Text style={[styles.chipText, !medicationId && styles.chipTextActive]}>Tất cả</Text>
          </TouchableOpacity>
          {meds.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.chip, medicationId === m.id && styles.chipActive]}
              onPress={() => {
                setMedicationId(m.id);
                setPage(1);
              }}
            >
              <Text style={[styles.chipText, medicationId === m.id && styles.chipTextActive]} numberOfLines={1}>
                {m.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Section>

      {loading ? (
        <StateView state="loading" />
      ) : error ? (
        <StateView state="error" message={error} onRetry={load} />
      ) : items.length === 0 ? (
        <Card>
          <Text style={styles.empty}>🕘 Không có dữ liệu trong khoảng này</Text>
          <Text style={styles.emptyHint}>Thử mở rộng khoảng ngày hoặc bỏ lọc thuốc.</Text>
        </Card>
      ) : (
        <>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryText}>
              📊 {total} lần uống — trang {page}/{totalPages}
            </Text>
          </Card>

          {items.map((item) => (
            <HistoryCard key={item.id} item={item} timeZone={timezone} />
          ))}

          <View style={styles.pagination}>
            <Button variant="secondary" disabled={page <= 1} onPress={() => setPage((p) => Math.max(1, p - 1))} style={styles.pageBtn}>
              ← Trước
            </Button>
            <Button
              variant="secondary"
              disabled={page >= totalPages}
              onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={styles.pageBtn}
            >
              Sau →
            </Button>
          </View>
        </>
      )}
    </View>
  );
}

function HistoryCard({ item, timeZone }: { item: HistoryItem; timeZone: string }) {
  const label = `${DOSE_STATUS_ICON[item.status] || ""} ${DOSE_STATUS_LABEL[item.status] || item.status}`.trim();
  return (
    <Card style={styles.historyCard}>
      <View style={styles.historyTop}>
        <Text style={styles.historyName}>{item.medicationName ?? "(thuốc đã xóa)"}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{label}{item.isLateConfirmation ? " (muộn)" : ""}</Text>
        </View>
      </View>
      <Text style={styles.meta}>Giờ dự kiến: {formatDateTime(item.scheduledAt, timeZone)}</Text>
      <Text style={styles.meta}>Giờ gửi nhắc: {item.remindedAt ? formatDateTime(item.remindedAt, timeZone) : "—"}</Text>
      {item.status === "confirmed" ? (
        <Text style={styles.meta}>Đã xác nhận: {item.confirmedAt ? formatDateTime(item.confirmedAt, timeZone) : "—"}</Text>
      ) : null}
      {item.status === "cannot_take" ? <Text style={styles.meta}>Lý do: {item.cannotTakeReason ?? "—"}</Text> : null}
      {item.status === "missed" ? <Text style={styles.meta}>Không xác nhận và đã quá hạn.</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  pageHeader: { marginBottom: spacing.lg },
  pageTitle: { fontSize: 24, fontWeight: "800", color: colors.text, marginBottom: 4 },
  pageSub: { ...typography.body, color: colors.muted },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  chipText: { ...typography.bodySm, color: colors.text, fontWeight: "600" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "800" },
  dateRange: { gap: spacing.sm, marginBottom: spacing.sm },
  dateBox: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: spacing.sm },
  dateLabel: { ...typography.caption, color: colors.muted, marginBottom: 4 },
  dateControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateValue: { ...typography.body, fontWeight: "700", color: colors.text },
  smallBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  smallBtnText: { fontSize: 18, fontWeight: "800", color: colors.text },
  filterLabel: { ...typography.bodySm, fontWeight: "700", color: colors.text, marginBottom: 6 },
  summaryCard: { marginBottom: spacing.md },
  summaryText: { ...typography.body, fontWeight: "700", color: colors.text },
  empty: { ...typography.body, color: colors.muted, textAlign: "center", fontWeight: "700" },
  emptyHint: { ...typography.bodySm, color: colors.muted, textAlign: "center", marginTop: 4 },
  pagination: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  pageBtn: { flex: 1 },
  historyCard: { marginBottom: spacing.sm },
  historyTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm, marginBottom: 4 },
  historyName: { ...typography.body, fontWeight: "800", color: colors.text, flex: 1 },
  badge: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { ...typography.caption, fontWeight: "700", color: colors.text },
  meta: { ...typography.bodySm, color: colors.muted, marginTop: 2 },
});
