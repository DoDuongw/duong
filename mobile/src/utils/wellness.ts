import type { HealthAnswer } from "../types";

/** Category đăng ký với expo-notifications (không dùng `-` hoặc `:`). */
export const WELLNESS_CATEGORY_ID = "wellness_check";

export const WELLNESS_ANSWER_LABELS: Record<HealthAnswer, string> = {
  good: "Bình thường",
  tired: "Hơi mệt",
  dizzy: "Chóng mặt",
  unwell: "Khó chịu",
  other: "Khác",
};

/**
 * Các lựa chọn hiện trực tiếp trên banner push. Android chỉ hiện tối đa 3 nút,
 * nên giữ 3 trạng thái phổ biến nhất; bấm vào thân thông báo để chọn đủ 5 mục.
 */
export const WELLNESS_QUICK_ANSWERS: {
  action: string;
  answer: HealthAnswer;
  title: string;
}[] = [
  { action: "wellness_good", answer: "good", title: "Bình thường" },
  { action: "wellness_tired", answer: "tired", title: "Hơi mệt" },
  { action: "wellness_unwell", answer: "unwell", title: "Khó chịu" },
];

const HEALTH_ANSWERS = new Set<HealthAnswer>(["good", "tired", "dizzy", "unwell", "other"]);

export function isHealthAnswer(value: unknown): value is HealthAnswer {
  return typeof value === "string" && HEALTH_ANSWERS.has(value as HealthAnswer);
}

export function parseWellnessAction(actionIdentifier: string | null | undefined): HealthAnswer | null {
  if (!actionIdentifier) return null;
  return WELLNESS_QUICK_ANSWERS.find((item) => item.action === actionIdentifier)?.answer ?? null;
}
