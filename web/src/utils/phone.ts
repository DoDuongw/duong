/**
 * Nhận dạng và chuẩn hoá số điện thoại / email đăng nhập.
 *
 * Đăng nhập bằng SĐT được thực hiện qua **email nội bộ** `<sđt>@med.local`
 * (Firebase Spark plan không hỗ trợ Phone Auth OTP SMS). Chuẩn hoá ở đây giữ
 * cho `091 234 5678`, `+84912345678` và `0912345678` cùng trỏ về một tài khoản.
 *
 * Quy tắc giống hệt `backend/src/utils/profile.ts` — sửa một bên thì sửa cả hai.
 */

/** Hậu tố miền email nội bộ dựng từ SĐT */
export const PHONE_EMAIL_DOMAIN = 'med.local';

/** SĐT hợp lệ sau chuẩn hoá có 10 chữ số (0 + 9) */
const LOCAL_PHONE_PATTERN = /^0[35789]\d{8}$/;

/**
 * Chuẩn hoá SĐT Việt Nam về `0xxxxxxxxx`.
 * Trả về `null` khi đầu vào không phải SĐT hợp lệ.
 */
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

/** Email nội bộ dựng từ SĐT đã chuẩn hoá */
export function phoneToInternalEmail(phone: string): string {
  return `${phone}@${PHONE_EMAIL_DOMAIN}`;
}

/** Người dùng đã gõ số điện thoại (để hiện nhãn/ô nhập phù hợp) */
export function looksLikePhone(input: string): boolean {
  const trimmed = input.trim();
  if (trimmed === '' || trimmed.includes('@')) return false;
  return /^[+\d][\d\s.\-()]*$/.test(trimmed);
}

/** Địa chỉ email nội bộ `…@med.local` — hiển thị cho người dùng là SĐT kèm ghi chú */
export function isInternalPhoneEmail(email: string): boolean {
  return email.endsWith(`@${PHONE_EMAIL_DOMAIN}`);
}

/** Rút SĐT hiển thị từ email nội bộ; trả `null` nếu không phải email nội bộ */
export function phoneFromInternalEmail(email: string): string | null {
  if (!isInternalPhoneEmail(email)) return null;
  return email.slice(0, -(`@${PHONE_EMAIL_DOMAIN}`.length));
}

/** Địa chỉ: 1–200 ký tự sau khi cắt khoảng trắng thừa */
export function isValidAddress(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length >= 1 && trimmed.length <= 200;
}
