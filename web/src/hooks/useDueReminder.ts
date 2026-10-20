import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getTodayDoses } from '../services/endpoints';
import { onForegroundPush } from '../services/messaging';
import { firstDueDose } from '../utils/doseStatus';
import { playReminderSound } from '../utils/sound';
import { speak } from '../utils/speech';
import type { DoseWithMedication } from '../types';

const POLL_MS = 60_000;

export interface DueReminderState {
  /** Lần uống đang tới hạn cần nhắc (đã ẩn nếu người dùng bỏ qua) */
  due: DoseWithMedication | null;
  /** Ẩn nhắc cho lần uống này trong phiên hiện tại */
  dismiss: (doseId: string) => void;
  /** Tải lại ngay (sau khi xác nhận) */
  reload: () => void;
}

/**
 * Nhắc khi trang đang mở (NOTIFICATION_PLAN §3.1 bước hiển thị trong trang):
 * - Poll `GET /doses/today` mỗi phút khi tab đang hiển thị
 * - Nhận push foreground (FCM `onMessage`) → tải ngay
 * - Khi có lần uống tới hạn mới → phát âm thanh (nếu bật ở M08)
 */
export function useDueReminder(): DueReminderState {
  const [doses, setDoses] = useState<DoseWithMedication[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const lastNotifiedId = useRef<string | null>(null);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const load = useCallback(async () => {
    try {
      const today = await getTodayDoses();
      setDoses(today.doses);
    } catch {
      // Im lặng — banner chỉ là phụ trợ, không chặn màn hình
    }
  }, []);

  useEffect(() => {
    // Tải ngay lần đầu và mỗi khi `tick` đổi (reload sau khi xác nhận)
    // oxlint-disable-next-line react/set-state-in-effect
    void load();
  }, [load, tick]);

  // Poll định kỳ khi tab đang hiển thị
  useEffect(() => {
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') void load();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  // Thông báo khi trang đang mở (FCM foreground) → tải lại ngay
  useEffect(() => {
    const unsubscribe = onForegroundPush(() => void load());
    return unsubscribe;
  }, [load]);

  const due = useMemo(() => firstDueDose(doses), [doses]);

  // Phát âm thanh và/hoặc giọng đọc khi xuất hiện lần uống tới hạn mới (không lặp mỗi lần poll)
  useEffect(() => {
    const id = due?.id ?? null;
    if (id && id !== lastNotifiedId.current) {
      lastNotifiedId.current = id;
      playReminderSound();
      const parts = [due?.medicationName, due?.dosageText, due?.instructions].filter(Boolean);
      speak(parts.join('. '));
    }
  }, [due]);

  const dismiss = useCallback((doseId: string) => {
    setHidden((prev) => (prev.includes(doseId) ? prev : [...prev, doseId]));
  }, []);

  return {
    due: due && !hidden.includes(due.id) ? due : null,
    dismiss,
    reload,
  };
}
