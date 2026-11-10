/** Clamp a number to an inclusive range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Format a number with at least two digits. */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
