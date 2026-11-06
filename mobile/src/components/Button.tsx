import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  children: string;
}

export function Button({ variant = 'primary', size = 'lg', loading, disabled, children, style, ...props }: ButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        (disabled || loading) && styles.disabled,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : colors.primary} />
      ) : (
        <Text style={[styles.text, styles[`${variant}Text`]]}>{children}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: colors.danger,
  },
  md: {
    minHeight: 48,
  },
  lg: {
    minHeight: 56,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.body,
    fontWeight: '700',
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: colors.primary,
  },
  ghostText: {
    color: colors.primary,
  },
  dangerText: {
    color: '#fff',
  },
});
