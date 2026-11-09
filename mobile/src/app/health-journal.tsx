import { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Card, Button, Input, StateView, Text } from "../components";
import { colors, spacing, typography, radius } from "../theme";
import { answerHealthLog, getHealthLogs } from "../services/endpoints";
import type { HealthAnswer, HealthLogItem } from "../types";
import { formatDateTime } from "../utils/dateTime";
import { useAuth } from "../hooks/useAuth";

const PAGE_SIZE = 20;

const ANSWER_OPTIONS: { value: HealthAnswer; label: string; color: string; bg: string }[] = [
  { value: "good", label: "😊 Bình thường", color: colors.success, bg: colors.successSoft },
  { value: "tired", label: "😴 Hơi mệt", color: colors.warning, bg: colors.warningSoft },
  { value: "dizzy", label: "😵 Chóng mặt", color: colors.warning, bg: colors.warningSoft },
  { value: "unwell", label: "🤢 Khó chịu", color: colors.danger, bg: colors.dangerSoft },
  { value: "other", label: "📝 Khác", color: colors.muted, bg: colors.surface2 },
];

const ANSWER_LABEL: Record<HealthAnswer, string> = {
  good: "Bình thường",
  tired: "Hơi mệt",
  dizzy: "Chóng mặt",
  unwell: "Khó chịu",
  other: "Khác",
};

export default function HealthJournalScreen() {
  const { timezone } = useAuth();
  const [items, setItems] = useState<HealthLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getHealthLogs({ page, pageSize: PAGE_SIZE });
      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (e: any) {
      setError(e?.message || "Không thể tải nhật ký sức khỏe");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function onRefresh() {
    setRefreshing(true);
    load();
  }

  function handleAnswered(updated: HealthLogItem) {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <View style={styles.header}>
          <Button
            variant="ghost"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
          >
            ← Quay lại
          </Button>
        </View>
        <Text style={styles.pageTitle}>Nhật ký sức khỏe</Text>
        <Text style={styles.pageSub}>
          Sau khi bạn xác nhận uống thuốc 10 phút, hệ thống gửi câu hỏi thăm và lưu lại tại đây.
        </Text>

        {loading ? (
          <StateView state="loading" />
        ) : error ? (
          <StateView state="error" message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>Chưa có nhật ký sức khỏe</Text>
            <Text style={styles.emptyHint}>
              Hãy xác nhận uống thuốc trên trang chủ hoặc lịch uống. Sau 10 phút, câu hỏi thăm sẽ xuất hiện ở đây.
            </Text>
          </Card>
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                📝 {total} mục — trang {page}/{totalPages}
              </Text>
            </Card>

            {items.map((item) => (
              <HealthLogCard key={item.id} item={item} timezone={timezone} onAnswered={handleAnswered} />
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
      </ScrollView>
    </SafeAreaView>
  );
}

function HealthLogCard({
  item,
  timezone,
  onAnswered,
}: {
  item: HealthLogItem;
  timezone: string;
  onAnswered: (updated: HealthLogItem) => void;
}) {
  const [selected, setSelected] = useState<HealthAnswer | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answered = !!item.answer;
  const option = item.answer ? ANSWER_OPTIONS.find((o) => o.value === item.answer) : null;

  async function save() {
    if (!selected) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await answerHealthLog(item.id, {
        answer: selected,
        note: note.trim() || null,
      });
      onAnswered(updated);
    } catch (e: any) {
      setError(e?.message || "Không lưu được câu trả lời");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.logCard}>
      <View style={styles.logTop}>
        <Text style={styles.medName} numberOfLines={2}>
          {item.medicationName || "Thuốc"}
        </Text>
        <View style={[styles.statusPill, answered ? styles.statusDone : styles.statusPending]}>
          <Text style={[styles.statusText, answered ? styles.statusTextDone : styles.statusTextPending]}>
            {answered ? "Đã trả lời" : "Chờ trả lời"}
          </Text>
        </View>
      </View>

      <Text style={styles.time}>🕒 {formatDateTime(item.askedAt, timezone)}</Text>
      {item.scheduledAt ? (
        <Text style={styles.meta}>Giờ uống dự kiến: {formatDateTime(item.scheduledAt, timezone)}</Text>
      ) : null}
      <Text style={styles.question}>{item.question}</Text>

      {answered ? (
        <View style={[styles.answerBox, { backgroundColor: option?.bg || colors.surface2, borderColor: option?.color || colors.border }]}>
          <Text style={[styles.answerLabel, { color: option?.color || colors.text }]}>
            {option?.label || ANSWER_LABEL[item.answer as HealthAnswer]}
          </Text>
          {item.answerNote ? <Text style={styles.answerNote}>{item.answerNote}</Text> : null}
          {item.answeredAt ? (
            <Text style={styles.answerAt}>Trả lời lúc {formatDateTime(item.answeredAt, timezone)}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.answerForm}>
          <Text style={styles.answerPrompt}>Bạn cảm thấy thế nào?</Text>
          <View style={styles.chips}>
            {ANSWER_OPTIONS.map((o) => {
              const active = selected === o.value;
              return (
                <Pressable
                  key={o.value}
                  onPress={() => setSelected(o.value)}
                  style={[styles.chip, active && { backgroundColor: o.bg, borderColor: o.color }]}
                  accessibilityRole="button"
                  accessibilityLabel={o.label}
                >
                  <Text style={[styles.chipText, active && { color: o.color, fontWeight: "800" }]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {selected ? (
            <>
              <Input
                value={note}
                onChangeText={setNote}
                placeholder="Ghi chú thêm (không bắt buộc)"
                maxLength={500}
                style={styles.noteInput}
              />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Button onPress={() => void save()} loading={saving} disabled={saving} style={styles.saveBtn}>
                Lưu câu trả lời
              </Button>
            </>
          ) : null}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  pageSub: { ...typography.body, color: colors.muted, marginBottom: spacing.lg },
  summaryCard: { marginBottom: spacing.md },
  summaryText: { ...typography.body, fontWeight: "700", color: colors.text },
  empty: { ...typography.body, color: colors.muted, textAlign: "center", fontWeight: "700" },
  emptyHint: { ...typography.bodySm, color: colors.muted, textAlign: "center", marginTop: 4 },
  logCard: { marginBottom: spacing.md },
  logTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: 4 },
  medName: { ...typography.h3, color: colors.text, flex: 1 },
  statusPill: { borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 1 },
  statusDone: { backgroundColor: colors.successSoft, borderColor: colors.success },
  statusPending: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  statusText: { ...typography.caption, fontWeight: "800" },
  statusTextDone: { color: colors.success },
  statusTextPending: { color: colors.warning },
  time: { ...typography.bodySm, color: colors.primaryDark, fontWeight: "700", marginTop: 2 },
  meta: { ...typography.bodySm, color: colors.muted, marginTop: 2 },
  question: { ...typography.body, color: colors.text, marginTop: spacing.sm },
  answerForm: { marginTop: spacing.sm },
  answerPrompt: { ...typography.bodySm, fontWeight: "700", color: colors.text, marginBottom: 6 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipText: { ...typography.bodySm, color: colors.text, fontWeight: "600" },
  noteInput: { marginTop: spacing.sm },
  saveBtn: { marginTop: spacing.sm },
  error: { ...typography.bodySm, color: colors.danger, marginTop: spacing.xs },
  answerBox: { marginTop: spacing.sm, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md },
  answerLabel: { ...typography.body, fontWeight: "800" },
  answerNote: { ...typography.bodySm, color: colors.text, marginTop: 4 },
  answerAt: { ...typography.caption, color: colors.muted, marginTop: 4 },
  pagination: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  pageBtn: { flex: 1 },
});
