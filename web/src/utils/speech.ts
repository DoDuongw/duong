/**
 * Giọng đọc hướng dẫn uống thuốc bằng Web Speech API (M08).
 * Mặc định TẮT (người dùng tự bật); trình duyệt không hỗ trợ → bỏ qua êm.
 */

const SPEECH_KEY = 'medreminder.speechEnabled';

export function isSpeechEnabled(): boolean {
  try {
    return localStorage.getItem(SPEECH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setSpeechEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SPEECH_KEY, enabled ? 'true' : 'false');
  } catch {
    // Không lưu được — vẫn dùng mặc định
  }
}

/** Trình duyệt có hỗ trợ Web Speech API không (INTERFACE_SPEC: ẩn nếu không hỗ trợ) */
export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** Đọc thành tiếng nếu đang bật và trình duyệt hỗ trợ; không ném lỗi */
export function speak(text: string): void {
  if (!isSpeechEnabled() || !speechSupported() || !text.trim()) return;
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  } catch {
    // Bỏ qua — giọng đọc chỉ là phụ trợ
  }
}
