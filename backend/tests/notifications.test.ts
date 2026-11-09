import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, closeDb, resetDb, createTestUser } from './helpers';
import { NotificationHistory } from '../src/models/NotificationHistory';

jest.mock('../src/middlewares/auth', () => {
  const actual = jest.requireActual('../src/middlewares/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      const uid = req.headers['x-test-uid'];
      if (uid) {
        req.user = {
          uid: String(uid),
          userId: String(req.headers['x-test-user-id'] ?? ''),
          timezone: 'Asia/Ho_Chi_Minh',
        };
      }
      next();
    },
  };
});

const app = createApp();

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
});

async function createHistory(userId: string, overrides: Record<string, unknown> = {}) {
  return NotificationHistory.create({
    user_id: userId,
    kind: 'scheduled_reminder',
    title: 'Đến giờ uống thuốc',
    body: 'Thuốc A — 08:00',
    sent_at: new Date('2026-10-20T05:00:00.000Z'),
    ...overrides,
  });
}

describe('API lịch sử thông báo', () => {
  test('chưa đăng nhập → 401', async () => {
    const res = await request(app).get('/api/v1/notifications');
    expect(res.status).toBe(401);
  });

  test('chỉ trả về thông báo của chính người dùng, mới nhất trước', async () => {
    const user = await createTestUser('uid-notif-1', '0900000021');
    const other = await createTestUser('uid-notif-2', '0900000022');
    await createHistory(user.id, { sent_at: new Date('2026-10-20T05:00:00.000Z'), title: 'Cũ' });
    await createHistory(user.id, { sent_at: new Date('2026-10-21T05:00:00.000Z'), title: 'Mới' });
    await createHistory(other.id, { sent_at: new Date('2026-10-22T05:00:00.000Z'), title: 'Người khác' });

    const res = await request(app)
      .get('/api/v1/notifications')
      .set('x-test-uid', 'uid-notif-1')
      .set('x-test-user-id', String(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items.map((i: any) => i.title)).toEqual(['Mới', 'Cũ']);
    expect(res.body.data.items[0].sentAt).toBe('2026-10-21T05:00:00.000Z');
  });

  test('phân trang', async () => {
    const user = await createTestUser('uid-notif-3', '0900000023');
    for (let i = 0; i < 3; i++) {
      await createHistory(user.id, { sent_at: new Date(`2026-10-2${i}T05:00:00.000Z`), title: `TB ${i}` });
    }

    const res = await request(app)
      .get('/api/v1/notifications?page=2&pageSize=2')
      .set('x-test-uid', 'uid-notif-3')
      .set('x-test-user-id', String(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(3);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.page).toBe(2);
  });
});
