import { useCallback, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, Button, Notice, StateView, Text } from "../../components";
import { colors, spacing, typography, radius } from "../../theme";
import { getNotificationHistory } from "../../services/endpoints";
import type { NotificationHistoryItem } from "../../types";
import { formatDateTime } from "../../utils/dateTime";
import { useAuth } from "../../hooks/useAuth";

const PAGE_SIZE = 20;

const KIND_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; tone: string }> = {
  scheduled_reminder: { icon: "alarm-outline", label: "Nhắc uống thuốc", tone: colors.primary },
  overdue: { icon: "alert-circle-outline", label: "Quá giờ uống thuốc", tone: colors.warning },
  snooze: { icon: "time-outline", label: "Nhắc lại sau khi hoãn", tone: colors.accent },
  relative_alert: { icon: "people-outline", label: "Cảnh báo người thân", tone: colors.danger },
  wellness_check: { icon: "heart-outline", label: "Hỏi thăm sức khỏe", tone: colors.success },
  sync: { icon: "sync-outline", label: "Đồng bộ", tone: colors.muted },
};

function errorLabel(error: string | null): string {
  if (!error) return "Chưa gửi được";
  if (error === "no_active_device") return "Chưa có thiết bị nhận thông báo";
  if (error === "token_invalid") return "Thiết bị không còn hợp lệ";
  if (error === "FIREBASE_NOT_CONFIGURED") return "Máy chủ chưa cấu hình Firebase";
  if (error === "DeviceNotRegistered") return "Thiết bị chưa đăng ký nhận push";
  return error;
}

export default function NotificationsScreen() {
  const { timezone } = useAuth();
  const [items, setItems] = useState<NotificationHistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getNotificationHistory({ page, pageSize: PAGE_SIZE });
      setItems(res?.items || []);
      setTotal(res?.total || 0);
    } catch (e: any) {
      setError(e?.message || "Không thể tải lịch sử thông báo");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const failedCount = items.filter((item) => item.status !== "sent").length;

  function onRefresh() {
    setRefreshing(true);
    void load();
  }

  function openItem(item: NotificationHistoryItem) {
    if (item.kind === "wellness_check") {
      router.push("/health-journal" as any);
      return;
    }
    if (item.doseId) {
      router.push(`/dose/${item.doseId}` as any);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <Text style={styles.pageTitle}>Thông báo</Text>
        <Text style={styles.pageSub}>Toàn bộ thông báo push đã được tạo cho bạn, kể cả lần gửi chưa thành công.</Text>

        {loading ? (
          <StateView state="loading" />
        ) : error ? (
          <StateView state="error" message={error} onRetry={load} />
        ) : items.length === 0 ? (
          <Card>
            <Text style={styles.empty}>Chưa có thông báo nào</Text>
            <Text style={styles.emptyHint}>
              Các nhắc uống thuốc, cảnh báo và câu hỏi thăm sức khỏe bạn nhận được sẽ được lưu tại đây.
            </Text>
          </Card>
        ) : (
          <>
            {failedCount > 0 ? (
              <>
                <Notice tone="warning" icon="⚠️">
                  Trong trang này có {failedCount} thông báo chưa gửi được. Vào Hồ sơ → Cài đặt → “Bật / kiểm tra thông báo đẩy” để nhận push.
                </Notice>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={() => router.push("/settings" as any)}
                  style={styles.settingsBtn}
                >
                  Mở cài đặt thông báo
                </Button>
              </>
            ) : null}
            <Card style={styles.summaryCard}>
              <Text style={styles.summaryText}>
                🔔 {total} thông báo — trang {page}/{totalPages}
              </Text>
            </Card>

            <View style={styles.list}>
              {items.map((item) => {
                const meta = KIND_META[item.kind] || {
                  icon: "notifications-outline" as const,
                  label: "Thông báo",
                  tone: colors.muted,
                };
                const canOpen = item.kind === "wellness_check" || !!item.doseId;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => openItem(item)}
                    disabled={!canOpen}
                    style={({ pressed }) => [styles.item, pressed && canOpen && styles.itemPressed]}
                    accessibilityRole={canOpen ? "button" : undefined}
                  >
                    <View style={[styles.iconWrap, { backgroundColor: `${meta.tone}18` }]}>
                      <Ionicons name={meta.icon} size={24} color={meta.tone} />
                    </View>
                    <View style={styles.itemBody}>
                      <View style={styles.itemTop}>
                        <Text style={styles.itemKind}>{meta.label}</Text>
                        <Text style={styles.itemTime}>{formatDateTime(item.sentAt, timezone)}</Text>
                      </View>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.itemText} numberOfLines={4}>{item.body}</Text>
                      {item.status !== "sent" ? (
                        <Text style={styles.itemError}>⚠️ {errorLabel(item.error)}</Text>
                      ) : null}
                      {canOpen ? (
                        <Text style={styles.itemAction}>
                          {item.kind === "wellness_check" ? "Trả lời câu hỏi →" : "Xem chi tiết →"}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.pagination}>
              <Button
                variant="secondary"
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                style={styles.pageBtn}
              >
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  pageSub: { ...typography.body, color: colors.muted, marginBottom: spacing.lg },
  summaryCard: { marginBottom: spacing.md },
  summaryText: { ...typography.body, fontWeight: "700", color: colors.text },
  settingsBtn: { marginBottom: spacing.md },
  empty: { ...typography.body, color: colors.muted, textAlign: "center", fontWeight: "700" },
  emptyHint: { ...typography.bodySm, color: colors.muted, textAlign: "center", marginTop: 4 },
  list: { gap: spacing.sm },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  itemPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  itemBody: { flex: 1 },
  itemTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  itemKind: { ...typography.caption, fontWeight: "800", color: colors.primaryDark, flexShrink: 1 },
  itemTime: { ...typography.caption, color: colors.muted },
  itemTitle: { ...typography.body, fontWeight: "800", color: colors.text, marginTop: 2 },
  itemText: { ...typography.bodySm, color: colors.muted, marginTop: 2 },
  itemError: { ...typography.caption, color: colors.warning, fontWeight: "700", marginTop: 6 },
  itemAction: { ...typography.caption, color: colors.primary, fontWeight: "700", marginTop: 6 },
  pagination: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
  pageBtn: { flex: 1 },
});
