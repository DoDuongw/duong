import request from 'supertest';
import mongoose from 'mongoose';

const mockSetDisabled = jest.fn();
const mockSetPassword = jest.fn();
const mockRevoke = jest.fn();

jest.mock('../src/config/firebase', () => ({
  isFirebaseReady: () => true,
  getFirebaseUserEmails: async (uids: string[]) =>
    Object.fromEntries(uids.map((uid) => [uid, `${uid}@test.local`])),
  setFirebaseUserDisabled: (uid: string, disabled: boolean) => mockSetDisabled(uid, disabled),
  setFirebaseUserPassword: (uid: string, password: string) => mockSetPassword(uid, password),
  revokeFirebaseRefreshTokens: (uid: string) => mockRevoke(uid),
}));

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
          ...(req.headers['x-test-admin'] === 'yes' ? { isAdmin: true } : {}),
        };
      }
      next();
    },
  };
});

import { createApp } from '../src/app';
import { User } from '../src/models/User';
import { FamilyConnection } from '../src/models/FamilyConnection';
import { NotificationLog } from '../src/models/NotificationLog';
import { AuditLog } from '../src/models/AuditLog';
import {
  closeDb,
  createTestDevice,
  createTestDose,
  createTestMedication,
  createTestSchedule,
  createTestUser,
  initDb,
  resetDb,
} from './helpers';

const app = createApp();

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
  mockSetDisabled.mockReset();
  mockSetPassword.mockReset();
  mockRevoke.mockReset();
  mockSetDisabled.mockResolvedValue(undefined);
  mockSetPassword.mockResolvedValue(undefined);
  mockRevoke.mockResolvedValue(undefined);
});

/** Header giả lập đăng nhập; admin=true để qua requireAdminMiddleware */
function as(userId: string, uid = 'uid', admin = true) {
  return {
    'x-test-uid': uid,
    'x-test-user-id': userId,
    ...(admin ? { 'x-test-admin': 'yes' } : {}),
  };
}

describe('Phân quyền khu vực quản trị', () => {
  test('chưa đăng nhập → 401', async () => {
    const res = await request(app).get('/api/v1/admin/summary');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('người dùng thường → 403, không đọc được dữ liệu', async () => {
    const user = await createTestUser('uid-thuong');

    const res = await request(app).get('/api/v1/admin/users').set(as(user.id, 'uid-thuong', false));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('admin đọc đúng một người dùng: GET /users/me trả role admin', async () => {
    const admin = await createTestUser('uid-admin');
    admin.role = 'admin';
    await admin.save();

    const res = await request(app).get('/api/v1/users/me').set(as(admin.id, 'uid-admin', false));

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('admin');
  });

  test('người dùng thường: GET /users/me trả role user', async () => {
    const user = await createTestUser('uid-thuong');

    const res = await request(app).get('/api/v1/users/me').set(as(user.id, 'uid-thuong', false));

    expect(res.body.data.role).toBe('user');
  });
});

describe('GET /admin/summary', () => {
  test('đếm đúng số liệu vận hành trong 24 giờ, không trả nội dung y tế', async () => {
    const owner = await createTestUser('uid-owner');
    const relative = await createTestUser('uid-relative', '0900000002');
    await User.updateOne({ _id: relative.id }, { $set: { disabled_at: new Date() } });

    const med = await createTestMedication(owner.id);
    const schedule = await createTestSchedule(owner.id, med.id);
    const dose = await createTestDose(owner.id, schedule.id, med.id, new Date(), 'confirmed');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await createTestDose(owner.id, schedule.id, med.id, tomorrow, 'pending');
    await createTestDevice(owner.id);

    await FamilyConnection.create({
      owner_id: owner.id,
      relative_id: relative.id,
      invite_id: new mongoose.Types.ObjectId(),
      status: 'active',
      permissions: { view_schedule: true, manage_medication: false, relative_alerts: true },
      connected_at: new Date(),
    });

    await NotificationLog.create({
      dose_id: dose.id,
      device_id: null,
      channel: 'fcm',
      kind: 'scheduled_reminder',
      sent_at: new Date(),
      status: 'failed',
      error: 'token hết hạn',
    });

    const res = await request(app).get('/api/v1/admin/summary').set(as(owner.id, 'uid-owner'));

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      users: 2,
      disabledUsers: 1,
      activeMedications: 1,
      doses24h: 1,
      confirmed24h: 1,
      activeConnections: 1,
      activeDevices: 1,
      failedNotifications24h: 1,
    });
    expect(JSON.stringify(res.body.data)).not.toContain('Thuốc test');
  });
});

describe('GET /admin/users', () => {
  test('tìm theo tên, trả số đếm + email, KHÔNG chứa tên thuốc', async () => {
    const owner = await createTestUser('uid-owner');
    owner.display_name = 'Bà Lan';
    await owner.save();
    const med = await createTestMedication(owner.id);
    const schedule = await createTestSchedule(owner.id, med.id);
    await createTestDose(owner.id, schedule.id, med.id, new Date(), 'confirmed');
    await createTestDevice(owner.id);

    const res = await request(app).get('/api/v1/admin/users').query({ q: 'Lan' }).set(as(owner.id));

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(1);
    expect(res.body.data.items[0]).toMatchObject({
      displayName: 'Bà Lan',
      phone: '0900000001',
      email: 'uid-owner@test.local',
      role: 'user',
      disabled: false,
      medicationsActive: 1,
      doses7d: 1,
      confirmed7d: 1,
      devicesActive: 1,
    });
    expect(JSON.stringify(res.body.data)).not.toContain('Thuốc test');
  });

  test('không khớp tên/SĐT → danh sách rỗng', async () => {
    const owner = await createTestUser('uid-owner');

    const res = await request(app).get('/api/v1/admin/users').query({ q: 'khong-co-ai' }).set(as(owner.id));

    expect(res.body.data.total).toBe(0);
    expect(res.body.data.items).toEqual([]);
  });

  test('phân trang: pageSize=2, trang 2 còn 1 người', async () => {
    const admin = await createTestUser('uid-1');
    await createTestUser('uid-2', '0900000002');
    await createTestUser('uid-3', '0900000003');

    const res = await request(app)
      .get('/api/v1/admin/users')
      .query({ page: 2, pageSize: 2 })
      .set(as(admin.id));

    expect(res.body.data.total).toBe(3);
    expect(res.body.data.page).toBe(2);
    expect(res.body.data.pageSize).toBe(2);
    expect(res.body.data.items).toHaveLength(1);
  });
});

describe('PATCH /admin/users/:id/status — khóa/mở tài khoản', () => {
  test('admin không thể tự khóa chính mình → 400', async () => {
    const admin = await createTestUser('uid-admin');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${admin.id}/status`)
      .set(as(admin.id, 'uid-admin'))
      .send({ disabled: true });

    expect(res.status).toBe(400);
    expect(mockSetDisabled).not.toHaveBeenCalled();
  });

  test('khóa: gọi Firebase disabled + lưu disabled_at + ghi nhật ký', async () => {
    const admin = await createTestUser('uid-admin');
    const target = await createTestUser('uid-target', '0900000002');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set(as(admin.id, 'uid-admin'))
      .send({ disabled: true });

    expect(res.status).toBe(200);
    expect(res.body.data.disabled).toBe(true);
    expect(mockSetDisabled).toHaveBeenCalledWith('uid-target', true);
    expect(mockRevoke).toHaveBeenCalledWith('uid-target');

    const fresh = await User.findById(target.id);
    expect(fresh!.disabled_at).toBeInstanceOf(Date);

    const log = await AuditLog.findOne({ action: 'admin_lock' });
    expect(log).not.toBeNull();
    expect(String(log!.user_id)).toBe(String(target.id));
    expect(log!.details).toMatchObject({ admin_id: String(admin.id) });
  });

  test('mở khóa: Firebase disabled=false + xoá disabled_at + ghi nhật ký', async () => {
    const admin = await createTestUser('uid-admin');
    const target = await createTestUser('uid-target', '0900000002');
    await User.updateOne({ _id: target.id }, { $set: { disabled_at: new Date() } });

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set(as(admin.id, 'uid-admin'))
      .send({ disabled: false });

    expect(res.status).toBe(200);
    expect(res.body.data.disabled).toBe(false);
    expect(mockSetDisabled).toHaveBeenCalledWith('uid-target', false);

    const fresh = await User.findById(target.id);
    expect(fresh!.disabled_at).toBeNull();
    expect(await AuditLog.findOne({ action: 'admin_unlock' })).not.toBeNull();
  });

  test('thiếu trường disabled → 400', async () => {
    const admin = await createTestUser('uid-admin');
    const target = await createTestUser('uid-target', '0900000002');

    const res = await request(app)
      .patch(`/api/v1/admin/users/${target.id}/status`)
      .set(as(admin.id, 'uid-admin'))
      .send({});

    expect(res.status).toBe(400);
  });

  test('id không hợp lệ → 404', async () => {
    const admin = await createTestUser('uid-admin');
    const res = await request(app)
      .patch('/api/v1/admin/users/khong-phai-object-id/status')
      .set(as(admin.id))
      .send({ disabled: true });
    expect(res.status).toBe(404);
  });
});

describe('POST /admin/users/:id/reset-password', () => {
  test('đặt lại mật khẩu: gọi Firebase, trả reset, không lưu mật khẩu ở DB/nhật ký', async () => {
    const admin = await createTestUser('uid-admin');
    const target = await createTestUser('uid-target', '0900000002');
    const password = 'mat-khau-moi-123';

    const res = await request(app)
      .post(`/api/v1/admin/users/${target.id}/reset-password`)
      .set(as(admin.id, 'uid-admin'))
      .send({ password });

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ id: String(target.id), reset: true });
    expect(mockSetPassword).toHaveBeenCalledWith('uid-target', password);
    expect(mockRevoke).toHaveBeenCalledWith('uid-target');

    const logs = await AuditLog.find({ action: 'admin_reset_password' }).lean();
    expect(logs).toHaveLength(1);
    expect(JSON.stringify(logs)).not.toContain(password);
  });

  test('mật khẩu dưới 8 ký tự → 400, không gọi Firebase', async () => {
    const admin = await createTestUser('uid-admin');
    const target = await createTestUser('uid-target', '0900000002');

    const res = await request(app)
      .post(`/api/v1/admin/users/${target.id}/reset-password`)
      .set(as(admin.id, 'uid-admin'))
      .send({ password: '1234567' });

    expect(res.status).toBe(400);
    expect(mockSetPassword).not.toHaveBeenCalled();
  });

  test('người dùng không tồn tại → 404', async () => {
    const admin = await createTestUser('uid-admin');
    const res = await request(app)
      .post(`/api/v1/admin/users/${new mongoose.Types.ObjectId()}/reset-password`)
      .set(as(admin.id))
      .send({ password: 'mat-khau-moi-123' });
    expect(res.status).toBe(404);
  });
});

describe('Log vận hành', () => {
  test('GET /admin/notifications trả lỗi gửi push mới nhất', async () => {
    const owner = await createTestUser('uid-owner');
    const med = await createTestMedication(owner.id);
    const schedule = await createTestSchedule(owner.id, med.id);
    const dose = await createTestDose(owner.id, schedule.id, med.id, new Date());
    await NotificationLog.create({
      dose_id: dose.id,
      device_id: null,
      channel: 'fcm',
      kind: 'relative_alert',
      sent_at: new Date(),
      status: 'failed',
      error: 'token không còn hiệu lực',
    });

    const res = await request(app).get('/api/v1/admin/notifications').set(as(owner.id));

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ kind: 'relative_alert', error: 'token không còn hiệu lực' });
  });

  test('GET /admin/audit-logs trả tên người thao tác', async () => {
    const owner = await createTestUser('uid-owner');
    owner.display_name = 'Bà Lan';
    await owner.save();

    await AuditLog.create({
      user_id: owner.id,
      entity: 'user',
      entity_id: owner.id,
      action: 'admin_lock',
      details: { admin_id: String(owner.id) },
    });

    const res = await request(app).get('/api/v1/admin/audit-logs').set(as(owner.id));

    expect(res.status).toBe(200);
    expect(res.body.data[0]).toMatchObject({ action: 'admin_lock', actorName: 'Bà Lan' });
  });
});
