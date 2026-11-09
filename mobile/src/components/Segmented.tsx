import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius, typography } from '../theme';

interface Option {
  value: string;
  label: string;
}

interface SegmentedProps {
  label?: string;
  value: string;
  onChange: (value: any) => void;
  options: Option[];
}

export function Segmented({ label, value, onChange, options }: SegmentedProps) {
  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.segmented}>
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <TouchableOpacity
              key={opt.value}
              style={[styles.item, selected && styles.itemSelected]}
              onPress={() => onChange(opt.value)}
              activeOpacity={0.8}
            >
              <Text style={[styles.itemText, selected && styles.itemTextSelected]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    flex: 1,
    minHeight: 48,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  itemSelected: {
    backgroundColor: colors.surface,
    borderColor: colors.primary,
  },
  itemText: {
    ...typography.body,
    color: colors.muted,
    fontWeight: '600',
  },
  itemTextSelected: {
    color: colors.primary,
  },
});
