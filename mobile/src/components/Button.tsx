import React from 'react';
import { TouchableOpacity, Text, StyleSheet, TouchableOpacityProps, ActivityIndicator } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { useFontScale } from '../store/fontScale';

interface ButtonProps extends TouchableOpacityProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  loading?: boolean;
  block?: boolean;
  children: React.ReactNode;
}

/** Normalize children so raw strings/numbers are never direct children of the pressable (RN View). */
function renderChildren(children: React.ReactNode, textStyle: any): React.ReactNode {
  if (children == null || typeof children === 'boolean') return null;
  if (typeof children === 'string' || typeof children === 'number') {
    return <Text style={textStyle}>{children}</Text>;
  }
  if (Array.isArray(children)) {
    const nodes = children.map((child, i) => {
      if (child == null || typeof child === 'boolean') return null;
      if (typeof child === 'string' || typeof child === 'number') {
        return <Text key={i} style={textStyle}>{child}</Text>;
      }
      return child;
    });
    return nodes;
  }
  return children;
}

export function Button({ variant = 'primary', size = 'lg', loading, block, disabled, children, style, ...props }: ButtonProps) {
  const { multiplier } = useFontScale();
  const fontSize = Math.round((typography.body.fontSize ?? 18) * multiplier);
  const textStyle = [styles.text, styles[`${variant}Text` as const] as any, { fontSize }];
  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[variant],
        styles[size],
        block && { alignSelf: 'stretch' },
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
        renderChildren(children, textStyle)
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
