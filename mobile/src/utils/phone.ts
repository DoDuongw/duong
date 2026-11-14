/**
 * Nhận dạng và chuẩn hoá số điện thoại / email đăng nhập.
 * Quy tắc giống backend/src/utils/profile.ts.
 */

const PHONE_EMAIL_DOMAIN = 'med.local';

const LOCAL_PHONE_PATTERN = /^0[35789]\d{8}$/;

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s.\-()]/g, '');
  let local: string;
  if (digits.startsWith('+84')) local = `0${digits.slice(3)}`;
  else if (digits.startsWith('84') && digits.length === 11) local = `0${digits.slice(2)}`;
  else if (digits.startsWith('0')) local = digits;
  else return null;

  return LOCAL_PHONE_PATTERN.test(local) ? local : null;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

export function phoneToInternalEmail(phone: string): string {
  return `${phone}@${PHONE_EMAIL_DOMAIN}`;
}

export function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed.includes('@')) return false;
  return /^[+\d][\d\s.\-()]*$/.test(trimmed);
}

export function isValidAddress(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}
