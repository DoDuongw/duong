/**
 * Âm thanh nhắc uống thuốc khi trang đang mở.
 * Tôn trọng cài đặt M08 (lưu ở localStorage); trình duyệt không hỗ trợ → bỏ qua êm.
 */

const SOUND_KEY = 'medreminder.soundEnabled';

let audioContext: AudioContext | null = null;

export function isSoundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(SOUND_KEY, enabled ? 'true' : 'false');
  } catch {
    // Không lưu được — vẫn dùng mặc định
  }
}

type AudioContextCtor = typeof AudioContext;

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    AudioContext?: AudioContextCtor;
    webkitAudioContext?: AudioContextCtor;
  };
  return win.AudioContext ?? win.webkitAudioContext ?? null;
}

/** Phát tiếng báo ngắn (2 nốt) — không ném lỗi nếu trình duyệt chặn/không hỗ trợ */
export function playReminderSound(): void {
  if (!isSoundEnabled()) return;
  const Ctor = getAudioContextCtor();
  if (!Ctor) return;
  try {
    audioContext = audioContext ?? new Ctor();
    const ctx = audioContext;
    void ctx.resume();
    const start = ctx.currentTime;
    [880, 1174].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.2, start + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.25 + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start + i * 0.25);
      osc.stop(start + i * 0.25 + 0.25);
    });
  } catch {
    // Bỏ qua — âm thanh chỉ là phụ trợ
  }
}
