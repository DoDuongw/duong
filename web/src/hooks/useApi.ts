import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../services/api';

export interface ApiState<T> {
  loading: boolean;
  data: T | null;
  /** Thông báo lỗi đã đọc (đã qua xử lý) */
  error: string | null;
  refetch: () => void;
}

/**
 * Trạng thái gọi API: tải / dữ liệu / lỗi / thử lại.
 * Tự tải lại khi mất mạng được khắc phục (sự kiện `app:online`).
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ApiState<T> {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    // Bọc Promise.resolve để fetcher trả về giá trị đồng bộ (hoặc undefined) cũng không làm vỡ màn hình
    Promise.resolve()
      .then(() => fetcherRef.current())
      .then((result) => {
        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof ApiError ? e.message : 'Đã xảy ra lỗi không xác định');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, ...deps]);

  // Mạng trở lại → tự tải lại dữ liệu
  useEffect(() => {
    const onOnline = () => refetch();
    const onDoseChanged = () => refetch();
    window.addEventListener('app:online', onOnline);
    window.addEventListener('dose:changed', onDoseChanged);
    return () => {
      window.removeEventListener('app:online', onOnline);
      window.removeEventListener('dose:changed', onDoseChanged);
    };
  }, [refetch]);

  return { loading, data, error, refetch };
}
