import { View, ViewProps, StyleSheet } from 'react-native';
import { colors, radius, spacing, shadows } from '../theme';

interface CardProps extends ViewProps {
  variant?: 'default' | 'flush' | 'highlight';
}

export function Card({ variant = 'default', style, children, ...props }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        variant === 'flush' && styles.flush,
        variant === 'highlight' && styles.highlight,
        style,
      ]}
      {...props}
    >
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
  flush: {
    padding: 0,
    overflow: 'hidden',
  },
  highlight: {
    backgroundColor: colors.primarySoft,
    borderColor: '#b9d5ea',
  },
});
