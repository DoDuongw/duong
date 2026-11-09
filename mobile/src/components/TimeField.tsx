import React, { useEffect, useRef, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../theme";
import { Text } from "./Text";
import { Button } from "./Button";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export function normalizeTimeInput(value: string): string {
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

const ROW_H = 48; // minHeight 44 + marginBottom 4

function NumberList({
  data,
  value,
  onChange,
  label,
}: {
  data: number[];
  value: number;
  onChange: (v: number) => void;
  label: string;
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
              <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{pad2(n)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
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

  function openPicker() {
    if (disabled) return;
    const p = parseTime(value || "08:00");
    setH(p.h);
    setM(p.m);
    setManual(`${pad2(p.h)}:${pad2(p.m)}`);
    setOpen(true);
  }

  useEffect(() => {
    setManual(`${pad2(h)}:${pad2(m)}`);
  }, [h, m]);

  function applyManual() {
    const norm = normalizeTimeInput(manual);
    if (/^\d{2}:\d{2}$/.test(norm)) {
      const p = parseTime(norm);
      setH(p.h);
      setM(p.m);
      setManual(norm);
    }
  }

  function commit() {
    const norm = normalizeTimeInput(manual) || `${pad2(h)}:${pad2(m)}`;
    const p = parseTime(norm);
    onChange(`${pad2(p.h)}:${pad2(p.m)}`);
    setOpen(false);
  }

  function quick(v: string) {
    const norm = normalizeTimeInput(v);
    onChange(norm);
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
            <Text style={styles.modalTitle}>Chọn giờ uống</Text>
            <Text style={styles.modalHint}>Chạm vào giờ/phút để chọn nhanh, hoặc nhập trực tiếp (HH:mm). Không cần cuộn chính xác vào vị trí bánh xe.</Text>

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
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                accessibilityLabel="Nhập giờ phút"
              />
              <Button variant="secondary" size="md" onPress={applyManual}>Áp dụng</Button>
            </View>

            <View style={styles.previewBox}>
              <Text style={styles.previewText}>{pad2(h)}:{pad2(m)}</Text>
            </View>

            <View style={styles.pickerRow}>
              <NumberList data={HOURS} value={h} onChange={setH} label="Giờ" />
              <NumberList data={MINUTES} value={m} onChange={setM} label="Phút" />
            </View>

            <View style={styles.quickRow}>
              {["07:00", "08:00", "12:00", "18:00", "20:00", "21:00"].map((q) => (
                <Pressable key={q} style={styles.quickChip} onPress={() => quick(q)}>
                  <Text style={styles.quickText}>{q}</Text>
                </Pressable>
              ))}
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
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: 2 },
  modalHint: { ...typography.caption, color: colors.muted, marginBottom: spacing.sm, lineHeight: 18 },
  manualRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  manualInput: { flex: 1, minHeight: 46, borderWidth: 1.5, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: spacing.md, fontSize: 18, fontWeight: "800", color: colors.text, backgroundColor: colors.surface2 },
  previewBox: { alignItems: "center", paddingVertical: 8, marginBottom: spacing.xs, backgroundColor: colors.primarySoft, borderRadius: 12 },
  previewText: { fontSize: 28, fontWeight: "900", color: colors.primaryDark, letterSpacing: 1 },
  pickerRow: { flexDirection: "row", gap: spacing.sm, height: 280, marginBottom: spacing.sm },
  listCol: { flex: 1 },
  listLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", textAlign: "center", marginBottom: 6 },
  listScroll: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface2 },
  listContent: { padding: 6 },
  row: { minHeight: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, marginBottom: 4 },
  rowSelected: { backgroundColor: colors.primary, borderWidth: 1, borderColor: colors.primaryDark },
  rowText: { fontSize: 18, fontWeight: "700", color: colors.text },
  rowTextSelected: { color: "#fff", fontWeight: "900", fontSize: 20 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.sm },
  quickChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  quickText: { ...typography.bodySm, fontWeight: "700", color: colors.text },
  actions: { flexDirection: "row", gap: spacing.sm },
});
