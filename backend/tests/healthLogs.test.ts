import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, closeDb, resetDb, createTestUser } from './helpers';
import { HealthLog } from '../src/models/HealthLog';

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

async function createLog(userId: string, overrides: Record<string, unknown> = {}) {
  return HealthLog.create({
    user_id: userId,
    kind: 'wellness_check',
    asked_at: new Date('2026-10-20T05:00:00.000Z'),
    question: 'Bạn cảm thấy thế nào sau khi uống Thuốc A?',
    medication_name: 'Thuốc A',
    ...overrides,
  });
}

describe('API nhật ký sức khỏe', () => {
  test('chưa đăng nhập → 401', async () => {
    const res = await request(app).get('/api/v1/health-logs');
    expect(res.status).toBe(401);
  });

  test('chỉ trả về mục của chính người dùng, mới nhất trước', async () => {
    const user = await createTestUser('uid-health-1', '0900000011');
    const other = await createTestUser('uid-health-2', '0900000012');
    await createLog(user.id, { asked_at: new Date('2026-10-20T05:00:00.000Z'), medication_name: 'Cũ' });
    await createLog(user.id, { asked_at: new Date('2026-10-21T05:00:00.000Z'), medication_name: 'Mới' });
    await createLog(other.id, { asked_at: new Date('2026-10-22T05:00:00.000Z'), medication_name: 'Người khác' });

    const res = await request(app)
      .get('/api/v1/health-logs')
      .set('x-test-uid', 'uid-health-1')
      .set('x-test-user-id', String(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items.map((i: any) => i.medicationName)).toEqual(['Mới', 'Cũ']);
  });

  test('trả lời cảm giác + ghi chú', async () => {
    const user = await createTestUser('uid-health-3', '0900000013');
    const log = await createLog(user.id);

    const res = await request(app)
      .patch(`/api/v1/health-logs/${log.id}`)
      .set('x-test-uid', 'uid-health-3')
      .set('x-test-user-id', String(user.id))
      .send({ answer: 'tired', note: 'Hơi mệt sau khi uống' });

    expect(res.status).toBe(200);
    expect(res.body.data.answer).toBe('tired');
    expect(res.body.data.answerNote).toBe('Hơi mệt sau khi uống');
    expect(res.body.data.answeredAt).not.toBeNull();

    const saved = await HealthLog.findById(log.id);
    expect(saved!.answer).toBe('tired');
  });

  test('câu trả lời không hợp lệ → 400', async () => {
    const user = await createTestUser('uid-health-4', '0900000014');
    const log = await createLog(user.id);

    const res = await request(app)
      .patch(`/api/v1/health-logs/${log.id}`)
      .set('x-test-uid', 'uid-health-4')
      .set('x-test-user-id', String(user.id))
      .send({ answer: 'khong-biet' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('không trả lời được mục của người khác → 404', async () => {
    const owner = await createTestUser('uid-health-5', '0900000015');
    const other = await createTestUser('uid-health-6', '0900000016');
    const log = await createLog(owner.id);

    const res = await request(app)
      .patch(`/api/v1/health-logs/${log.id}`)
      .set('x-test-uid', 'uid-health-6')
      .set('x-test-user-id', String(other.id))
      .send({ answer: 'good' });

    expect(res.status).toBe(404);
    expect(await HealthLog.findById(log.id).then((l) => l!.answer)).toBeNull();
  });
});
