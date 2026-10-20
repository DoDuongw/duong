import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addSchedule,
  cannotTakeDose,
  confirmDose,
  createMedication,
  discontinueMedication,
  getDosesByDate,
  getHistory,
  getTodayDoses,
  listMedications,
  newClientRequestId,
  removeSchedule,
  updateMedication,
  updateSchedule,
} from '../services/endpoints';

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function stubOk() {
  const fetchMock = vi.fn(async () => jsonResponse({ success: true, data: {} }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('endpoints — dựng URL và body đúng API_SPEC', () => {
  it('GET /doses/today không có query', async () => {
    const fetchMock = stubOk();
    await getTodayDoses();
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/doses/today');
    expect(init.method).toBe('GET');
  });

  it('GET /doses?date=YMD', async () => {
    const fetchMock = stubOk();
    await getDosesByDate('2026-10-20');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/doses?date=2026-10-20');
  });

  it('GET /medications?status=discontinued', async () => {
    const fetchMock = stubOk();
    await listMedications('discontinued');
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/medications?status=discontinued');
  });

  it('POST /doses/:id/confirm gửi clientRequestId', async () => {
    const fetchMock = stubOk();
    await confirmDose('dose-1', 'req-12345678');
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/doses/dose-1/confirm');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ clientRequestId: 'req-12345678' });
  });

  it('POST /doses/:id/cannot-take gửi lý do', async () => {
    const fetchMock = stubOk();
    await cannotTakeDose('dose-2', 'Đau dạ dày');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ reason: 'Đau dạ dày' });
  });

  it('POST /medications gửi kèm danh sách lịch', async () => {
    const fetchMock = stubOk();
    await createMedication({
      name: 'Thuốc A',
      startDate: '2026-10-20',
      schedules: [{ timeOfDay: '08:00', recurrenceRule: 'daily' }],
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/medications');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).schedules).toEqual([
      { timeOfDay: '08:00', recurrenceRule: 'daily' },
    ]);
  });

  it('PATCH thuốc hỗ trợ xóa hạn kết thúc (endDate = null)', async () => {
    const fetchMock = stubOk();
    await updateMedication('m1', { name: 'Tên mới', endDate: null });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/medications/m1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Tên mới', endDate: null });
  });

  it('POST /medications/:id/schedules và DELETE /medications/schedules/:id', async () => {
    const fetchMock = stubOk();
    await addSchedule('m1', { timeOfDay: '20:00' });
    await removeSchedule('s9');
    const first = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const second = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(first[0]).toContain('/medications/m1/schedules');
    expect(first[1].method).toBe('POST');
    expect(second[0]).toContain('/medications/schedules/s9');
    expect(second[1].method).toBe('DELETE');
  });

  it('PUT /medications/schedules/:id dùng đúng body', async () => {
    const fetchMock = stubOk();
    await updateSchedule('s1', {
      timeOfDay: '09:00',
      recurrenceRule: 'daily',
      effectiveFrom: '2026-10-20',
      effectiveTo: null,
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/medications/schedules/s1');
    expect(init.method).toBe('PUT');
    expect(JSON.parse(init.body as string)).toEqual({
      timeOfDay: '09:00',
      recurrenceRule: 'daily',
      effectiveFrom: '2026-10-20',
      effectiveTo: null,
    });
  });

  it('POST /medications/:id/discontinue có/không lý do', async () => {
    const fetchMock = stubOk();
    await discontinueMedication('m1');
    await discontinueMedication('m2', 'Hết thuốc');
    const first = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const second = fetchMock.mock.calls[1] as unknown as [string, RequestInit];
    expect(first[0]).toContain('/medications/m1/discontinue');
    expect(JSON.parse(first[1].body as string)).toEqual({});
    expect(JSON.parse(second[1].body as string)).toEqual({ reason: 'Hết thuốc' });
  });

  it('GET /history bỏ tham số rỗng', async () => {
    const fetchMock = stubOk();
    await getHistory({ from: '2026-10-01', to: '2026-10-20', medicationId: '', page: 2, pageSize: 20 });
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain('/history?from=2026-10-01&to=2026-10-20&page=2&pageSize=20');
    expect(url).not.toContain('medicationId');
  });
});

describe('newClientRequestId', () => {
  it('dài ≥ 8 ký tự và hai lần gọi khác nhau (đủ cho validation server)', () => {
    const a = newClientRequestId();
    const b = newClientRequestId();
    expect(a.length).toBeGreaterThanOrEqual(8);
    expect(a.length).toBeLessThanOrEqual(64);
    expect(a).not.toBe(b);
  });
});
