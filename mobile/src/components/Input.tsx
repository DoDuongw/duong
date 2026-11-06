import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

export function Input(props: TextInputProps) {
  return (
    <TextInput
      style={[styles.input, props.style]}
      placeholderTextColor={colors.muted}
      {...props}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    width: '100%',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...typography.body,
    color: colors.text,
  },
});
