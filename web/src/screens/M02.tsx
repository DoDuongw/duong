import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { DoseStatusBadge } from '../components/DoseRow';
import { ReasonDialog } from '../components/Dialog';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { StateView } from '../components/StateView';
import { Text } from '../components/Text';
import { useApi } from '../hooks/useApi';
import { ApiError } from '../services/api';
import { cannotTakeDose, confirmDose, getDose, newClientRequestId, snoozeDose } from '../services/endpoints';
import { useAuth } from '../store/authContext';
import type { Dose } from '../types';
import { formatDateTime } from '../utils/dateTime';
import { isFinal } from '../utils/doseStatus';

/**
 * M02 — Nhắc uống thuốc: xác nhận một lần uống cụ thể
 * (mở từ thông báo Web Push hoặc M01/M03).
 *
 * Bố cục tối giản: một thẻ thông tin + 3 nút hành động lớn xếp dọc,
 * hành động chính (“Đã uống”) luôn ở trên cùng.
 */
export function M02() {
  const { doseId } = useParams<{ doseId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { timezone, profile } = useAuth();

  const { loading, data: dose, error, refetch } = useApi(() => getDose(doseId!), [doseId]);

  /**
   * Người thân mở hộ lần uống của chủ hồ sơ (`canAct=false`) → chỉ xem, không hành động.
   * Múi giờ hiển thị lấy theo CHỦ hồ sơ (backend trả trong GET /doses/:id) nếu xem hộ.
   */
  const viewTimezone = dose?.timezone ?? timezone;
  const canAct = dose?.canAct !== false;

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reasonOpen, setReasonOpen] = useState(false);

  // Hành động đến từ action của thông báo (sw.js mở /dose/:id?action=confirm|snooze|cannot)
  const action = searchParams.get('action');
  const handledAction = useRef(false);

  useEffect(() => {
    handledAction.current = false;
  }, [doseId]);

  useEffect(() => {
    if (!action || !dose || !canAct || handledAction.current || isFinal(dose.status)) return;
    handledAction.current = true;
    if (action === 'confirm') {
      void run(() => confirmDose(dose.id, newClientRequestId()), 'Đã xác nhận uống thuốc');
    } else if (action === 'snooze') {
      void run(() => snoozeDose(dose.id), snoozeMessage);
    } else if (action === 'cannot') {
      setReasonOpen(true);
    }
    // Xóa query để không lặp lại hành động khi tải lại
    const next = new URLSearchParams(searchParams);
    next.delete('action');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [action, dose]);

  /** Thông báo dùng đúng số phút đã hẹn (lấy từ `snoozedUntil` backend trả về). */
  function snoozeMessage(fresh: Dose): string {
    return fresh.snoozedUntil
      ? `Đã hẹn nhắc lại lúc ${formatDateTime(fresh.snoozedUntil, viewTimezone)}`
      : 'Đã hẹn nhắc lại sau ít phút';
  }

  async function run<T>(action: () => Promise<T>, message: string | ((result: T) => string)) {
    setBusy(true);
    setActionError(null);
    setSuccess(null);
    try {
      const result = await action();
      setSuccess(typeof message === 'function' ? message(result) : message);
      window.dispatchEvent(new Event('dose:changed'));
      refetch();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : 'Không gửi được — kiểm tra kết nối và thử lại');
    } finally {
      setBusy(false);
    }
  }

  const final = dose ? isFinal(dose.status) : false;
  /** Giới hạn nhắc lại lấy theo cài đặt M08 (`users.preferences.snoozeMax`, mặc định 3) */
  const snoozeMax = profile?.preferences?.snoozeMax ?? 3;
  const snoozeLeft = dose ? Math.max(0, snoozeMax - dose.snoozeCount) : 0;

  return (
    <>
      <h1>Nhắc uống thuốc</h1>

      {loading ? (
        <Card>
          <StateView state="loading" />
        </Card>
      ) : error || !dose ? (
        <Card>
          <StateView state="error" message={error ?? 'Không tìm thấy lần uống'} onRetry={refetch} />
        </Card>
      ) : (
        <>
          <Section title={dose.medicationName ?? '(thuốc đã xóa)'} icon="💊" highlight={!final && canAct}>
            {dose.dosageText && <Text>Liều: {dose.dosageText}</Text>}
            <Text>
              <strong>Giờ uống:</strong> {formatDateTime(dose.scheduledAt, viewTimezone)}
            </Text>
            {dose.instructions && <Text muted>Hướng dẫn: {dose.instructions}</Text>}
            {dose.confirmedAt && <Text>Đã xác nhận lúc: {formatDateTime(dose.confirmedAt, viewTimezone)}</Text>}
            {dose.cannotTakeReason && <Text>Lý do không thể uống: {dose.cannotTakeReason}</Text>}
            {dose.snoozedUntil && <Text>Nhắc lại lúc: {formatDateTime(dose.snoozedUntil, viewTimezone)}</Text>}
            <div style={{ marginTop: 10 }}>
              <DoseStatusBadge status={dose.status} late={dose.isLateConfirmation} />
            </div>
          </Section>

          {success && (
            <Notice tone="success" icon={false}>
              <Text strong as="span" style={{ color: 'inherit' }}>
                {success}
              </Text>
            </Notice>
          )}

          {actionError && (
            <Notice tone="error" icon={false}>
              {actionError}
            </Notice>
          )}

          {!canAct ? (
            <Notice tone="info" icon="👀">
              <Text strong as="span" style={{ color: 'inherit' }}>
                Chỉ xem
              </Text>
              <Text as="div" muted style={{ margin: 0, fontSize: 'calc(16px * var(--font-mult))' }}>
                Bạn đang xem lần uống này với tư cách người thân. Việc xác nhận phải do chủ hồ sơ thực hiện.
              </Text>
            </Notice>
          ) : final ? (
            <Notice tone="info" icon={false}>
              Lần uống này đã kết thúc nên không thể thay đổi.
            </Notice>
          ) : (
            <div className="stack">
              <Button
                block
                loading={busy}
                onClick={() => void run(() => confirmDose(dose.id, newClientRequestId()), 'Đã xác nhận uống thuốc')}
              >
                Đã uống
              </Button>
              <Button
                block
                variant="secondary"
                disabled={busy || snoozeLeft <= 0}
                onClick={() => void run(() => snoozeDose(dose.id), snoozeMessage)}
              >
                Nhắc lại sau{snoozeLeft > 0 ? ` (${snoozeLeft} lần còn lại)` : ''}
              </Button>
              {snoozeLeft <= 0 && <Text muted>Đã nhắc lại tối đa {snoozeMax} lần cho lần uống này.</Text>}
              <Button
                block
                variant="danger"
                disabled={busy}
                onClick={() => {
                  setActionError(null);
                  setReasonOpen(true);
                }}
              >
                Không thể uống
              </Button>
            </div>
          )}
        </>
      )}

      <Button variant="ghost" block style={{ marginTop: 12 }} onClick={() => navigate(-1)}>
        ← Quay lại
      </Button>

      {reasonOpen && dose && (
        <ReasonDialog
          title="Không thể uống"
          loading={busy}
          error={actionError}
          onCancel={() => setReasonOpen(false)}
          onConfirm={(reason) => {
            setReasonOpen(false);
            void run(() => cannotTakeDose(dose.id, reason), 'Đã ghi nhận: không thể uống');
          }}
        />
      )}
    </>
  );
}
