import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from './Text';
import type { DoseWithMedication } from '../types';
import { formatDate, formatTime } from '../utils/dateTime';
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL, RELATIVE_ALERT_AFTER_MINUTES, unconfirmedAlerts } from '../utils/doseStatus';
import { colors, spacing, radius, typography } from '../theme';

interface Props {
  ownerName: string;
  timeZone: string;
  doses: DoseWithMedication[];
  date: string;
  today: string;
}

export function RelativeUnconfirmedAlert({ ownerName, timeZone, doses, date, today }: Props) {
  if (date !== today) return null;
  const items = unconfirmedAlerts(doses);
  if (items.length === 0) return null;

  const noun = items.length === 1 ? '1 lần uống thuốc' : `${items.length} lần uống thuốc`;
  const when = date === today ? 'hôm nay' : formatDate(date, timeZone);

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>
        ⚠️ {ownerName} chưa xác nhận {noun} {when}
      </Text>
      <Text style={styles.hint}>
        Đã quá {RELATIVE_ALERT_AFTER_MINUTES} phút kể từ giờ dự kiến (hoặc giờ nhắc lại). Hãy liên hệ để nhắc.
      </Text>
      <View style={styles.list}>
        {items.slice(0, 4).map((dose) => (
          <View key={dose.id} style={styles.item}>
            {dose.imageUrl ? <Image source={{ uri: dose.imageUrl }} style={styles.thumb} /> : null}
            <Text style={styles.itemText}>
              {DOSE_STATUS_ICON[dose.status] || ''} {dose.medicationName ?? 'Thuốc'} — {formatTime(dose.scheduledAt, timeZone)} · {DOSE_STATUS_LABEL[dose.status]}
            </Text>
          </View>
        ))}
        {items.length > 4 ? <Text style={styles.more}>…và {items.length - 4} lần khác</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  title: { ...typography.body, fontWeight: '800', color: '#92400e' },
  hint: { ...typography.bodySm, color: '#92400e', marginTop: 4 },
  list: { marginTop: spacing.xs },
  item: { paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 8 },
  thumb: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#fde68a' },
  itemText: { ...typography.bodySm, color: '#78350f', fontWeight: '600', flex: 1 },
  more: { ...typography.bodySm, color: '#92400e', marginTop: 2 },
});
