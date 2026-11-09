import { View, StyleSheet } from 'react-native';
import { Text } from './Text';
import { colors, spacing, radius, typography } from '../theme';

interface NoticeProps {
  tone?: 'success' | 'error' | 'info' | 'warning';
  icon?: string | false;
  children: React.ReactNode;
}

export function Notice({ tone = 'info', icon, children }: NoticeProps) {
  const toneStyles = {
    success: { borderColor: '#b6ddc5', backgroundColor: colors.successSoft, textColor: '#1d5233' },
    error: { borderColor: '#f0c3bf', backgroundColor: colors.dangerSoft, textColor: '#7a1a15' },
    info: { borderColor: '#b9d5ea', backgroundColor: colors.primarySoft, textColor: colors.primaryDark },
    warning: { borderColor: '#ecd3a8', backgroundColor: colors.warningSoft, textColor: colors.warning },
  };

  const s = toneStyles[tone];

  return (
    <View style={[styles.notice, { borderColor: s.borderColor, backgroundColor: s.backgroundColor }]}>
      {icon !== false && <Text style={styles.icon}>{icon === undefined ? 'ℹ️' : icon}</Text>}
      <Text style={[styles.text, { color: s.textColor }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  text: {
    ...typography.bodySm,
    flex: 1,
  },
});
