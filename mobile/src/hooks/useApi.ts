import { useCallback, useState } from 'react';

interface UseApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useApi<T, Args extends any[] = any[]>(fn: (...args: Args) => Promise<T>) {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const result = await fn(...args);
        setState({ data: result, loading: false, error: null });
        return result;
      } catch (e: any) {
        const msg = e?.message || 'Đã xảy ra lỗi';
        setState({ data: null, loading: false, error: msg });
        throw e;
      }
    },
    [fn],
  );

  return { ...state, execute, refetch: execute };
}
