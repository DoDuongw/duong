import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../theme";
import { Text } from "./Text";
import { Button } from "./Button";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function normalizeTimeInput(value: string): string {
  const v = (value || "").trim();
  if (!v) return "";
  const m = v.match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2})?$/);
  if (!m) return v;
  const h = clamp(parseInt(m[1], 10), 0, 23);
  const min = clamp(parseInt(m[2], 10), 0, 59);
  return `${pad2(h)}:${pad2(min)}`;
}

function parseTime(value: string): { h: number; m: number } {
  const norm = normalizeTimeInput(value);
  const m = norm.match(/^(\d{2}):(\d{2})$/);
  if (!m) return { h: 8, m: 0 };
  return { h: parseInt(m[1], 10), m: parseInt(m[2], 10) };
}

const QUICK_TIMES = ["07:00", "08:00", "12:00", "14:00", "20:00", "21:00"];

function SelectGrid({
  values,
  selected,
  onSelect,
  label,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  label: string;
}) {
  return (
    <View style={styles.gridBlock}>
      <Text style={styles.gridLabel}>{label}</Text>
      <View style={styles.grid}>
        {values.map((n) => {
          const isSelected = n === selected;
          return (
            <Pressable
              key={n}
              onPress={() => onSelect(n)}
              style={[styles.gridItem, isSelected && styles.gridItemSelected]}
              accessibilityRole="button"
              accessibilityLabel={`${label} ${pad2(n)}`}
              accessibilityState={{ selected: isSelected }}
            >
              <Text style={[styles.gridText, isSelected && styles.gridTextSelected]}>{pad2(n)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [h, setH] = useState(8);
  const [m, setM] = useState(0);
  const [manual, setManual] = useState("");

  const preview = useMemo(() => `${pad2(h)}:${pad2(m)}`, [h, m]);

  function setTime(nextH: number, nextM: number) {
    const nh = clamp(nextH, 0, 23);
    const nm = clamp(nextM, 0, 59);
    setH(nh);
    setM(nm);
    setManual(`${pad2(nh)}:${pad2(nm)}`);
  }

  function openPicker() {
    if (disabled) return;
    const p = parseTime(value || "08:00");
    setTime(p.h, p.m);
    setOpen(true);
  }

  function applyManual() {
    const norm = normalizeTimeInput(manual);
    if (/^\d{2}:\d{2}$/.test(norm)) {
      const p = parseTime(norm);
      setTime(p.h, p.m);
      setManual(norm);
    } else {
      setManual(preview);
    }
  }

  function commit() {
    const norm = /^\d{2}:\d{2}$/.test(normalizeTimeInput(manual))
      ? normalizeTimeInput(manual)
      : preview;
    const p = parseTime(norm);
    onChange(`${pad2(p.h)}:${pad2(p.m)}`);
    setOpen(false);
  }

  const display = normalizeTimeInput(value);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable
        onPress={openPicker}
        disabled={disabled}
        style={[styles.field, !!error && styles.fieldError, disabled && styles.fieldDisabled]}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display || "chưa chọn giờ"}`}
      >
        <Ionicons name="time-outline" size={20} color={disabled ? colors.muted : colors.primary} />
        <Text style={[styles.value, !display && styles.placeholder]}>{display || "Chọn giờ"}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn giờ uống</Text>
              <Pressable onPress={() => setOpen(false)} style={styles.closeBtn} accessibilityLabel="Đóng">
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{preview}</Text>
                <Text style={styles.previewHint}>Chạm vào ô giờ/phút bên dưới hoặc nhập trực tiếp.</Text>
              </View>

              <Text style={styles.quickLabel}>Chọn nhanh</Text>
              <View style={styles.quickRow}>
                {QUICK_TIMES.map((q) => (
                  <Pressable key={q} style={styles.quickChip} onPress={() => {
                    const p = parseTime(q);
                    setTime(p.h, p.m);
                  }}>
                    <Text style={styles.quickText}>{q}</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.stepperRow}>
                <View style={styles.stepperCard}>
                  <Text style={styles.stepperLabel}>Giờ</Text>
                  <View style={styles.stepperControls}>
                    <Pressable style={styles.stepBtn} onPress={() => setTime(h - 1, m)} accessibilityLabel="Giảm 1 giờ">
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{pad2(h)}</Text>
                    <Pressable style={styles.stepBtn} onPress={() => setTime(h + 1, m)} accessibilityLabel="Tăng 1 giờ">
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
                <View style={styles.stepperCard}>
                  <Text style={styles.stepperLabel}>Phút</Text>
                  <View style={styles.stepperControls}>
                    <Pressable style={styles.stepBtn} onPress={() => setTime(h, m - 5)} accessibilityLabel="Giảm 5 phút">
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{pad2(m)}</Text>
                    <Pressable style={styles.stepBtn} onPress={() => setTime(h, m + 5)} accessibilityLabel="Tăng 5 phút">
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <SelectGrid values={HOURS} selected={h} onSelect={(v) => setTime(v, m)} label="Giờ" />
              <SelectGrid values={MINUTE_STEPS} selected={m - (m % 5)} onSelect={(v) => setTime(h, v)} label="Phút" />

              <Text style={styles.gridLabel}>Nhập chính xác</Text>
              <View style={styles.manualRow}>
                <TextInput
                  value={manual}
                  onChangeText={setManual}
                  onBlur={applyManual}
                  onSubmitEditing={applyManual}
                  placeholder="HH:mm"
                  placeholderTextColor={colors.muted}
                  style={styles.manualInput}
                  autoCapitalize="none"
                  keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "default"}
                  accessibilityLabel="Nhập giờ phút"
                />
                <Button variant="secondary" size="md" onPress={applyManual}>Áp dụng</Button>
              </View>
            </ScrollView>

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
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { opacity: 0.6, backgroundColor: colors.surface2 },
  value: { ...typography.body, color: colors.text, flex: 1, fontWeight: "800" },
  placeholder: { color: colors.muted, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 4 },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: spacing.md },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border, maxHeight: "92%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.xs },
  modalTitle: { ...typography.h2, color: colors.text },
  closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: colors.surface2 },
  modalScroll: { paddingBottom: spacing.sm },
  previewBox: { alignItems: "center", paddingVertical: 10, marginBottom: spacing.sm, backgroundColor: colors.primarySoft, borderRadius: 14 },
  previewText: { fontSize: 34, fontWeight: "900", color: colors.primaryDark, letterSpacing: 1 },
  previewHint: { ...typography.caption, color: colors.primaryDark, marginTop: 2 },
  quickLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", marginBottom: 6 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.md },
  quickChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, minHeight: 44, justifyContent: "center" },
  quickText: { ...typography.bodySm, fontWeight: "800", color: colors.text },
  stepperRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  stepperCard: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: spacing.sm, backgroundColor: colors.surface2 },
  stepperLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", textAlign: "center", marginBottom: 4 },
  stepperControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stepBtnText: { fontSize: 26, fontWeight: "900", color: colors.primary, lineHeight: 30 },
  stepperValue: { fontSize: 28, fontWeight: "900", color: colors.text, minWidth: 52, textAlign: "center" },
  gridBlock: { marginBottom: spacing.sm },
  gridLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", marginBottom: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  gridItem: { width: "15%", minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
  gridItemSelected: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  gridText: { fontSize: 16, fontWeight: "700", color: colors.text },
  gridTextSelected: { color: "#fff", fontWeight: "900" },
  manualRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  manualInput: { flex: 1, minHeight: 48, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 18, fontWeight: "800", color: colors.text, backgroundColor: colors.surface2 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
