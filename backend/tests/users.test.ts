import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, closeDb, resetDb, createTestUser } from './helpers';
import { User } from '../src/models/User';

jest.mock('../src/middlewares/auth', () => {
  const actual = jest.requireActual('../src/middlewares/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      const uid = req.headers['x-test-uid'];
      if (uid) {
        req.user = { uid: String(uid), userId: String(req.headers['x-test-user-id'] ?? '') };
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

function as(userId: string, uid = 'uid') {
  return { 'x-test-uid': uid, 'x-test-user-id': userId };
}

describe('PATCH /users/me — tài khoản (M08)', () => {
  test('lưu tên hiển thị + múi giờ rồi GET /me trả lại đúng', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const patch = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ displayName: 'Bà Lan', timezone: 'Asia/Tokyo' });

    expect(patch.status).toBe(200);
    expect(patch.body.data.displayName).toBe('Bà Lan');
    expect(patch.body.data.timezone).toBe('Asia/Tokyo');

    const get = await request(app).get('/api/v1/users/me').set(as(user.id, 'uid-1'));
    expect(get.body.data.displayName).toBe('Bà Lan');
    expect(get.body.data.timezone).toBe('Asia/Tokyo');
  });

  test('tên hiển thị rỗng → 400, không lưu', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ displayName: '' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fresh = await User.findById(user.id);
    expect(fresh!.display_name).toBe('Test'); // giá trị cũ giữ nguyên
  });
});

describe('PATCH /users/me/notification-settings — cài đặt nhắc lại (M08)', () => {
  test('lưu snoozeMinutes + snoozeMax vào preferences', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const res = await request(app)
      .patch('/api/v1/users/me/notification-settings')
      .set(as(user.id, 'uid-1'))
      .send({ snoozeMinutes: 15, snoozeMax: 2 });

    expect(res.status).toBe(200);
    expect(res.body.data.preferences).toMatchObject({ snoozeMinutes: 15, snoozeMax: 2 });

    const fresh = await User.findById(user.id);
    expect(fresh!.preferences).toMatchObject({ snoozeMinutes: 15, snoozeMax: 2 });
  });

  test('merge: cập nhật một khóa không xoá khóa còn lại', async () => {
    const user = await createTestUser('uid-1', '0900000001');
    await User.updateOne({ _id: user.id }, { $set: { preferences: { snoozeMinutes: 20, keep: 'yes' } } });

    const res = await request(app)
      .patch('/api/v1/users/me/notification-settings')
      .set(as(user.id, 'uid-1'))
      .send({ snoozeMax: 4 });

    expect(res.status).toBe(200);
    expect(res.body.data.preferences).toMatchObject({ snoozeMinutes: 20, snoozeMax: 4, keep: 'yes' });
  });

  test('giá trị ngoài khoảng → 400, không đổi preferences', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const res = await request(app)
      .patch('/api/v1/users/me/notification-settings')
      .set(as(user.id, 'uid-1'))
      .send({ snoozeMinutes: 99 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fresh = await User.findById(user.id);
    expect(fresh!.preferences).toBeNull();
  });

  test('chưa xác thực → 401', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/notification-settings')
      .send({ snoozeMinutes: 15 });
    expect(res.status).toBe(401);
  });
});
