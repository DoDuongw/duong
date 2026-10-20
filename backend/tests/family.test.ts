import request from 'supertest';
import { Types } from 'mongoose';
import { createApp } from '../src/app';
import { initDb, closeDb, resetDb, createTestUser, createTestMedication, createTestSchedule, createTestDose } from './helpers';
import { FamilyConnection } from '../src/models/FamilyConnection';

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

/** Header danh tính người dùng test (khớp middleware auth giả ở trên) */
function as(userId: string, uid = 'uid') {
  return { 'x-test-uid': uid, 'x-test-user-id': userId };
}

async function connect(
  ownerId: string,
  relativeId: string,
  perms: { view_schedule: boolean; manage_medication: boolean; relative_alerts?: boolean },
) {
  return FamilyConnection.create({
    owner_id: ownerId,
    relative_id: relativeId,
    invite_id: new Types.ObjectId(),
    status: 'active',
    permissions: { relative_alerts: true, ...perms },
    connected_at: new Date(),
  });
}

describe('S3 — người thân chưa kết nối không xem được dữ liệu chủ hồ sơ', () => {
  test('GET /doses/today?ownerId= của người lạ → 403', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const stranger = await createTestUser('uid-stranger', '0900000002');

    const res = await request(app)
      .get(`/api/v1/doses/today?ownerId=${owner.id}`)
      .set(as(stranger.id, 'uid-stranger'));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('GET /history?ownerId= của người lạ → 403', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const stranger = await createTestUser('uid-stranger', '0900000002');

    const res = await request(app)
      .get(`/api/v1/history?ownerId=${owner.id}`)
      .set(as(stranger.id, 'uid-stranger'));

    expect(res.status).toBe(403);
  });

  test('người thân có view_schedule xem được (200)', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');
    await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const res = await request(app)
      .get(`/api/v1/doses/today?ownerId=${owner.id}`)
      .set(as(relative.id, 'uid-relative'));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('S4 — người thân có view_schedule không được tạo thuốc cho chủ hồ sơ', () => {
  test('POST /medications?ownerId= khi manage_medication=false → 403', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');
    await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const res = await request(app)
      .post(`/api/v1/medications?ownerId=${owner.id}`)
      .set(as(relative.id, 'uid-relative'))
      .send({
        name: 'Thuốc huyết áp',
        startDate: '2026-10-01',
        schedules: [{ timeOfDay: '08:00' }],
      });

    expect(res.status).toBe(403);
  });
});

describe('S5 — thu hồi quyền có hiệu lực ngay', () => {
  test('sau khi ngắt kết nối, request kế tiếp bị 403', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');
    const conn = await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const before = await request(app)
      .get(`/api/v1/doses/today?ownerId=${owner.id}`)
      .set(as(relative.id, 'uid-relative'));
    expect(before.status).toBe(200);

    const revoke = await request(app)
      .delete(`/api/v1/family/connections/${conn.id}`)
      .set(as(owner.id, 'uid-owner'));
    expect(revoke.status).toBe(200);

    const after = await request(app)
      .get(`/api/v1/doses/today?ownerId=${owner.id}`)
      .set(as(relative.id, 'uid-relative'));
    expect(after.status).toBe(403);
  });

  test('chỉ chủ hồ sơ được đổi quyền', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');
    const conn = await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const res = await request(app)
      .patch(`/api/v1/family/connections/${conn.id}/permissions`)
      .set(as(relative.id, 'uid-relative'))
      .send({ manageMedication: true });

    expect(res.status).toBe(403);
  });

  test('chủ hồ sơ bật/tắt relative_alerts', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');
    const conn = await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const res = await request(app)
      .patch(`/api/v1/family/connections/${conn.id}/permissions`)
      .set(as(owner.id, 'uid-owner'))
      .send({ relativeAlerts: false });

    expect(res.status).toBe(200);
    expect(res.body.data.permissions.relative_alerts).toBe(false);
    // Không đổi các quyền khác
    expect(res.body.data.permissions.view_schedule).toBe(true);
  });
});

describe('R3 — người thân mở lần uống của chủ hồ sơ (M02 chỉ xem)', () => {
  async function setupDose() {
    const owner = await createTestUser('uid-owner', '0900000001');
    const med = await createTestMedication(owner.id);
    const sch = await createTestSchedule(owner.id, med.id);
    const dose = await createTestDose(owner.id, sch.id, med.id, new Date('2026-10-20T01:00:00.000Z'));
    return { owner, dose };
  }

  test('người thân có view_schedule mở GET /doses/:id (không cần ownerId) → 200, canAct=false', async () => {
    const { owner, dose } = await setupDose();
    const relative = await createTestUser('uid-relative', '0900000002');
    await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const res = await request(app)
      .get(`/api/v1/doses/${dose.id}`)
      .set(as(relative.id, 'uid-relative'));

    expect(res.status).toBe(200);
    expect(res.body.data.canAct).toBe(false);
    expect(res.body.data.timezone).toBe('Asia/Ho_Chi_Minh');
    expect(res.body.data.medicationName).toBe('Thuốc test');
  });

  test('chủ hồ sơ mở lần uống của mình → canAct=true', async () => {
    const { owner, dose } = await setupDose();

    const res = await request(app).get(`/api/v1/doses/${dose.id}`).set(as(owner.id, 'uid-owner'));

    expect(res.status).toBe(200);
    expect(res.body.data.canAct).toBe(true);
  });

  test('người lạ mở lần uống của người khác → 403', async () => {
    const { dose } = await setupDose();
    const stranger = await createTestUser('uid-stranger', '0900000003');

    const res = await request(app)
      .get(`/api/v1/doses/${dose.id}`)
      .set(as(stranger.id, 'uid-stranger'));

    expect(res.status).toBe(403);
  });

  test('kết nối không có view_schedule → 403', async () => {
    const { owner, dose } = await setupDose();
    const relative = await createTestUser('uid-relative', '0900000002');
    await connect(owner.id, relative.id, { view_schedule: false, manage_medication: false });

    const res = await request(app)
      .get(`/api/v1/doses/${dose.id}`)
      .set(as(relative.id, 'uid-relative'));

    expect(res.status).toBe(403);
  });

  test('GET /family/connections trả kèm múi giờ của người kia', async () => {
    const { owner } = await setupDose();
    const relative = await createTestUser('uid-relative', '0900000002');
    await connect(owner.id, relative.id, { view_schedule: true, manage_medication: false });

    const res = await request(app)
      .get('/api/v1/family/connections')
      .set(as(relative.id, 'uid-relative'));

    expect(res.status).toBe(200);
    expect(res.body.data[0].role).toBe('relative');
    expect(res.body.data[0].user.id).toBe(owner.id);
    expect(res.body.data[0].user.timezone).toBe('Asia/Ho_Chi_Minh');
  });
});

describe('S6 — mã mời sai/hết hạn', () => {
  test('mã sai → 404, không tạo kết nối', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');

    const res = await request(app)
      .post('/api/v1/family/invites/000000/accept')
      .set(as(relative.id, 'uid-relative'));

    expect(res.status).toBe(404);
    const count = await FamilyConnection.countDocuments({ owner_id: owner.id, relative_id: relative.id });
    expect(count).toBe(0);
  });

  test('mã hết hạn → 404', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');
    const relative = await createTestUser('uid-relative', '0900000002');
    const created = await request(app)
      .post('/api/v1/family/invites')
      .set(as(owner.id, 'uid-owner'));
    expect(created.status).toBe(201);
    const code = created.body.data.code as string;

    // Đẩy hạn về quá khứ để mô phỏng mã hết hạn
    const { FamilyInvite } = await import('../src/models/FamilyInvite');
    await FamilyInvite.updateMany(
      { owner_id: owner.id },
      { $set: { expires_at: new Date(Date.now() - 60_000) } },
    );

    const res = await request(app)
      .post(`/api/v1/family/invites/${code}/accept`)
      .set(as(relative.id, 'uid-relative'));

    expect(res.status).toBe(404);
    expect(await FamilyConnection.countDocuments({ owner_id: owner.id, relative_id: relative.id })).toBe(0);
  });
});

describe('S7 — giới hạn tạo mã mời', () => {
  test('request thứ 6 trong một phút bị 429', async () => {
    const owner = await createTestUser('uid-owner', '0900000001');

    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/v1/family/invites')
        .set(as(owner.id, 'uid-owner'));
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5)).toEqual([201, 201, 201, 201, 201]);
    expect(statuses[5]).toBe(429);
  });
});
