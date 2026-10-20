import { describe, expect, it } from 'vitest';
import type { HistoryItem } from '../types';
import {
  DOSE_STATUS_ICON,
  DOSE_STATUS_LABEL,
  dueDoses,
  firstDueDose,
  isActionable,
  isFinal,
  isUnconfirmedByOwner,
  nextActionable,
  RELATIVE_ALERT_AFTER_MINUTES,
  unconfirmedAlerts,
  uniqueMedicationNames,
} from '../utils/doseStatus';

describe('nhãn/icon trạng thái lần uống', () => {
  it('mọi trạng thái đều có nhãn chữ và icon (không chỉ dùng màu)', () => {
    for (const status of ['pending', 'snoozed', 'confirmed', 'cannot_take', 'overdue', 'missed'] as const) {
      expect(DOSE_STATUS_LABEL[status]).toBeTruthy();
      expect(DOSE_STATUS_ICON[status]).toBeTruthy();
    }
  });

  it('phân loại trạng thái còn xử lý được và đã kết thúc', () => {
    expect(isActionable('pending')).toBe(true);
    expect(isActionable('overdue')).toBe(true);
    expect(isActionable('snoozed')).toBe(true);
    expect(isActionable('confirmed')).toBe(false);
    expect(isFinal('confirmed')).toBe(true);
    expect(isFinal('cannot_take')).toBe(true);
    expect(isFinal('missed')).toBe(true);
    expect(isFinal('pending')).toBe(false);
  });
});

describe('nextActionable', () => {
  it('bỏ qua lần đã xác nhận, chọn lần chờ kế tiếp theo thứ tự', () => {
    const result = nextActionable([
      { id: 'a', status: 'confirmed' as const },
      { id: 'b', status: 'pending' as const },
      { id: 'c', status: 'pending' as const },
    ]);
    expect(result?.id).toBe('b');
  });

  it('trả null khi tất cả đã kết thúc', () => {
    expect(nextActionable([{ id: 'a', status: 'confirmed' as const }])).toBeNull();
  });
});

describe('dueDoses / firstDueDose — lần uống tới hạn nhắc khi trang mở', () => {
  const now = new Date('2026-10-20T02:00:00.000Z');
  const base = { scheduledAt: '2026-10-20T01:00:00.000Z' };

  it('chọn pending/overdue đã qua giờ và snoozed đã tới snoozedUntil', () => {
    const list = [
      { id: 'past', status: 'pending' as const, ...base },
      { id: 'future', status: 'pending' as const, scheduledAt: '2026-10-20T03:00:00.000Z' },
      { id: 'done', status: 'confirmed' as const, ...base },
      { id: 'snoozed-due', status: 'snoozed' as const, scheduledAt: '2026-10-20T01:30:00.000Z', snoozedUntil: '2026-10-20T01:59:00.000Z' },
      { id: 'snoozed-later', status: 'snoozed' as const, scheduledAt: '2026-10-20T01:30:00.000Z', snoozedUntil: '2026-10-20T02:30:00.000Z' },
    ];
    expect(dueDoses(list, now).map((d) => d.id)).toEqual(['past', 'snoozed-due']);
    expect(firstDueDose(list, now)?.id).toBe('past');
  });

  it('chưa tới hạn → null', () => {
    expect(
      firstDueDose([{ id: 'x', status: 'pending' as const, scheduledAt: '2026-10-20T05:00:00.000Z' }], now),
    ).toBeNull();
  });
});

describe('unconfirmedAlerts / isUnconfirmedByOwner — cảnh báo người thân (M07)', () => {
  const now = new Date('2026-10-20T02:00:00.000Z');
  const base = { scheduledAt: '2026-10-20T01:00:00.000Z' };

  it('ngưỡng mặc định khớp backend RELATIVE_ALERT_AFTER_MINUTES = 15', () => {
    expect(RELATIVE_ALERT_AFTER_MINUTES).toBe(15);
  });

  it('pending/overdue/missed là chưa xác nhận; confirmed/cannot_take thì không', () => {
    expect(isUnconfirmedByOwner('pending')).toBe(true);
    expect(isUnconfirmedByOwner('snoozed')).toBe(true);
    expect(isUnconfirmedByOwner('overdue')).toBe(true);
    expect(isUnconfirmedByOwner('missed')).toBe(true);
    expect(isUnconfirmedByOwner('confirmed')).toBe(false);
    expect(isUnconfirmedByOwner('cannot_take')).toBe(false);
  });

  it('chỉ lấy lần uống chưa xác nhận đã quá 15 phút, cũ nhất trước', () => {
    const list = [
      { id: 'late', status: 'pending' as const, ...base }, // 60 phút trước
      { id: 'done', status: 'confirmed' as const, ...base },
      { id: 'cannot', status: 'cannot_take' as const, ...base },
      { id: 'fresh', status: 'pending' as const, scheduledAt: '2026-10-20T01:55:00.000Z' }, // 5 phút — chưa quá ngưỡng
      { id: 'older', status: 'overdue' as const, scheduledAt: '2026-10-20T00:30:00.000Z' },
    ];
    expect(unconfirmedAlerts(list, now).map((d) => d.id)).toEqual(['older', 'late']);
  });

  it('snoozed tính mốc theo snoozedUntil (khớp cách backend chọn mốc)', () => {
    const list = [
      { id: 'snooze-old', status: 'snoozed' as const, scheduledAt: '2026-10-20T01:00:00.000Z', snoozedUntil: '2026-10-20T01:30:00.000Z' },
      { id: 'snooze-new', status: 'snoozed' as const, scheduledAt: '2026-10-20T01:00:00.000Z', snoozedUntil: '2026-10-20T01:55:00.000Z' },
    ];
    expect(unconfirmedAlerts(list, now).map((d) => d.id)).toEqual(['snooze-old']);
  });

  it('không có lần nào chưa xác nhận → danh sách rỗng', () => {
    expect(unconfirmedAlerts([{ id: 'done', status: 'confirmed' as const, ...base }], now)).toEqual([]);
  });
});

describe('uniqueMedicationNames', () => {
  it('lấy tên thuốc duy nhất cho bộ lọc M06', () => {
    const items = [
      { medicationId: 'm1', medicationName: 'Thuốc A' },
      { medicationId: 'm1', medicationName: 'Thuốc A' },
      { medicationId: 'm2', medicationName: 'Thuốc B' },
      { medicationId: 'm3', medicationName: null },
    ] as HistoryItem[];
    expect(uniqueMedicationNames(items)).toEqual([
      { id: 'm1', name: 'Thuốc A' },
      { id: 'm2', name: 'Thuốc B' },
    ]);
  });
});
