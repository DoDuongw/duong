import {
  endOfLocalDayUtc,
  localDateTimeToUtc,
  shiftYmd,
  startOfLocalDayUtc,
  todayLocal,
} from '../src/utils/time';

describe('utils/time - quy đổi ngày/giờ địa phương ↔ UTC', () => {
  test('localDateTimeToUtc: 08:00 giờ VN (UTC+7) = 01:00Z', () => {
    expect(localDateTimeToUtc('2026-10-20', '08:00', 'Asia/Ho_Chi_Minh').toISOString()).toBe(
      '2026-10-20T01:00:00.000Z',
    );
  });

  test('startOfLocalDayUtc: 00:00 giờ VN = 17:00Z hôm trước', () => {
    expect(startOfLocalDayUtc('Asia/Ho_Chi_Minh', '2026-10-20').toISOString()).toBe(
      '2026-10-19T17:00:00.000Z',
    );
  });

  test('endOfLocalDayUtc: 23:59:59.999 giờ VN = 16:59:59.999Z cùng ngày', () => {
    expect(endOfLocalDayUtc('Asia/Ho_Chi_Minh', '2026-10-20').toISOString()).toBe(
      '2026-10-20T16:59:59.999Z',
    );
  });

  test('endOfLocalDayUtc tính đúng ngày cuối tháng (00:00 ngày kế tiếp - 1ms)', () => {
    expect(endOfLocalDayUtc('Asia/Ho_Chi_Minh', '2026-10-31').toISOString()).toBe(
      '2026-10-31T16:59:59.999Z',
    );
    expect(startOfLocalDayUtc('Asia/Ho_Chi_Minh', '2026-11-01').toISOString()).toBe(
      '2026-10-31T17:00:00.000Z',
    );
  });

  test('múi giờ khác: Tokyo (UTC+9) 08:00 = 23:00Z hôm trước', () => {
    expect(localDateTimeToUtc('2026-10-20', '08:00', 'Asia/Tokyo').toISOString()).toBe(
      '2026-10-19T23:00:00.000Z',
    );
  });

  test('múi giờ có DST: New York 08:00 mùa hè vs mùa đông', () => {
    expect(localDateTimeToUtc('2026-07-01', '08:00', 'America/New_York').toISOString()).toBe(
      '2026-07-01T12:00:00.000Z',
    );
    expect(localDateTimeToUtc('2026-12-01', '08:00', 'America/New_York').toISOString()).toBe(
      '2026-12-01T13:00:00.000Z',
    );
  });

  test('shiftYmd qua mốc tháng/năm', () => {
    expect(shiftYmd('2026-12-31', 1)).toBe('2027-01-01');
    expect(shiftYmd('2027-01-01', -1)).toBe('2026-12-31');
    expect(shiftYmd('2026-10-20', 0)).toBe('2026-10-20');
  });

  test('todayLocal trả về ngày địa phương dạng YYYY-MM-DD', () => {
    expect(todayLocal('Asia/Ho_Chi_Minh')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
