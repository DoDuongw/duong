import { describe, expect, it } from 'vitest';
import {
  isInternalPhoneEmail,
  isValidAddress,
  isValidPhone,
  looksLikePhone,
  normalizePhone,
  phoneFromInternalEmail,
  phoneToInternalEmail,
} from '../utils/phone';

describe('normalizePhone — chuẩn hoá SĐT Việt Nam', () => {
  it('giữ nguyên dạng 0xxxxxxxxx', () => {
    expect(normalizePhone('0912345678')).toBe('0912345678');
  });

  it('đổi +84 và 84 về dạng 0', () => {
    expect(normalizePhone('+84912345678')).toBe('0912345678');
    expect(normalizePhone('84912345678')).toBe('0912345678');
  });

  it('bỏ khoảng trắng, gạch, chấm, ngoặc', () => {
    expect(normalizePhone('091 234-56.78')).toBe('0912345678');
    expect(normalizePhone('(091) 234 5678')).toBe('0912345678');
  });

  it('nhận đủ đầu số 03/05/07/08/09', () => {
    for (const prefix of ['03', '05', '07', '08', '09']) {
      expect(normalizePhone(`${prefix}12345678`)).toBe(`${prefix}12345678`);
    }
  });

  it('từ chối số không hợp lệ', () => {
    expect(normalizePhone('0123456789')).toBeNull();
    expect(normalizePhone('091234567')).toBeNull();
    expect(normalizePhone('09123456789')).toBeNull();
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });
});

describe('isValidPhone', () => {
  it('khớp với normalizePhone', () => {
    expect(isValidPhone('0912345678')).toBe(true);
    expect(isValidPhone('+84912345678')).toBe(true);
    expect(isValidPhone('123')).toBe(false);
  });
});

describe('looksLikePhone — phân biệt SĐT với email khi gõ vào một ô', () => {
  it('email thì không phải SĐT', () => {
    expect(looksLikePhone('lan@example.com')).toBe(false);
  });

  it('chuỗi toàn số/ký tự SĐT thì coi là SĐT', () => {
    expect(looksLikePhone('0912345678')).toBe(true);
    expect(looksLikePhone('+84 912 345 678')).toBe(true);
  });

  it('chuỗi rỗng không phải SĐT', () => {
    expect(looksLikePhone('')).toBe(false);
    expect(looksLikePhone('   ')).toBe(false);
  });
});

describe('email nội bộ dựng từ SĐT', () => {
  it('dựng và rút lại được SĐT', () => {
    const email = phoneToInternalEmail('0912345678');
    expect(email).toBe('0912345678@med.local');
    expect(isInternalPhoneEmail(email)).toBe(true);
    expect(phoneFromInternalEmail(email)).toBe('0912345678');
  });

  it('email thật không bị nhận nhầm là email nội bộ', () => {
    expect(isInternalPhoneEmail('lan@example.com')).toBe(false);
    expect(phoneFromInternalEmail('lan@example.com')).toBeNull();
  });
});

describe('isValidAddress', () => {
  it('nhận địa chỉ bình thường', () => {
    expect(isValidAddress('12 Lê Lợi, Q.1')).toBe(true);
  });

  it('từ chối rỗng hoặc quá 200 ký tự', () => {
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress('a'.repeat(201))).toBe(false);
    expect(isValidAddress('a'.repeat(200))).toBe(true);
  });
});
