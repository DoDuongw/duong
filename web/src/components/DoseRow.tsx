import type { CSSProperties } from 'react';
import type { DoseStatus, DoseWithMedication } from '../types';
import { formatTime } from '../utils/dateTime';
import { DOSE_STATUS_COLOR, DOSE_STATUS_ICON, DOSE_STATUS_LABEL } from '../utils/doseStatus';

const BADGE_BG: Record<DoseStatus, string> = {
  pending: 'var(--c-primary-soft)',
  snoozed: 'var(--c-warning-soft)',
  confirmed: 'var(--c-success-soft)',
  cannot_take: 'var(--c-surface-2)',
  overdue: 'var(--c-danger-soft)',
  missed: 'var(--c-danger-soft)',
};

/** Huy hiệu trạng thái — luôn kèm icon + nhãn chữ, không chỉ dùng màu */
export function DoseStatusBadge({ status, late }: { status: DoseStatus; late?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: BADGE_BG[status],
        border: `1px solid ${DOSE_STATUS_COLOR[status]}`,
        color: DOSE_STATUS_COLOR[status],
        fontWeight: 600,
        fontSize: 'calc(15px * var(--font-mult))',
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden="true">{DOSE_STATUS_ICON[status]}</span>
      {DOSE_STATUS_LABEL[status]}
      {late ? ' · xác nhận muộn' : ''}
    </span>
  );
}

interface DoseRowProps {
  dose: DoseWithMedication;
  timeZone: string;
  onSelect?: (dose: DoseWithMedication) => void;
}

/** Một dòng lần uống: giờ, tên thuốc, liều, trạng thái — dùng cho M01/M03 */
export function DoseRow({ dose, timeZone, onSelect }: DoseRowProps) {
  const content = (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <span style={{ fontSize: 'calc(22px * var(--font-mult))', fontWeight: 700, minWidth: 64 }}>
          {formatTime(dose.scheduledAt, timeZone)}
        </span>
        <span style={{ fontSize: 'calc(19px * var(--font-mult))', fontWeight: 600, flex: 1 }}>
          {dose.medicationName ?? '(thuốc đã xóa)'}
        </span>
      </div>
      {dose.dosageText && <span style={{ color: 'var(--c-muted)' }}>{dose.dosageText}</span>}
      {dose.instructions && (
        <span style={{ color: 'var(--c-muted)', display: 'block' }}>{dose.instructions}</span>
      )}
      <div style={{ marginTop: 8 }}>
        <DoseStatusBadge status={dose.status} late={dose.isLateConfirmation} />
      </div>
    </>
  );

  const base: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
    textAlign: 'left',
    background: 'var(--c-surface)',
    border: '1px solid var(--c-border)',
    borderRadius: 12,
    padding: '12px 14px',
    marginBottom: 8,
  };

  if (!onSelect) {
    return <div style={base}>{content}</div>;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(dose)}
      aria-label={`${formatTime(dose.scheduledAt, timeZone)} — ${dose.medicationName ?? 'thuốc'} — ${DOSE_STATUS_LABEL[dose.status]}`}
      style={{ ...base, cursor: 'pointer' }}
    >
      {content}
    </button>
  );
}
