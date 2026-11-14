import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../theme";
import { Text } from "./Text";
import { Button } from "./Button";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function isValidYmd(ymd: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((ymd || "").trim());
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

function parseYmd(value: string | undefined | null): { y: number; mo: number; d: number } {
  const now = new Date();
  const fallback = { y: Math.max(1900, now.getFullYear() - 30), mo: 1, d: 1 };
  if (!value) return fallback;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return fallback;
  return { y: clamp(+m[1], 1900, now.getFullYear() + 1), mo: clamp(+m[2], 1, 12), d: clamp(+m[3], 1, 31) };
}

function daysInMonth(y: number, mo: number) {
  return new Date(Date.UTC(y, mo, 0)).getUTCDate();
}

/** Thứ Hai = 0 ... Chủ Nhật = 6 */
function firstWeekdayMonday(y: number, mo: number) {
  return (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
}

function ymd(y: number, mo: number, d: number) {
  return `${y}-${pad2(mo)}-${pad2(d)}`;
}

function todayYmdLocal() {
  const d = new Date();
  return ymd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export function DateField({
  label,
  value,
  onChange,
  error,
  disabled,
  minYear = 1900,
  containerStyle,
  placeholder = "Chọn ngày (YYYY-MM-DD)",
  clearable = false,
  defaultValue,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  disabled?: boolean;
  minYear?: number;
  containerStyle?: any;
  placeholder?: string;
  clearable?: boolean;
  /** Ngày gợi ý khi ô đang trống (ví dụ ngày kết thúc = ngày bắt đầu). */
  defaultValue?: string;
}) {
  const nowY = new Date().getFullYear();
  const maxYear = nowY + 1;

  const [open, setOpen] = useState(false);
  const [y, setY] = useState(1990);
  const [mo, setMo] = useState(1);
  const [d, setD] = useState(1);
  const [viewY, setViewY] = useState(1990);
  const [viewM, setViewM] = useState(1);
  const [yearText, setYearText] = useState("1990");
  const [manual, setManual] = useState("");

  const selectedYmd = ymd(y, mo, d);
  const today = todayYmdLocal();
  const maxD = daysInMonth(viewY, viewM);
  const leadingBlanks = firstWeekdayMonday(viewY, viewM);
  const days = useMemo(() => Array.from({ length: maxD }, (_, i) => i + 1), [maxD]);
  const cells = useMemo(
    () => [...Array.from({ length: leadingBlanks }, () => null), ...days],
    [leadingBlanks, days],
  );

  function openPicker() {
    if (disabled) return;
    const p = parseYmd(value || defaultValue);
    const yy = clamp(p.y, minYear, maxYear);
    const dim = daysInMonth(yy, p.mo);
    const dd = clamp(p.d, 1, dim);
    setY(yy);
    setMo(p.mo);
    setD(dd);
    setViewYearValue(yy);
    setViewM(p.mo);
    setManual(ymd(yy, p.mo, dd));
    setOpen(true);
  }

  function setViewYearValue(next: number) {
    const v = clamp(next, minYear, maxYear);
    setViewY(v);
    setYearText(String(v));
  }

  function selectInView(year: number, month: number, day: number) {
    const dd = clamp(day, 1, daysInMonth(year, month));
    setY(year);
    setMo(month);
    setD(dd);
    setManual(ymd(year, month, dd));
  }

  function changeMonth(delta: number) {
    const next = new Date(Date.UTC(viewY, viewM - 1 + delta, 1));
    const ny = next.getUTCFullYear();
    const nm = next.getUTCMonth() + 1;
    setViewYearValue(ny);
    setViewM(nm);
    selectInView(ny, nm, d);
  }

  function changeYear(next: number) {
    const ny = clamp(next, minYear, maxYear);
    setViewYearValue(ny);
    selectInView(ny, viewM, d);
  }

  function applyYearText() {
    const digits = yearText.replace(/\D/g, "");
    if (digits.length !== 4) {
      setYearText(String(viewY));
      return;
    }
    const parsed = parseInt(digits, 10);
    changeYear(Number.isFinite(parsed) ? parsed : viewY);
  }

  function handleYearTyping(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    setYearText(digits);
    if (digits.length !== 4) return;
    const parsed = parseInt(digits, 10);
    if (!Number.isFinite(parsed)) return;
    const ny = clamp(parsed, minYear, maxYear);
    const dd = clamp(d, 1, daysInMonth(ny, viewM));
    setViewY(ny);
    setY(ny);
    setMo(viewM);
    setD(dd);
    setManual(ymd(ny, viewM, dd));
  }

  function chooseDay(day: number) {
    setY(viewY);
    setMo(viewM);
    setD(clamp(day, 1, daysInMonth(viewY, viewM)));
    setManual(ymd(viewY, viewM, clamp(day, 1, daysInMonth(viewY, viewM))));
  }

  function chooseToday() {
    const [ty, tm, td] = today.split("-").map(Number);
    setY(ty);
    setMo(tm);
    setD(td);
    setViewYearValue(ty);
    setViewM(tm);
    setManual(today);
  }

  function applyManual() {
    const v = manual.trim();
    if (!isValidYmd(v)) return;
    const p = parseYmd(v);
    const yy = clamp(p.y, minYear, maxYear);
    const dd = clamp(p.d, 1, daysInMonth(yy, p.mo));
    setY(yy);
    setMo(p.mo);
    setD(dd);
    setViewYearValue(yy);
    setViewM(p.mo);
    setManual(ymd(yy, p.mo, dd));
  }

  function commit() {
    const manualV = manual.trim();
    if (isValidYmd(manualV)) {
      const p = parseYmd(manualV);
      const yy = clamp(p.y, minYear, maxYear);
      const mm = p.mo;
      const dd = clamp(p.d, 1, daysInMonth(yy, mm));
      onChange(ymd(yy, mm, dd));
      setOpen(false);
      return;
    }
    onChange(selectedYmd);
    setOpen(false);
  }

  return (
    <View style={[styles.wrap, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={label || "Chọn ngày"}
      >
        <Ionicons name="calendar-outline" size={20} color={disabled ? colors.muted : colors.primary} />
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>{value || placeholder}</Text>
        {clearable && value ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation?.();
              onChange("");
            }}
            style={styles.clearBtn}
            accessibilityRole="button"
            accessibilityLabel="Xóa ngày"
          >
            <Ionicons name="close-circle" size={20} color={colors.muted} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.muted} />
        )}
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn ngày</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn} accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{selectedYmd}</Text>
                <Text style={styles.previewHint}>Chạm vào ngày trên lịch hoặc nhập trực tiếp.</Text>
              </View>

              <View style={styles.monthHeader}>
                <Pressable style={styles.navBtn} onPress={() => changeMonth(-1)} accessibilityLabel="Tháng trước">
                  <Text style={styles.navBtnText}>‹</Text>
                </Pressable>
                <View style={styles.monthCenter}>
                  <Text style={styles.monthTitle}>Tháng {viewM} / {viewY}</Text>
                  <Text style={styles.monthHint}>Chọn tháng và năm</Text>
                </View>
                <Pressable style={styles.navBtn} onPress={() => changeMonth(1)} accessibilityLabel="Tháng sau">
                  <Text style={styles.navBtnText}>›</Text>
                </Pressable>
              </View>

              <View style={styles.yearRow}>
                <Pressable style={styles.yearStep} onPress={() => changeYear(viewY - 1)} accessibilityLabel="Năm trước">
                  <Text style={styles.yearStepText}>−</Text>
                </Pressable>
                <TextInput
                  value={yearText}
                  onChangeText={handleYearTyping}
                  onBlur={applyYearText}
                  onSubmitEditing={applyYearText}
                  keyboardType="number-pad"
                  style={styles.yearInput}
                  accessibilityLabel="Nhập năm"
                />
                <Pressable style={styles.yearStep} onPress={() => changeYear(viewY + 1)} accessibilityLabel="Năm sau">
                  <Text style={styles.yearStepText}>+</Text>
                </Pressable>
                <Button variant="secondary" size="md" onPress={applyYearText}>Đổi năm</Button>
              </View>

              <View style={styles.monthGrid}>
                {MONTHS.map((m) => (
                  <Pressable
                    key={m}
                    style={[styles.monthChip, m === viewM && styles.monthChipSelected]}
                    onPress={() => {
                      setViewM(m);
                      selectInView(viewY, m, d);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: m === viewM }}
                  >
                    <Text style={[styles.monthChipText, m === viewM && styles.monthChipTextSelected]}>T{m}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.weekRow}>
                {WEEKDAYS.map((w) => (
                  <Text key={w} style={styles.weekday}>{w}</Text>
                ))}
              </View>

              <View style={styles.calendarGrid}>
                {cells.map((day, index) => {
                  if (day === null) return <View key={`blank-${index}`} style={styles.dayCell} />;
                  const cellYmd = ymd(viewY, viewM, day);
                  const isSelected = cellYmd === selectedYmd;
                  const isToday = cellYmd === today;
                  return (
                    <Pressable
                      key={cellYmd}
                      style={[styles.dayCell, isToday && styles.dayToday, isSelected && styles.daySelected]}
                      onPress={() => chooseDay(day)}
                      accessibilityRole="button"
                      accessibilityLabel={`Ngày ${day} tháng ${viewM} năm ${viewY}`}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <Text style={[styles.dayText, isToday && styles.dayTodayText, isSelected && styles.daySelectedText]}>
                        {day}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.calendarActions}>
                <Button variant="secondary" size="md" onPress={chooseToday} style={{ flex: 1 }}>Hôm nay</Button>
              </View>

              <Text style={styles.gridLabel}>Nhập chính xác (YYYY-MM-DD)</Text>
              <View style={styles.manualRow}>
                <TextInput
                  value={manual}
                  onChangeText={setManual}
                  onBlur={applyManual}
                  onSubmitEditing={applyManual}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted}
                  style={styles.manualInput}
                  autoCapitalize="none"
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                  accessibilityLabel="Nhập ngày"
                />
                <Button variant="secondary" size="md" onPress={applyManual}>Áp dụng</Button>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              {clearable ? (
                <Button variant="ghost" onPress={() => { onChange(""); setOpen(false); }} style={{ flex: 1 }}>Xóa</Button>
              ) : null}
              <Button variant="ghost" onPress={() => setOpen(false)} style={{ flex: 1 }}>Hủy</Button>
              <Button onPress={commit} style={{ flex: 1 }}>Xong</Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: { ...typography.bodySm, fontWeight: "700", color: colors.text, marginBottom: 6, marginTop: spacing.xs },
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface, paddingHorizontal: spacing.md },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { opacity: 0.6, backgroundColor: colors.surface2 },
  value: { ...typography.body, color: colors.text, flex: 1, fontWeight: "800" },
  placeholder: { color: colors.muted, fontWeight: "600" },
  clearBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, maxHeight: "94%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  modalTitle: { ...typography.h2, color: colors.text },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: colors.surface2 },
  modalScroll: { paddingBottom: spacing.sm },
  previewBox: { alignItems: "center", paddingVertical: 8, marginBottom: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: 14 },
  previewText: { fontSize: 24, fontWeight: "900", color: colors.primaryDark, letterSpacing: 0.5 },
  previewHint: { ...typography.caption, color: colors.primaryDark, marginTop: 2 },
  monthHeader: { flexDirection: "row", alignItems: "center", marginBottom: spacing.sm },
  navBtn: { width: 48, height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  navBtnText: { fontSize: 30, fontWeight: "900", color: colors.primary, lineHeight: 32 },
  monthCenter: { flex: 1, alignItems: "center" },
  monthTitle: { ...typography.body, fontWeight: "900", color: colors.text },
  monthHint: { ...typography.caption, color: colors.muted },
  yearRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  yearStep: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  yearStepText: { fontSize: 24, fontWeight: "900", color: colors.primary, lineHeight: 28 },
  yearInput: { flex: 1, minHeight: 44, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: spacing.sm, fontSize: 18, fontWeight: "800", color: colors.text, backgroundColor: colors.surface2, textAlign: "center" },
  monthGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: spacing.sm },
  monthChip: { width: "15%", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  monthChipSelected: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  monthChipText: { ...typography.bodySm, fontWeight: "700", color: colors.text },
  monthChipTextSelected: { color: "#fff", fontWeight: "900" },
  weekRow: { flexDirection: "row", marginBottom: 4 },
  weekday: { width: "14.285%", textAlign: "center", ...typography.caption, fontWeight: "800", color: colors.muted },
  calendarGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: { width: "14.285%", minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10 },
  dayToday: { borderWidth: 1.5, borderColor: colors.primary },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontSize: 17, fontWeight: "700", color: colors.text },
  dayTodayText: { color: colors.primaryDark, fontWeight: "900" },
  daySelectedText: { color: "#fff", fontWeight: "900" },
  calendarActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  gridLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", marginTop: spacing.sm, marginBottom: 6 },
  manualRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  manualInput: { flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16, fontWeight: "800", color: colors.text, backgroundColor: colors.surface2 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
