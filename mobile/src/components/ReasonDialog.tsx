import { useState } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Text } from './Text';
import { colors, spacing, typography, radius } from '../theme';
import { COMMON_CANNOT_TAKE_REASONS } from '../utils/doseStatus';
import { Button } from './Button';

export function ReasonDialog({
  title,
  visible,
  loading,
  error,
  onConfirm,
  onCancel,
}: {
  title: string;
  visible: boolean;
  loading?: boolean;
  error?: string | null;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState<string>(COMMON_CANNOT_TAKE_REASONS[0]);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const reason = (useCustom ? custom : selected).trim();

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={loading ? undefined : onCancel}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>Chọn lý do</Text>
          <ScrollView style={{ maxHeight: 320 }}>
            {COMMON_CANNOT_TAKE_REASONS.map((item) => {
              const checked = !useCustom && selected === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={styles.option}
                  onPress={() => {
                    setUseCustom(false);
                    setSelected(item);
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.radio, checked && styles.radioChecked]}>
                    {checked ? <View style={styles.radioDot} /> : null}
                  </View>
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={styles.option}
              onPress={() => setUseCustom(true)}
              activeOpacity={0.8}
            >
              <View style={[styles.radio, useCustom && styles.radioChecked]}>
                {useCustom ? <View style={styles.radioDot} /> : null}
              </View>
              <Text style={styles.optionText}>Lý do khác</Text>
            </TouchableOpacity>

            {useCustom ? (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.label}>Nhập lý do</Text>
                <TextInput
                  value={custom}
                  onChangeText={setCustom}
                  placeholder="Ví dụ: Bị đau dạ dày sau bữa ăn"
                  placeholderTextColor={colors.muted}
                  style={styles.input}
                  multiline
                  maxLength={500}
                />
              </View>
            ) : null}
          </ScrollView>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.actions}>
            <Button variant="ghost" onPress={onCancel} disabled={loading} style={{ flex: 1 }}>
              Hủy
            </Button>
            <Button variant="danger" onPress={() => onConfirm(reason)} disabled={!reason || loading} loading={loading} style={{ flex: 1 }}>
              Xác nhận
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.45)', justifyContent: 'center', padding: spacing.lg },
  panel: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, maxHeight: '85%' },
  title: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  label: { ...typography.bodySm, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: spacing.xs },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  radioChecked: { borderColor: colors.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionText: { ...typography.body, color: colors.text, flex: 1 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 72, color: colors.text, backgroundColor: colors.surface2, textAlignVertical: 'top' },
  error: { ...typography.bodySm, color: colors.danger, fontWeight: '600', marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
});
