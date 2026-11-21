import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '../theme';

export function Card({ style, children, ...props }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.xl,
    marginBottom: spacing.md,
    ...shadows.sm,
  },
});
