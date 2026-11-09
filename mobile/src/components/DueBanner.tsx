import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text } from './Text';
import { router } from 'expo-router';
import { useDueReminder } from '../hooks/useDueReminder';
import { confirmDose, newClientRequestId } from '../services/endpoints';
import { useAuth } from '../hooks/useAuth';
import { formatTime } from '../utils/dateTime';
import { colors, spacing, typography, radius } from '../theme';
import { Button } from './Button';

import * as Speech from 'expo-speech';

async function speakDueReminder(message: string) {
  try {
    Speech.stop();
    // Try to pick a Vietnamese voice when available (improves laptop/browser TTS)
    let voice: string | undefined;
    try {
      const voices = await Speech.getAvailableVoicesAsync?.();
      const vi = (voices || []).find((v: any) => /vi|vietnam/i.test(String(v?.language || v?.identifier || v?.name || '')));
      if (vi?.identifier) voice = vi.identifier;
    } catch {}
    Speech.speak(message, { language: 'vi-VN', voice, rate: 0.95, pitch: 1.0 } as any);
  } catch {
    // no-op
  }
}

export function DueBanner({ enabled = true }: { enabled?: boolean }) {
  const { timezone } = useAuth();
  const { due, dismiss, reload } = useDueReminder(enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const announcedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!due?.id) return;
    if (announcedRef.current === due.id) return;
    announcedRef.current = due.id;
    const name = due.medicationName ? `, ${due.medicationName}` : '';
    void speakDueReminder(`Đến giờ uống thuốc${name}. Vui lòng kiểm tra và xác nhận.`);
  }, [due?.id, due?.medicationName]);

  if (!due) return null;

  async function confirm() {
    if (!due) return;
    setBusy(true);
    setError(null);
    try {
      await confirmDose(due.id, newClientRequestId());
      dismiss(due.id);
      reload();
    } catch (e: any) {
      setError(e?.message || 'Không gửi được — thử lại');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap} accessibilityRole="alert">
      <Text style={styles.title}>🔔 Đến giờ uống thuốc</Text>
      <View style={styles.bodyRow}>
        {due.imageUrl ? <Image source={{ uri: due.imageUrl }} style={styles.thumb} /> : null}
        <Text style={styles.body}>
          <Text style={styles.bold}>{formatTime(due.scheduledAt, timezone)}</Text> · {due.medicationName ?? 'Thuốc'}
          {due.dosageText ? ` — ${due.dosageText}` : ''}
        </Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.actions}>
        <Button size="md" loading={busy} disabled={busy} onPress={() => void confirm()} style={{ flex: 1 }}>
          Đã uống
        </Button>
        <Button size="md" variant="secondary" disabled={busy} onPress={() => router.push(`/dose/${due.id}` as any)} style={{ flex: 1 }}>
          Chi tiết
        </Button>
        <Button size="md" variant="ghost" disabled={busy} onPress={() => dismiss(due.id)} style={{ flex: 1 }}>
          Để sau
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fcd34d',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  title: { ...typography.body, fontWeight: '800', color: '#92400e' },
  bodyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  thumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#fde68a' },
  body: { ...typography.bodySm, color: '#78350f', flex: 1 },
  bold: { fontWeight: '800' },
  error: { ...typography.caption, color: '#b91c1c', marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.sm },
});
