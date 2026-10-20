import { API_BASE, SERVER_ORIGIN } from '../config';
import { getIdToken } from './firebase';

/** Lỗi API thống nhất — status 0 = lỗi mạng */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Gắn Firebase ID token (mặc định true) */
  auth?: boolean;
}

/**
 * Gọi backend — parse theo phản hồi thống nhất `{ success, data?, error? }`.
 * Ném ApiError: status 0 = mất mạng; 401/403 = lỗi xác thực/phân quyền.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (auth) {
    const token = await getIdToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', 'Không kết nối được máy chủ — kiểm tra kết nối mạng');
  }

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: unknown; error?: { code?: string; message?: string } }
    | null;

  if (!res.ok) {
    const code = json?.error?.code ?? `HTTP_${res.status}`;
    const message = json?.error?.message ?? `Lỗi máy chủ (${res.status})`;
    throw new ApiError(res.status, code, message);
  }

  return (json && 'data' in json && json.data !== undefined ? json.data : json) as T;
}

/** Kiểm tra backend sống — dùng cho dải báo mất mạng (mỗi 10 giây) */
export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${SERVER_ORIGIN}/health`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}
