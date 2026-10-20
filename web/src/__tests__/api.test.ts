import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, checkHealth } from '../services/api';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiFetch', () => {
  it('trả về data từ phản hồi thống nhất { success, data }', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true, data: { id: 'u1' } })));
    const result = await apiFetch<{ id: string }>('/users/me');
    expect(result).toEqual({ id: 'u1' });
  });

  it('ném ApiError với code/message từ backend khi HTTP lỗi', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => jsonResponse({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Thiếu tên' } }, 400)),
    );
    await expect(apiFetch('/medications', { method: 'POST', body: {} })).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Thiếu tên',
    });
  });

  it('401 → ApiError status 401 (app sẽ đăng xuất theo quy tắc)', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: false, error: { code: 'UNAUTHENTICATED', message: 'Chưa đăng nhập' } }, 401)));
    const error = await apiFetch('/doses/today').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(401);
  });

  it('mất mạng → ApiError status 0, message dễ hiểu', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))));
    const error = await apiFetch('/health-proxy').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).code).toBe('NETWORK_ERROR');
  });

  it('gắn Authorization header khi có token', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: null }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch('/users/me');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/users/me');
    // Chưa cấu hình Firebase → không có token, nhưng header Content-Type vẫn có
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
  });
});

describe('checkHealth', () => {
  it('true khi backend phản hồi OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ success: true })));
    expect(await checkHealth()).toBe(true);
  });

  it('false khi backend không phản hồi', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))));
    expect(await checkHealth()).toBe(false);
  });
});
