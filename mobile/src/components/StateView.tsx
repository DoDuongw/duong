import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';
import { Button } from './Button';

interface StateViewProps {
  state: 'loading' | 'error' | 'empty';
  message?: string;
  hint?: string;
  emptyIcon?: string;
  onRetry?: () => void;
}

export function StateView({ state, message, hint, emptyIcon, onRetry }: StateViewProps) {
  if (state === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Đang tải…</Text>
      </View>
    );
  }

  if (state === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Đã xảy ra lỗi</Text>
        {message ? <Text style={styles.muted}>{message}</Text> : null}
        {onRetry ? <Button onPress={onRetry} style={styles.btn}>Thử lại</Button> : null}
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View style={styles.center}>
        <Text style={styles.icon}>{emptyIcon || '📭'}</Text>
        <Text style={styles.title}>{message || 'Không có dữ liệu'}</Text>
        {hint ? <Text style={styles.muted}>{hint}</Text> : null}
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...typography.h2,
    textAlign: 'center',
  },
  text: {
    ...typography.body,
    color: colors.muted,
  },
  muted: {
    ...typography.bodySm,
    color: colors.muted,
    textAlign: 'center',
  },
  btn: {
    marginTop: spacing.md,
  },
});
