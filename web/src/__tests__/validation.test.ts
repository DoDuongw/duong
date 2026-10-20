import { describe, expect, it } from 'vitest';
import { isEndAfterStart, isValidDate, isValidTime, validateMedicationForm } from '../utils/validation';

describe('isValidTime', () => {
  it('chấp nhận 00:00 và 23:59', () => {
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
    expect(isValidTime('08:30')).toBe(true);
  });

  it('từ chối giờ sai', () => {
    expect(isValidTime('24:00')).toBe(false);
    expect(isValidTime('12:60')).toBe(false);
    expect(isValidTime('8:00')).toBe(false);
    expect(isValidTime('')).toBe(false);
    expect(isValidTime('abc')).toBe(false);
  });
});

describe('isValidDate', () => {
  it('chấp nhận ngày thật', () => {
    expect(isValidDate('2026-10-19')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true); // năm nhuận
  });

  it('từ chối ngày không tồn tại', () => {
    expect(isValidDate('2026-02-30')).toBe(false);
    expect(isValidDate('2025-02-29')).toBe(false); // không nhuận
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('19/10/2026')).toBe(false);
  });
});

describe('isEndAfterStart', () => {
  it('end bằng start là hợp lệ', () => {
    expect(isEndAfterStart('2026-10-19', '2026-10-19')).toBe(true);
    expect(isEndAfterStart('2026-10-19', '2026-10-20')).toBe(true);
    expect(isEndAfterStart('2026-10-20', '2026-10-19')).toBe(false);
  });
});

describe('validateMedicationForm (M05)', () => {
  const valid = { name: 'Thuốc huyết áp', times: ['08:00', '20:00'], startDate: '2026-10-19' };

  it('form hợp lệ → không lỗi', () => {
    expect(validateMedicationForm(valid)).toEqual({});
  });

  it('thiếu tên / tên quá dài → lỗi name', () => {
    expect(validateMedicationForm({ ...valid, name: '' }).name).toBeTruthy();
    expect(validateMedicationForm({ ...valid, name: 'x'.repeat(201) }).name).toBeTruthy();
  });

  it('không có giờ hoặc giờ sai → lỗi times', () => {
    expect(validateMedicationForm({ ...valid, times: [] }).times).toBeTruthy();
    expect(validateMedicationForm({ ...valid, times: ['25:00'] }).times).toBeTruthy();
    expect(validateMedicationForm({ ...valid, times: ['08:00', '08:00'] }).times).toBeTruthy();
  });

  it('ngày bắt đầu > kết thúc → lỗi endDate', () => {
    const errors = validateMedicationForm({ ...valid, endDate: '2026-10-18' });
    expect(errors.endDate).toBeTruthy();
  });

  it('ngày không hợp lệ → lỗi startDate', () => {
    expect(validateMedicationForm({ ...valid, startDate: '2026-02-30' }).startDate).toBeTruthy();
  });
});
