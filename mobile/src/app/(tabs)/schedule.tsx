import { useCallback, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
  Image,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Card, StateView, Button, Notice, ReasonDialog, Text } from "../../components";
import { colors, spacing, typography } from "../../theme";
import { useAuth } from "../../hooks/useAuth";
import { useOwnerView } from "../../hooks/useOwnerView";
import {
  cannotTakeDose,
  confirmDose,
  getDoseRange,
  getDosesByDate,
  newClientRequestId,
  snoozeDose,
} from "../../services/endpoints";
import type { DoseRangeDay, DoseWithMedication } from "../../types";
import {
  BUOI_LABEL,
  buoiOfIso,
  formatDisplayDate,
  formatTime,
  formatTimezoneLabel,
  shiftYmd,
  todayYmd,
  type Buoi,
} from "../../utils/dateTime";
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL, isActionable } from "../../utils/doseStatus";

const BUOI_ICON: Record<Buoi, string> = { sang: "🌅", trua: "☀️", chieu: "🌤️", toi: "🌙" };
const BUOIS: Buoi[] = ["sang", "trua", "chieu", "toi"];
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function daysInMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Thứ Hai = 0 ... Chủ Nhật = 6 */
function firstWeekdayMonday(y: number, m: number) {
  return (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
}

function monthTitle(y: number, m: number) {
  return `Tháng ${m} / ${y}`;
}

export default function ScheduleScreen() {
  const { timezone } = useAuth();
  const { ownerId, isViewingOther, ownerName, ownerTimezone } = useOwnerView();
  const viewTimezone = ownerTimezone ?? timezone;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const effectiveDate = selectedDate ?? todayYmd(viewTimezone);
  const today = todayYmd(viewTimezone);
  const isToday = effectiveDate === today;

  const initialYear = Number(effectiveDate.slice(0, 4)) || new Date().getFullYear();
  const initialMonth = Number(effectiveDate.slice(5, 7)) || new Date().getMonth() + 1;
  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const [doses, setDoses] = useState<DoseWithMedication[]>([]);
  const [monthDays, setMonthDays] = useState<Record<string, DoseRangeDay>>({});
  const [loading, setLoading] = useState(true);
  const [monthLoading, setMonthLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [cannotTarget, setCannotTarget] = useState<DoseWithMedication | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDay = useCallback(async () => {
    try {
      setError(null);
      const res = await getDosesByDate(effectiveDate, ownerId);
      setDoses(res?.doses || []);
    } catch (e: any) {
      setError(e?.message || "Không thể tải lịch");
    } finally {
      setLoading(false);
    }
  }, [effectiveDate, ownerId]);

  const loadMonth = useCallback(async () => {
    try {
      setMonthLoading(true);
      const from = ymd(viewYear, viewMonth, 1);
      const to = ymd(viewYear, viewMonth, daysInMonth(viewYear, viewMonth));
      const res = await getDoseRange(from, to, ownerId);
      const map: Record<string, DoseRangeDay> = {};
      for (const item of res?.days || []) map[item.date] = item;
      setMonthDays(map);
    } catch {
      setMonthDays({});
    } finally {
      setMonthLoading(false);
    }
  }, [viewYear, viewMonth, ownerId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadDay();
    }, [loadDay]),
  );

  useFocusEffect(
    useCallback(() => {
      void loadMonth();
    }, [loadMonth]),
  );

  function shiftDate(days: number) {
    const next = shiftYmd(effectiveDate, days);
    setSelectedDate(next);
    setViewYear(Number(next.slice(0, 4)));
    setViewMonth(Number(next.slice(5, 7)));
  }

  function goToday() {
    setSelectedDate(today);
    setViewYear(Number(today.slice(0, 4)));
    setViewMonth(Number(today.slice(5, 7)));
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    const ny = next.getUTCFullYear();
    const nm = next.getUTCMonth() + 1;
    setViewYear(ny);
    setViewMonth(nm);
    const [ty, tm] = today.split("-").map(Number);
    setSelectedDate(ny === ty && nm === tm ? today : ymd(ny, nm, 1));
  }

  function chooseDay(day: number) {
    setSelectedDate(ymd(viewYear, viewMonth, day));
  }

  const leadingBlanks = firstWeekdayMonday(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const calendarCells = useMemo(
    () => [
      ...Array.from({ length: leadingBlanks }, () => null as number | null),
      ...Array.from({ length: totalDays }, (_, i) => i + 1),
    ],
    [leadingBlanks, totalDays],
  );

  const monthPrefix = `${viewYear}-${pad2(viewMonth)}-`;
  const monthSummary = useMemo(() => {
    let total = 0;
    let confirmed = 0;
    let remaining = 0;
    for (const [date, item] of Object.entries(monthDays)) {
      if (!date.startsWith(monthPrefix)) continue;
      total += item.total;
      confirmed += item.confirmed;
      remaining += item.remaining;
    }
    return { total, confirmed, remaining };
  }, [monthDays, monthPrefix]);

  const groups: Record<Buoi, DoseWithMedication[]> = { sang: [], trua: [], chieu: [], toi: [] };
  for (const d of doses) groups[buoiOfIso(d.scheduledAt, viewTimezone)].push(d);

  const confirmedCount = doses.filter((d) => d.status === "confirmed").length;
  const remainingCount = doses.filter(
    (d) => !["confirmed", "cannot_take", "missed"].includes(d.status),
  ).length;

  function canAct(d: DoseWithMedication) {
    return !isViewingOther && (d as any).canAct !== false && isActionable(d.status);
  }

  function showError(msg: string) {
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.alert === "function") {
      window.alert(msg);
    } else {
      Alert.alert("Lỗi", msg);
    }
  }

  async function actConfirm(d: DoseWithMedication) {
    try {
      setActingId(d.id);
      setActionError(null);
      await confirmDose(d.id, newClientRequestId());
      await loadDay();
      void loadMonth();
    } catch (e: any) {
      showError(e?.message || "Không thể xác nhận");
    } finally {
      setActingId(null);
    }
  }

  async function actSnooze(d: DoseWithMedication) {
    try {
      setActingId(d.id);
      setActionError(null);
      await snoozeDose(d.id);
      await loadDay();
      void loadMonth();
    } catch (e: any) {
      showError(e?.message || "Không thể hoãn");
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
      await loadDay();
      void loadMonth();
    } catch (e: any) {
      setActionError(e?.message || "Không thể ghi nhận");
    } finally {
      setActingId(null);
    }
  }

  function dayDotColor(item: DoseRangeDay | undefined) {
    if (!item || item.total === 0) return null;
    if (item.missed + item.cannotTake > 0) return colors.danger;
    if (item.confirmed === item.total) return colors.success ?? "#15803d";
    return colors.primary;
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void Promise.all([loadDay(), loadMonth()]).finally(() => setRefreshing(false));
            }}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.pageTitle}>{isViewingOther ? `Lịch của ${ownerName}` : "Lịch"}</Text>
            <Text style={styles.pageSub}>
              {isViewingOther ? "Chỉ xem — không thay đổi được" : "Chọn ngày để xem và xử lý lần uống thuốc"}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Ionicons name="calendar" size={26} color={colors.primary} />
          </View>
        </View>

        {isViewingOther ? (
          <Notice tone="info" icon="👀">
            <Text style={{ color: colors.text }}>
              Đang xem lịch của {ownerName}. Bạn chỉ xem được, không thay đổi được lịch uống thuốc.
            </Text>
            <Button variant="ghost" style={{ marginTop: 8, minHeight: 44 }} onPress={() => router.push("/family")}>
              ← Về danh sách người thân
            </Button>
          </Notice>
        ) : null}

        <Card style={styles.calendarCard}>
          <View style={styles.monthRow}>
            <Pressable
              onPress={() => changeMonth(-1)}
              style={styles.monthNavBtn}
              accessibilityRole="button"
              accessibilityLabel="Tháng trước"
            >
              <Ionicons name="chevron-back" size={24} color={colors.primary} />
            </Pressable>
            <View style={styles.monthCenter}>
              <Text style={styles.monthTitle}>{monthTitle(viewYear, viewMonth)}</Text>
              <Text style={styles.monthSub}>
                {monthLoading
                  ? "Đang tải lịch tháng…"
                  : monthSummary.total > 0
                    ? `${monthSummary.total} lần uống • ${monthSummary.confirmed} đã uống`
                    : "Chưa có lần uống trong tháng"}
              </Text>
            </View>
            <Pressable
              onPress={() => changeMonth(1)}
              style={styles.monthNavBtn}
              accessibilityRole="button"
              accessibilityLabel="Tháng sau"
            >
              <Ionicons name="chevron-forward" size={24} color={colors.primary} />
            </Pressable>
          </View>

          <View style={styles.todayRow}>
            <Button variant="secondary" size="md" onPress={goToday} style={styles.todayBtn}>
              Hôm nay
            </Button>
            <Text style={styles.todayHint}>{formatTimezoneLabel(viewTimezone)}</Text>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {calendarCells.map((day, index) => {
              if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
              const cellDate = ymd(viewYear, viewMonth, day);
              const isSelected = cellDate === effectiveDate;
              const isTodayCell = cellDate === today;
              const item = monthDays[cellDate];
              const dotColor = dayDotColor(item);
              return (
                <Pressable
                  key={cellDate}
                  onPress={() => chooseDay(day)}
                  style={[styles.dayCell, isTodayCell && styles.dayToday, isSelected && styles.daySelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDisplayDate(cellDate)}${
                    item?.total ? `, ${item.total} lần uống` : ""
                  }`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isTodayCell && styles.dayTodayText,
                      isSelected && styles.daySelectedText,
                    ]}
                  >
                    {day}
                  </Text>
                  {dotColor ? (
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: isSelected ? "#fff" : dotColor },
                      ]}
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <View style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
            <Text style={styles.legendText}>Đã uống đủ</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
            <Text style={styles.legendText}>Còn lại</Text>
            <View style={[styles.legendDot, { backgroundColor: colors.danger }]} />
            <Text style={styles.legendText}>Bỏ lỡ / không thể</Text>
          </View>
        </Card>

        <Card style={styles.selectedCard}>
          <View style={styles.selectedHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedDate}>{formatDisplayDate(effectiveDate)}</Text>
              <Text style={styles.selectedSub}>
                {doses.length > 0
                  ? `${doses.length} lần uống • ${confirmedCount} đã uống • ${remainingCount} chưa uống`
                  : "Không có lần uống nào"}
              </Text>
            </View>
            <View style={styles.dayNav}>
              <Pressable
                onPress={() => shiftDate(-1)}
                style={styles.dayNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Ngày trước"
              >
                <Ionicons name="chevron-back" size={20} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => shiftDate(1)}
                style={styles.dayNavBtn}
                accessibilityRole="button"
                accessibilityLabel="Ngày sau"
              >
                <Ionicons name="chevron-forward" size={20} color={colors.primary} />
              </Pressable>
            </View>
          </View>
          {doses.length > 0 ? (
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${doses.length ? Math.round((confirmedCount / doses.length) * 100) : 0}%` },
                ]}
              />
            </View>
          ) : null}
          {!isToday ? (
            <Button variant="ghost" size="md" onPress={goToday} style={{ marginTop: spacing.xs }}>
              Quay về hôm nay
            </Button>
          ) : null}
        </Card>

        {loading ? (
          <StateView state="loading" />
        ) : error ? (
          <StateView state="error" message={error} onRetry={loadDay} />
        ) : doses.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Ionicons name="calendar-outline" size={42} color={colors.muted} />
            <Text style={styles.emptyTitle}>Không có lần uống nào</Text>
            <Text style={styles.emptyText}>
              {isToday
                ? "Hôm nay chưa có lịch uống thuốc. Bạn có thể thêm thuốc mới."
                : `Ngày ${formatDisplayDate(effectiveDate)} chưa có lần uống nào.`}
            </Text>
            {!isViewingOther ? (
              <Button onPress={() => router.push("/medication-new")} style={{ marginTop: spacing.md }}>
                + Thêm thuốc
              </Button>
            ) : null}
          </Card>
        ) : (
          BUOIS.map((b) =>
            groups[b].length === 0 ? null : (
              <View key={b} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>
                    {BUOI_ICON[b]} {BUOI_LABEL[b]}
                  </Text>
                  <Text style={styles.groupCount}>{groups[b].length} lần</Text>
                </View>
                {groups[b].map((d) => (
                  <Card key={d.id} style={styles.doseCard}>
                    <TouchableOpacity
                      style={styles.doseRow}
                      onPress={() => {
                        if (!isViewingOther) router.push(`/dose/${d.id}` as any);
                      }}
                      activeOpacity={isViewingOther ? 1 : 0.75}
                      disabled={isViewingOther}
                      accessibilityRole="button"
                    >
                      <View style={styles.timeBadge}>
                        <Text style={styles.doseTime}>{formatTime(d.scheduledAt, viewTimezone)}</Text>
                      </View>
                      {d.imageUrl ? (
                        <Image source={{ uri: d.imageUrl }} style={styles.doseThumb} />
                      ) : (
                        <View style={styles.doseThumbPlaceholder}>
                          <Ionicons name="medkit-outline" size={20} color={colors.primary} />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.doseName}>{d.medicationName || "Thuốc"}</Text>
                        <Text style={styles.doseMeta}>
                          {d.dosageText ? `${d.dosageText} • ` : ""}
                          {DOSE_STATUS_ICON[d.status] || ""} {DOSE_STATUS_LABEL[d.status] || d.status}
                          {(d as any).isLateConfirmation ? " (muộn)" : ""}
                        </Text>
                        {d.instructions ? (
                          <Text style={styles.doseInstruction} numberOfLines={1}>
                            {d.instructions}
                          </Text>
                        ) : null}
                      </View>
                      {!isViewingOther ? (
                        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                      ) : null}
                    </TouchableOpacity>
                    {canAct(d) ? (
                      <View style={styles.actionRow}>
                        <Button
                          size="md"
                          loading={actingId === d.id}
                          disabled={!!actingId}
                          onPress={() => actConfirm(d)}
                          style={styles.actionBtn}
                        >
                          Đã uống
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={!!actingId}
                          onPress={() => actSnooze(d)}
                          style={styles.actionBtn}
                        >
                          Hoãn
                        </Button>
                        <Button
                          variant="secondary"
                          size="md"
                          disabled={!!actingId}
                          onPress={() => {
                            setCannotTarget(d);
                            setActionError(null);
                          }}
                          style={styles.actionBtn}
                        >
                          Không thể
                        </Button>
                      </View>
                    ) : null}
                  </Card>
                ))}
              </View>
            ),
          )
        )}
      </ScrollView>

      <ReasonDialog
        title="Không thể uống thuốc"
        visible={!!cannotTarget}
        loading={!!actingId}
        error={actionError}
        onCancel={() => {
          setCannotTarget(null);
          setActionError(null);
        }}
        onConfirm={(reason) => void submitCannotTake(reason)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  pageTitle: { fontSize: 28, fontWeight: "900", color: colors.text, marginBottom: 2 },
  pageSub: { ...typography.bodySm, color: colors.muted },
  headerIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  calendarCard: { marginBottom: spacing.md, padding: spacing.sm },
  monthRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  monthNavBtn: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  monthCenter: { flex: 1, alignItems: "center" },
  monthTitle: { ...typography.body, fontWeight: "900", color: colors.text },
  monthSub: { ...typography.caption, color: colors.muted, textAlign: "center", marginTop: 2 },
  todayRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.sm },
  todayBtn: { minHeight: 44 },
  todayHint: { ...typography.caption, color: colors.muted, flexShrink: 1, textAlign: "right", marginLeft: spacing.sm },
  weekRow: { flexDirection: "row", marginBottom: 2 },
  weekday: { width: "14.285%", textAlign: "center", ...typography.caption, fontWeight: "800", color: colors.muted },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.285%", minHeight: 48, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 4 },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 17, fontWeight: "700", color: colors.text },
  dayTodayText: { color: colors.primaryDark, fontWeight: "900" },
  daySelectedText: { color: "#fff", fontWeight: "900" },
  dayDot: { width: 6, height: 6, borderRadius: 3, marginTop: 2 },
  legendRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginTop: spacing.sm, paddingHorizontal: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { ...typography.caption, color: colors.muted, marginRight: spacing.xs },
  selectedCard: { marginBottom: spacing.md },
  selectedHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  selectedDate: { ...typography.body, fontWeight: "900", color: colors.text, textTransform: "capitalize" },
  selectedSub: { ...typography.bodySm, color: colors.muted, marginTop: 2 },
  dayNav: { flexDirection: "row", gap: 6 },
  dayNavBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  progressTrack: { height: 8, borderRadius: 999, backgroundColor: colors.surface2, overflow: "hidden", marginTop: spacing.sm },
  progressFill: { height: 8, borderRadius: 999, backgroundColor: colors.primary },
  emptyCard: { alignItems: "center", paddingVertical: spacing.xl },
  emptyTitle: { ...typography.body, fontWeight: "800", color: colors.text, marginTop: spacing.sm },
  emptyText: { ...typography.bodySm, color: colors.muted, textAlign: "center", marginTop: 4 },
  group: { marginBottom: spacing.md },
  groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs, paddingHorizontal: 2 },
  groupTitle: { ...typography.body, fontWeight: "900", color: colors.text },
  groupCount: { ...typography.caption, color: colors.muted, fontWeight: "700" },
  doseCard: { marginBottom: spacing.sm },
  doseRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  timeBadge: { minWidth: 58, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center" },
  doseTime: { ...typography.bodySm, fontWeight: "900", color: colors.primaryDark },
  doseThumb: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.surface2 },
  doseThumbPlaceholder: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  doseName: { ...typography.body, fontWeight: "800", color: colors.text },
  doseMeta: { ...typography.bodySm, color: colors.muted, marginTop: 1 },
  doseInstruction: { ...typography.caption, color: colors.muted, marginTop: 2 },
  actionRow: { flexDirection: "row", gap: spacing.xs, marginTop: spacing.sm },
  actionBtn: { flex: 1 },
});
