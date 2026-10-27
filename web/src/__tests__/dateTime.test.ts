import { describe, expect, it } from 'vitest';
import {
  buoiOfTime,
  formatDate,
  formatDisplayDate,
  formatTimezoneLabel,
  formatTime,
  shiftYmd,
  todayYmd,
} from '../utils/dateTime';

describe('buoiOfTime (nhóm lịch theo buổi)', () => {
  it('chia đúng 4 buổi', () => {
    expect(buoiOfTime('00:00')).toBe('sang');
    expect(buoiOfTime('09:59')).toBe('sang');
    expect(buoiOfTime('10:00')).toBe('trua');
    expect(buoiOfTime('13:59')).toBe('trua');
    expect(buoiOfTime('14:00')).toBe('chieu');
    expect(buoiOfTime('17:59')).toBe('chieu');
    expect(buoiOfTime('18:00')).toBe('toi');
    expect(buoiOfTime('23:59')).toBe('toi');
  });
});

describe('formatTime / formatDate (theo múi giờ người dùng)', () => {
  it('2026-10-19T00:30Z → 07:30 (Asia/Ho_Chi_Minh, UTC+7)', () => {
    expect(formatTime('2026-10-19T00:30:00.000Z')).toBe('07:30');
  });

  it('formatDate ra ngày đúng theo múi giờ VN', () => {
    expect(formatDate('2026-10-19T00:30:00.000Z')).toBe('19/10/2026');
    // 17:30Z 19/10 → 00:30 20/10 ở VN
    expect(formatDate('2026-10-19T17:30:00.000Z')).toBe('20/10/2026');
  });
});

describe('formatTimezoneLabel (nhãn múi giờ tiếng Việt)', () => {
  it('đổi các múi giờ thường dùng sang nhãn tiếng Việt kèm GMT', () => {
    expect(formatTimezoneLabel('Asia/Ho_Chi_Minh')).toBe('Việt Nam (GMT+7)');
    expect(formatTimezoneLabel('Asia/Tokyo')).toBe('Nhật Bản (GMT+9)');
    expect(formatTimezoneLabel('UTC')).toBe('Giờ quốc tế (GMT+0)');
  });

  it('múi giờ không nhận diện được → giữ nguyên mã, không làm hỏng giao diện', () => {
    expect(formatTimezoneLabel('Not/AZone')).toBe('Not/AZone');
  });
});

describe('formatDisplayDate / shiftYmd / todayYmd', () => {
  it('formatDisplayDate không phụ thuộc UTC của máy', () => {
    expect(formatDisplayDate('2026-10-19')).toContain('19/10/2026');
  });

  it('shiftYmd cộng/trừ ngày đúng, không qua timezone', () => {
    expect(shiftYmd('2026-10-31', 1)).toBe('2026-11-01');
    expect(shiftYmd('2026-10-01', -1)).toBe('2026-09-30');
    expect(shiftYmd('2026-10-19', 0)).toBe('2026-10-19');
  });

  it('todayYmd trả về dạng yyyy-mm-dd', () => {
    expect(todayYmd()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
