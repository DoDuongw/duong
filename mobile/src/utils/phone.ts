export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 9 || digits.length > 11) return null;
  return digits;
}

export function phoneToInternalEmail(phone: string): string {
  return `${phone}@med.local`;
}
