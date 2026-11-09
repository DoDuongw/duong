import React, { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../theme";
import { Text } from "./Text";
import { Button } from "./Button";
import { Input } from "./Input";
import { formatTimezoneLabel, timezoneOptions } from "../utils/dateTime";

export function TimezoneField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const options = useMemo(() => timezoneOptions(value), [value, open]);
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options.slice(0, 200);
    return options.filter((tz) => {
      const lab = formatTimezoneLabel(tz).toLowerCase();
      return tz.toLowerCase().includes(needle) || lab.includes(needle);
    }).slice(0, 200);
  }, [options, q]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <Pressable onPress={() => { setQ(""); setOpen(true); }} style={[styles.field, !!error && styles.fieldError]} accessibilityRole="button">
        <Ionicons name="globe-outline" size={20} color={colors.primary} />
        <Text style={styles.value} numberOfLines={1}>{value ? formatTimezoneLabel(value) : "Chọn múi giờ"}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.muted} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.hint}>Múi giờ dùng để tính ngày/giờ nhắc uống thuốc và xem lịch (kể cả khi người thân xem hộ). Thiết bị tự hiện giờ, nhưng lịch uống thuốc tính theo múi giờ hồ sơ này.</Text>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Chọn múi giờ</Text>
            <Input value={q} onChangeText={setQ} placeholder="Tìm: Việt Nam, Asia/Ho_Chi_Minh, GMT+7…" autoCapitalize="none" />
            <FlatList
              data={filtered}
              keyExtractor={(tz) => tz}
              keyboardShouldPersistTaps="handled"
              style={{ maxHeight: 360, marginTop: spacing.sm }}
              renderItem={({ item: tz }) => {
                const selected = tz === value;
                return (
                  <Pressable
                    onPress={() => { onChange(tz); setOpen(false); }}
                    style={[styles.row, selected && styles.rowSelected]}
                  >
                    <Text style={[styles.rowText, selected && styles.rowTextSelected]}>{formatTimezoneLabel(tz)}</Text>
                    <Text style={styles.rowCode} numberOfLines={1}>{tz}</Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={<Text style={styles.empty}>Không tìm thấy múi giờ phù hợp.</Text>}
            />
            <Button variant="ghost" onPress={() => setOpen(false)} style={{ marginTop: spacing.sm }}>Đóng</Button>
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
  value: { ...typography.body, color: colors.text, flex: 1, fontWeight: "700" },
  error: { color: colors.danger, fontSize: 13, fontWeight: "600", marginTop: 4 },
  hint: { ...typography.caption, color: colors.muted, marginTop: 6, lineHeight: 18 },
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "center", padding: spacing.lg },
  modal: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, maxHeight: "85%" },
  modalTitle: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
  row: { paddingVertical: 12, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: "transparent", marginBottom: 6, backgroundColor: colors.surface2 },
  rowSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowText: { ...typography.body, color: colors.text, fontWeight: "700" },
  rowTextSelected: { color: colors.primaryDark },
  rowCode: { ...typography.caption, color: colors.muted, marginTop: 2 },
  empty: { ...typography.bodySm, color: colors.muted, paddingVertical: spacing.md },
});