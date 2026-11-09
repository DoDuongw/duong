import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { useFontScale } from '../store/fontScale';

export function Input(props: TextInputProps) {
  const { multiplier } = useFontScale();
  const fontSize = Math.round((typography.body.fontSize ?? 18) * multiplier);
  const lineHeight = Math.round((typography.body.lineHeight ?? 28) * multiplier);
  return (
    <TextInput
      style={[styles.input, { fontSize, lineHeight }, props.style]}
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
    color: colors.text,
  },
});

