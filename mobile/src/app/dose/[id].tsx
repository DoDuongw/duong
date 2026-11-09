import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card, Button, StateView, ReasonDialog, Text } from '../../components';
import { colors, spacing, typography, radius } from '../../theme';
import { cannotTakeDose, confirmDose, getDose, newClientRequestId, snoozeDose } from '../../services/endpoints';
import { useAuth } from '../../hooks/useAuth';
import type { Dose, DoseWithMedication } from '../../types';
import { formatDateTime } from '../../utils/dateTime';
import { DOSE_STATUS_ICON, DOSE_STATUS_LABEL, isFinal } from '../../utils/doseStatus';

export default function DoseDetailScreen() {
  const { id, action } = useLocalSearchParams<{ id: string; action?: string }>();
  const doseId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const actionParam = typeof action === 'string' ? action : Array.isArray(action) ? action[0] : undefined;
  const { timezone, profile } = useAuth();

  const [dose, setDose] = useState<DoseWithMedication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);
  const handledAction = useRef(false);

  const viewTimezone = (dose as any)?.timezone ?? timezone;
  const canAct = (dose as any)?.canAct !== false;
  const final = dose ? isFinal(dose.status) : false;
  const snoozeMax = (profile as any)?.preferences?.snoozeMax ?? 3;
  const snoozeLeft = dose ? Math.max(0, snoozeMax - (dose.snoozeCount || 0)) : 0;

  const load = useCallback(async () => {
    if (!doseId) return;
    try {
      setError('');
      const data = await getDose(doseId);
      setDose(data);
    } catch (e: any) {
      setError(e?.message || 'Không tìm thấy lần uống');
    } finally {
      setLoading(false);
    }
  }, [doseId]);

  useEffect(() => {
    handledAction.current = false;
  }, [doseId]);

  useEffect(() => {
    load();
  }, [load]);

  function snoozeMessage(fresh: Dose): string {
    return (fresh as any).snoozedUntil
      ? `Đã hẹn nhắc lại lúc ${formatDateTime((fresh as any).snoozedUntil, viewTimezone)}`
      : 'Đã hẹn nhắc lại sau ít phút';
  }

  async function run(actionFn: () => Promise<Dose>, message: string | ((r: Dose) => string)) {
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const result = await actionFn();
      setSuccess(typeof message === 'function' ? message(result) : message);
      await load();
    } catch (e: any) {
      setActionError(e?.message || 'Không gửi được — kiểm tra kết nối và thử lại');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!actionParam || !dose || !canAct || handledAction.current || isFinal(dose.status)) return;
    handledAction.current = true;
    if (actionParam === 'confirm') {
      void run(() => confirmDose(dose.id, newClientRequestId()), 'Đã xác nhận uống thuốc');
    } else if (actionParam === 'snooze') {
      void run(() => snoozeDose(dose.id), snoozeMessage);
    } else if (actionParam === 'cannot' || actionParam === 'cannot_take') {
      setReasonOpen(true);
    }
  }, [actionParam, dose, canAct]);

  if (loading) return <StateView state="loading" />;
  if (error || !dose) return <StateView state="error" message={error || 'Không tìm thấy lần uống'} onRetry={load} />;

  const statusLabel = `${DOSE_STATUS_ICON[dose.status] || ''} ${DOSE_STATUS_LABEL[dose.status] || dose.status}`.trim();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Nhắc uống thuốc</Text>
          <View style={{ width: 40 }} />
        </View>

        <Card style={[styles.infoCard, !final && canAct ? styles.infoHighlight : null]}>
          {dose.imageUrl ? <Image source={{ uri: dose.imageUrl }} style={styles.medImage} resizeMode="cover" /> : null}
          <Text style={styles.medName}>{dose.medicationName ?? '(thuốc đã xóa)'}</Text>
          {dose.dosageText ? <Text style={styles.rowText}>Liều: {dose.dosageText}</Text> : null}
          <Text style={styles.rowText}>
            <Text style={styles.bold}>Giờ uống: </Text>
            {formatDateTime(dose.scheduledAt, viewTimezone)}
          </Text>
          {dose.instructions ? <Text style={styles.muted}>Hướng dẫn: {dose.instructions}</Text> : null}
          {dose.confirmedAt ? <Text style={styles.rowText}>Đã xác nhận lúc: {formatDateTime(dose.confirmedAt, viewTimezone)}</Text> : null}
          {dose.cannotTakeReason ? <Text style={styles.rowText}>Lý do không thể uống: {dose.cannotTakeReason}</Text> : null}
          {(dose as any).snoozedUntil ? <Text style={styles.rowText}>Nhắc lại lúc: {formatDateTime((dose as any).snoozedUntil, viewTimezone)}</Text> : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{statusLabel}{(dose as any).isLateConfirmation ? ' (muộn)' : ''}</Text>
          </View>
        </Card>

        {success ? (
          <Card style={styles.successCard}>
            <Text style={styles.successText}>{success}</Text>
          </Card>
        ) : null}
        {actionError && !reasonOpen ? (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{actionError}</Text>
          </Card>
        ) : null}

        {!canAct ? (
          <Card style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>👀 Chỉ xem</Text>
            <Text style={styles.muted}>Bạn đang xem lần uống này với tư cách người thân. Việc xác nhận phải do chủ hồ sơ thực hiện.</Text>
          </Card>
        ) : final ? (
          <Card style={styles.noticeCard}>
            <Text style={styles.muted}>Lần uống này đã kết thúc nên không thể thay đổi.</Text>
          </Card>
        ) : (
          <View style={styles.actions}>
            <Button block loading={busy && !reasonOpen} disabled={busy} onPress={() => void run(() => confirmDose(dose.id, newClientRequestId()), 'Đã xác nhận uống thuốc')}>
              Đã uống
            </Button>
            <Button
              block
              variant="secondary"
              disabled={busy || snoozeLeft <= 0}
              onPress={() => void run(() => snoozeDose(dose.id), snoozeMessage)}
              style={styles.actionBtn}
            >
              {snoozeLeft > 0 ? `Nhắc lại sau (${snoozeLeft} lần còn lại)` : 'Nhắc lại sau'}
            </Button>
            {snoozeLeft <= 0 ? <Text style={styles.mutedSmall}>Đã nhắc lại tối đa {snoozeMax} lần cho lần uống này.</Text> : null}
            <Button
              block
              variant="danger"
              disabled={busy}
              onPress={() => { setActionError(null); setReasonOpen(true); }}
              style={styles.actionBtn}
            >
              Không thể uống
            </Button>
          </View>
        )}

        <Button variant="ghost" block style={{ marginTop: spacing.md }} onPress={() => router.back()}>
          ← Quay lại
        </Button>
      </ScrollView>

      <ReasonDialog
        title="Không thể uống"
        visible={reasonOpen}
        loading={busy}
        error={actionError}
        onCancel={() => setReasonOpen(false)}
        onConfirm={(reason) => {
          setReasonOpen(false);
          void run(() => cannotTakeDose(dose.id, reason), 'Đã ghi nhận: không thể uống');
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  infoCard: { marginBottom: spacing.md },
  infoHighlight: { borderColor: '#f0c98a', borderWidth: 2, backgroundColor: '#fffcf2' },
  medImage: { width: '100%', height: 160, borderRadius: 12, backgroundColor: colors.surface2, marginBottom: spacing.sm },
  medName: { ...typography.h2, color: colors.text, marginBottom: spacing.xs },
  rowText: { ...typography.body, color: colors.text, marginTop: 4 },
  bold: { fontWeight: '700' },
  muted: { ...typography.bodySm, color: colors.muted, marginTop: 4 },
  mutedSmall: { ...typography.caption, color: colors.muted, marginTop: 4 },
  badge: { alignSelf: 'flex-start', marginTop: spacing.sm, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { ...typography.bodySm, fontWeight: '700', color: colors.text },
  successCard: { marginBottom: spacing.md, backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  successText: { ...typography.body, color: '#166534', fontWeight: '700' },
  errorCard: { marginBottom: spacing.md, backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  errorText: { ...typography.body, color: '#991b1b' },
  noticeCard: { marginBottom: spacing.md },
  noticeTitle: { ...typography.body, fontWeight: '800', color: colors.text, marginBottom: 4 },
  actions: { gap: 0 },
  actionBtn: { marginTop: spacing.sm },
});
