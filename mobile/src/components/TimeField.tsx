import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../theme";
import { Text } from "./Text";
import { Button } from "./Button";

const QUICK_TIMES = ["07:00", "08:00", "12:00", "14:00", "20:00", "21:00"];

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

  const preview = useMemo(() => `${pad2(h)}:${pad2(m)}`, [h, m]);

  function setTime(nextH: number, nextM: number) {
    setH(clamp(nextH, 0, 23));
    setM(clamp(nextM, 0, 59));
  }

  function openPicker() {
    if (disabled) return;
    const p = parseTime(value || "08:00");
    setH(p.h);
    setM(p.m);
    setOpen(true);
  }

  function commit() {
    onChange(preview);
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
        <Ionicons name="time-outline" size={22} color={disabled ? colors.muted : colors.primary} />
        <Text style={[styles.value, !display && styles.placeholder]}>{display || "Chọn giờ"}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chọn giờ uống</Text>
              <Pressable
                onPress={() => setOpen(false)}
                style={styles.closeBtn}
                accessibilityLabel="Đóng"
                accessibilityRole="button"
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalBody}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.previewBox}>
                <Text style={styles.previewText}>{preview}</Text>
                <Text style={styles.previewHint}>Chọn nhanh hoặc chỉnh bằng nút − / +</Text>
              </View>

              <Text style={styles.quickLabel}>Chọn nhanh</Text>
              <View style={styles.quickRow}>
                {QUICK_TIMES.map((q) => {
                  const selected = q === preview;
                  return (
                    <Pressable
                      key={q}
                      onPress={() => {
                        const p = parseTime(q);
                        setTime(p.h, p.m);
                      }}
                      style={[styles.quickChip, selected && styles.quickChipSelected]}
                      accessibilityRole="button"
                      accessibilityLabel={`Chọn ${q}`}
                      accessibilityState={{ selected }}
                    >
                      <Text style={[styles.quickText, selected && styles.quickTextSelected]}>{q}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.stepperRow}>
                <View style={styles.stepperCard}>
                  <Text style={styles.stepperLabel}>Giờ</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setTime(h - 1, m)}
                      accessibilityLabel="Giảm 1 giờ"
                      accessibilityRole="button"
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{pad2(h)}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setTime(h + 1, m)}
                      accessibilityLabel="Tăng 1 giờ"
                      accessibilityRole="button"
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.stepperCard}>
                  <Text style={styles.stepperLabel}>Phút</Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setTime(h, m - 5)}
                      accessibilityLabel="Giảm 5 phút"
                      accessibilityRole="button"
                    >
                      <Text style={styles.stepBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{pad2(m)}</Text>
                    <Pressable
                      style={styles.stepBtn}
                      onPress={() => setTime(h, m + 5)}
                      accessibilityLabel="Tăng 5 phút"
                      accessibilityRole="button"
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View style={styles.actions}>
              <Button variant="ghost" onPress={() => setOpen(false)} style={{ flex: 1 }}>
                Hủy
              </Button>
              <Button onPress={commit} style={{ flex: 1 }}>
                Xong
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.sm },
  label: {
    ...typography.bodySm,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 6,
    marginTop: spacing.xs,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 56,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  fieldError: { borderColor: colors.danger },
  fieldDisabled: { opacity: 0.6, backgroundColor: colors.surface2 },
  value: { ...typography.body, color: colors.text, flex: 1, fontWeight: "800", fontSize: 20 },
  placeholder: { color: colors.muted, fontWeight: "600" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 4 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.45)",
    justifyContent: "center",
    padding: spacing.md,
  },
  modal: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "92%",
    alignSelf: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalScroll: { flexShrink: 1 },
  modalBody: { paddingBottom: spacing.xs },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  modalTitle: { ...typography.h2, color: colors.text },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.surface2,
  },
  previewBox: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
  },
  previewText: { fontSize: 40, fontWeight: "900", color: colors.primaryDark, letterSpacing: 1 },
  previewHint: { ...typography.caption, color: colors.primaryDark, marginTop: 2, textAlign: "center" },
  quickLabel: { ...typography.caption, color: colors.muted, fontWeight: "800", marginBottom: 6 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.md },
  quickChip: {
    flexGrow: 1,
    flexBasis: "30%",
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipSelected: { backgroundColor: colors.primary, borderColor: colors.primaryDark },
  quickText: { ...typography.body, fontWeight: "800", color: colors.text },
  quickTextSelected: { color: "#fff", fontWeight: "900" },
  stepperRow: { gap: spacing.sm, marginBottom: spacing.md },
  stepperCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.sm,
    backgroundColor: colors.surface2,
  },
  stepperLabel: {
    ...typography.caption,
    color: colors.muted,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 4,
  },
  stepperControls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: { fontSize: 28, fontWeight: "900", color: colors.primary, lineHeight: 32 },
  stepperValue: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.text,
    minWidth: 56,
    textAlign: "center",
  },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
});
