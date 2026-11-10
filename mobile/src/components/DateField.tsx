import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../theme";
import { Text } from "./Text";
import { Button } from "./Button";
import { clamp, pad2 } from "../utils/number";

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

const ROW_H = 46; // minHeight 42 + marginBottom 4

function NumberList({
  data,
  value,
  onChange,
  label,
  format = (n) => String(n),
}: {
  data: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
  format?: (n: number) => string;
}) {
  const ref = useRef<ScrollView>(null);
  useEffect(() => {
    const idx = data.indexOf(value);
    if (idx < 0) return;
    const t = setTimeout(() => {
      (ref.current as any)?.scrollTo?.({ y: Math.max(0, idx * ROW_H - 80), animated: false });
    }, 50);
    return () => clearTimeout(t);
  }, [value, data]);

  return (
    <View style={styles.listCol}>
      <Text style={styles.listLabel}>{label}</Text>
      <ScrollView ref={ref as any} style={styles.listScroll} contentContainerStyle={styles.listContent} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
        {data.map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              onPress={() => onChange(n)}
              style={[styles.row, selected && styles.rowSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.rowText, selected && styles.rowTextSelected]} numberOfLines={1}>{format(n)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function DateField({
  label,
  value,
  onChange,
  error,
  disabled,
  minYear = 1900,
  containerStyle,
  placeholder = "Chọn ngày (YYYY-MM-DD)",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  disabled?: boolean;
  minYear?: number;
  containerStyle?: any;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [y, setY] = useState(1990);
  const [mo, setMo] = useState(1);
  const [d, setD] = useState(1);
  const [manual, setManual] = useState("");

  const nowY = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: nowY - minYear + 1 }, (_, i) => nowY - i), [nowY, minYear]);
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
  const maxD = daysInMonth(y, mo);
  const days = useMemo(() => Array.from({ length: maxD }, (_, i) => i + 1), [maxD]);

  useEffect(() => {
    if (d > maxD) setD(maxD);
  }, [maxD, d]);

  function syncManual(yy: number, mm: number, dd: number) {
    setManual(`${yy}-${pad2(mm)}-${pad2(clamp(dd, 1, daysInMonth(yy, mm)))}`);
  }

  function openPicker() {
    if (disabled) return;
    const p = parseYmd(value);
    const yy = clamp(p.y, minYear, nowY);
    const dim = daysInMonth(yy, p.mo);
    const dd = clamp(p.d, 1, dim);
    setY(yy);
    setMo(p.mo);
    setD(dd);
    setManual(`${yy}-${pad2(p.mo)}-${pad2(dd)}`);
    setOpen(true);
  }

  function applyManual() {
    const v = manual.trim();
    if (!isValidYmd(v)) return;
    const p = parseYmd(v);
    const yy = clamp(p.y, minYear, nowY);
    const dd = clamp(p.d, 1, daysInMonth(yy, p.mo));
    setY(yy);
    setMo(p.mo);
    setD(dd);
    setManual(`${yy}-${pad2(p.mo)}-${pad2(dd)}`);
  }

  function commit() {
    // Ưu tiên giá trị đã áp dụng từ picker/state; nếu ô nhập hợp lệ thì dùng ô nhập.
    const manualV = manual.trim();
    if (isValidYmd(manualV)) {
      const p = parseYmd(manualV);
      const yy = clamp(p.y, minYear, nowY);
      const mm = p.mo;
      const dd = clamp(p.d, 1, daysInMonth(yy, mm));
      onChange(`${yy}-${pad2(mm)}-${pad2(dd)}`);
      setOpen(false);
      return;
    }
    const dd = clamp(d, 1, daysInMonth(y, mo));
    onChange(`${y}-${pad2(mo)}-${pad2(dd)}`);
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
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Chọn ngày</Text>
            <Text style={styles.modalHint}>Chạm vào Ngày/Tháng/Năm để chọn. Có thể nhập trực tiếp dạng YYYY-MM-DD.</Text>

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
              />
              <Button variant="secondary" size="md" onPress={applyManual}>Áp dụng</Button>
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewText}>{y}-{pad2(mo)}-{pad2(clamp(d, 1, daysInMonth(y, mo)))}</Text>
            </View>

            <View style={styles.pickerRow}>
              <NumberList data={days} value={clamp(d, 1, maxD)} onChange={(v) => { setD(v); syncManual(y, mo, v); }} label="Ngày" format={pad2} />
              <NumberList data={months} value={mo} onChange={(v) => { setMo(v); syncManual(y, v, d); }} label="Tháng" format={pad2} />
              <NumberList data={years} value={y} onChange={(v) => { setY(v); syncManual(v, mo, d); }} label="Năm" />
            </View>

            <View style={styles.actions}>
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
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, maxHeight: "92%" },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: 2 },
  modalHint: { ...typography.caption, color: colors.muted, marginBottom: spacing.sm, lineHeight: 18 },
  manualRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  manualInput: { flex: 1, minHeight: 46, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 16, fontWeight: "800", color: colors.text, backgroundColor: colors.surface2 },
  previewBox: { alignItems: "center", paddingVertical: 8, marginBottom: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: 12 },
  previewText: { fontSize: 22, fontWeight: "900", color: colors.primaryDark, letterSpacing: 0.5 },
  pickerRow: { flexDirection: "row", gap: spacing.xs, height: 280, marginBottom: spacing.sm },
  listCol: { flex: 1 },
  listLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  listScroll: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface2 },
  listContent: { padding: 6 },
  row: { minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 10, marginBottom: 4 },
  rowSelected: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primaryDark },
  rowText: { fontSize: 17, fontWeight: "700", color: colors.text },
  rowTextSelected: { color: "#fff", fontWeight: "900", fontSize: 18 },
  actions: { flexDirection: "row", gap: spacing.sm },
});
