/**
 * Kiểm tra thông tin hồ sơ người dùng (SĐT, địa chỉ).
 *
 * Chuẩn hoá SĐT về dạng nội bộ `0xxxxxxxxx` (10 chữ số) để:
 * - so trùng/đăng nhập ổn định dù người dùng gõ `+84…`, `84…` hay có khoảng trắng;
 * - web dựng email nội bộ `<sđt>@med.local` từ cùng một dạng.
 */

export const PHONE_LOCAL_PART_LENGTH = 10;
export const ADDRESS_MAX_LENGTH = 200;

/**
 * Chuẩn hoá SĐT Việt Nam về `0xxxxxxxxx`.
 * Chấp nhận: `0912345678`, `+84912345678`, `84912345678`, có khoảng trắng/`-`/`.` xen kẽ.
 * Trả về `null` nếu không hợp lệ (đầu số phải là 0 + 3/5/7/8/9).
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[\s.\-()]/g, '');
  let local: string;
  if (digits.startsWith('+84')) local = `0${digits.slice(3)}`;
  else if (digits.startsWith('84') && digits.length === 11) local = `0${digits.slice(2)}`;
  else if (digits.startsWith('0')) local = digits;
  else return null;

  if (!/^0\d{9}$/.test(local)) return null;
  if (!/^0[35789]/.test(local)) return null;
  return local;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Địa chỉ: 1–200 ký tự sau khi cắt khoảng trắng thừa */
export function isValidAddress(input: string): boolean {
  const trimmed = input.trim();
  return trimmed.length >= 1 && trimmed.length <= ADDRESS_MAX_LENGTH;
}

/** Email nội bộ dựng từ SĐT (Firebase Auth không có Phone Auth trên Spark plan) */
export function phoneToInternalEmail(phone: string): string {
  return `${phone}@med.local`;
}
