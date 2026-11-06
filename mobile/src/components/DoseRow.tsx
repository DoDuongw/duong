import { View, Text, StyleSheet } from 'react-native';
import { Card } from './Card';
import { Button } from './Button';
import { colors, spacing, radius, typography } from '../theme';

interface DoseRowProps {
  time: string;
  medicationName: string;
  dose: string;
  buoi?: string;
  status?: 'pending' | 'taken' | 'skipped' | 'late';
  onConfirm?: () => void;
}

export function DoseRow({ time, medicationName, dose, buoi, status = 'pending', onConfirm }: DoseRowProps) {
  const statusStyles = {
    pending: { bg: colors.surface, border: colors.border, text: colors.text },
    taken: { bg: '#f0faf4', border: '#b6ddc5', text: '#1d5233' },
    skipped: { bg: '#fff4f3', border: '#f0c3bf', text: '#7a1a15' },
    late: { bg: '#fff8ec', border: '#ecd3a8', text: colors.warning },
  }[status];

  return (
    <Card style={[styles.card, { backgroundColor: statusStyles.bg, borderColor: statusStyles.border }]}>
      <View style={styles.row}>
        <View style={styles.timeCol}>
          <Text style={styles.time}>{time}</Text>
          {buoi ? <Text style={styles.buoi}>{buoi}</Text> : null}
        </View>
        <View style={styles.info}>
          <Text style={[styles.name, { color: statusStyles.text }]}>{medicationName}</Text>
          <Text style={styles.meta}>{dose}</Text>
        </View>
        {status === 'pending' && onConfirm ? (
          <Button size="md" onPress={onConfirm} style={styles.btn}>
            Đã uống
          </Button>
        ) : (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {status === 'taken' ? 'Đã uống' : status === 'skipped' ? 'Bỏ qua' : status === 'late' ? 'Trễ' : 'Đang chờ'}
            </Text>
          </View>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timeCol: {
    alignItems: 'center',
    minWidth: 60,
  },
  time: {
    ...typography.h2,
    fontWeight: '800',
  },
  buoi: {
    ...typography.caption,
    color: colors.muted,
  },
  info: {
    flex: 1,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySm,
    color: colors.muted,
  },
  btn: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
  },
});