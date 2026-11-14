import type { DoseStatus } from '../types';

export const DOSE_STATUS_LABEL: Record<DoseStatus, string> = {
  pending: 'Đang chờ',
  snoozed: 'Nhắc lại sau',
  confirmed: 'Đã xác nhận',
  cannot_take: 'Không thể uống',
  overdue: 'Quá giờ',
  missed: 'Đã bỏ lỡ',
};

export const DOSE_STATUS_ICON: Record<DoseStatus, string> = {
  pending: '⏳',
  snoozed: '🔁',
  confirmed: '✅',
  cannot_take: '⛔',
  overdue: '⚠️',
  missed: '❌',
};

const ACTIONABLE_STATUSES: DoseStatus[] = ['pending', 'snoozed', 'overdue'];
const FINAL_STATUSES: DoseStatus[] = ['confirmed', 'cannot_take', 'missed'];

export const COMMON_CANNOT_TAKE_REASONS = [
  'Quên mang thuốc',
  'Đang bận, chưa uống được',
  'Cảm thấy không khỏe',
  'Bác sĩ yêu cầu tạm ngưng',
];

export function isActionable(status: DoseStatus): boolean {
  return ACTIONABLE_STATUSES.includes(status);
}

export function isFinal(status: DoseStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

// Mọi trạng thái trừ `confirmed` đều được coi là chưa xác nhận uống thuốc.
const UNCONFIRMED_BY_OWNER_STATUSES: DoseStatus[] = [
  'pending',
  'snoozed',
  'overdue',
  'missed',
  'cannot_take',
];

function isUnconfirmedByOwner(status: DoseStatus): boolean {
  return UNCONFIRMED_BY_OWNER_STATUSES.includes(status);
}

export const RELATIVE_ALERT_AFTER_MINUTES = 10;

interface UnconfirmedFields {
  status: DoseStatus;
  scheduledAt: string;
  snoozedUntil?: string | null;
}

export function unconfirmedAlerts<T extends UnconfirmedFields>(
  doses: T[],
  now: Date = new Date(),
  afterMinutes: number = RELATIVE_ALERT_AFTER_MINUTES,
): T[] {
  const thresholdMs = now.getTime() - afterMinutes * 60_000;
  return doses
    .filter((d) => isUnconfirmedByOwner(d.status))
    .filter((d) => {
      const reference = d.status === 'snoozed' && d.snoozedUntil ? d.snoozedUntil : d.scheduledAt;
      return new Date(reference).getTime() <= thresholdMs;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export function nextActionable<T extends { status: DoseStatus; scheduledAt?: string }>(doses: T[] = []): T | null {
  const pending = doses.filter((d) => isActionable(d.status));
  if (pending.length === 0) return null;
  pending.sort((a, b) => {
    const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
    const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
    return ta - tb;
  });
  return pending[0];
}

interface DueFields {
  status: DoseStatus;
  scheduledAt: string;
  snoozedUntil?: string | null;
}

function dueDoses<T extends DueFields>(doses: T[], now: Date = new Date()): T[] {
  const nowMs = now.getTime();
  return doses
    .filter((d) => {
      if (!isActionable(d.status)) return false;
      if (d.status === 'snoozed') {
        return d.snoozedUntil ? new Date(d.snoozedUntil).getTime() <= nowMs : false;
      }
      return new Date(d.scheduledAt).getTime() <= nowMs;
    })
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
}

export function firstDueDose<T extends DueFields>(doses: T[], now: Date = new Date()): T | null {
  return dueDoses(doses, now)[0] ?? null;
}
