/** Kiểm tra đầu vào dùng chung cho form thuốc. */

function isValidTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

function isEndAfterStart(start: string, end: string): boolean {
  return end >= start;
}

export interface MedicationFormInput {
  name: string;
  times: string[];
  startDate: string;
  endDate?: string;
}

export function validateMedicationForm(input: MedicationFormInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const name = input.name.trim();
  if (name.length < 1 || name.length > 200) {
    errors.name = 'Tên thuốc phải từ 1 đến 200 ký tự';
  }

  if (input.times.length < 1) {
    errors.times = 'Phải có ít nhất một giờ uống';
  } else if (input.times.some((t) => !isValidTime(t))) {
    errors.times = 'Giờ uống không hợp lệ (định dạng HH:mm)';
  } else if (new Set(input.times).size !== input.times.length) {
    errors.times = 'Có giờ trùng lặp';
  }

  if (!isValidDate(input.startDate)) {
    errors.startDate = 'Ngày bắt đầu không hợp lệ';
  }
  if (input.endDate) {
    if (!isValidDate(input.endDate)) {
      errors.endDate = 'Ngày kết thúc không hợp lệ';
    } else if (isValidDate(input.startDate) && !isEndAfterStart(input.startDate, input.endDate)) {
      errors.endDate = 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu';
    }
  }

  return errors;
}
