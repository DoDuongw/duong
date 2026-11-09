import { useEffect, useState } from 'react';
import { checkHealth } from '../services/api';

/**
 * Giám sát kết nối: khi mất mạng → kiểm tra /health mỗi 10 giây;
 * khi backend trở lại → báo `app:online` để các màn hình tự tải lại.
 */
export function useHealth(): { online: boolean } {
  const [online, setOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    let timer: number | null = null;

    const stopPolling = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };

    const handleOffline = () => {
      setOnline(false);
      if (timer === null) {
        timer = window.setInterval(async () => {
          if (await checkHealth()) {
            stopPolling();
            setOnline(true);
            window.dispatchEvent(new Event('app:online'));
          }
        }, 10_000);
      }
    };

    const handleOnline = async () => {
      // Trình duyệt báo có mạng — xác minh backend thật sự phản hồi
      if (await checkHealth()) {
        stopPolling();
        setOnline(true);
        window.dispatchEvent(new Event('app:online'));
      } else {
        handleOffline();
      }
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    if (!navigator.onLine) handleOffline();

    return () => {
      stopPolling();
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { online };
}
