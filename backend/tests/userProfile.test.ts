import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, closeDb, resetDb, createTestUser } from './helpers';
import { User } from '../src/models/User';
import { normalizePhone, isValidAddress, phoneToInternalEmail } from '../src/utils/profile';

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

describe('normalizePhone — chuẩn hoá SĐT Việt Nam', () => {
  test('giữ nguyên dạng 0xxxxxxxxx', () => {
    expect(normalizePhone('0912345678')).toBe('0912345678');
  });

  test('đổi +84 và 84 về dạng 0', () => {
    expect(normalizePhone('+84912345678')).toBe('0912345678');
    expect(normalizePhone('84912345678')).toBe('0912345678');
  });

  test('bỏ khoảng trắng, gạch, chấm, ngoặc', () => {
    expect(normalizePhone('091 234-56.78')).toBe('0912345678');
    expect(normalizePhone('(091) 234 5678')).toBe('0912345678');
  });

  test('đầu số hợp lệ 03/05/07/08/09', () => {
    for (const prefix of ['03', '05', '07', '08', '09']) {
      expect(normalizePhone(`${prefix}12345678`)).toBe(`${prefix}12345678`);
    }
  });

  test('từ chối số không hợp lệ', () => {
    expect(normalizePhone('0123456789')).toBeNull(); // đầu số 01 không còn dùng
    expect(normalizePhone('091234567')).toBeNull(); // thiếu 1 chữ số
    expect(normalizePhone('09123456789')).toBeNull(); // thừa 1 chữ số
    expect(normalizePhone('abc')).toBeNull();
    expect(normalizePhone('')).toBeNull();
  });

  test('email nội bộ dựng từ SĐT đã chuẩn hoá', () => {
    expect(phoneToInternalEmail('0912345678')).toBe('0912345678@med.local');
  });
});

describe('isValidAddress', () => {
  test('nhận địa chỉ bình thường, cắt khoảng trắng', () => {
    expect(isValidAddress('  12 Lê Lợi, Q.1  ')).toBe(true);
  });

  test('từ chối rỗng hoặc quá 200 ký tự', () => {
    expect(isValidAddress('   ')).toBe(false);
    expect(isValidAddress('a'.repeat(201))).toBe(false);
    expect(isValidAddress('a'.repeat(200))).toBe(true);
  });
});

describe('POST /users/me/sync — hồ sơ lần đầu (SĐT + địa chỉ)', () => {
  test('tạo bản ghi mới lưu được SĐT và địa chỉ', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/sync')
      .set({ 'x-test-uid': 'uid-new' })
      .send({ displayName: 'Bà Lan', phone: '0912345678', address: '12 Lê Lợi, Q.1' });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('0912345678');
    expect(res.body.data.address).toBe('12 Lê Lợi, Q.1');
    expect(res.body.data.displayName).toBe('Bà Lan');
  });

  test('SĐT sai định dạng → 400, không tạo bản ghi', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/sync')
      .set({ 'x-test-uid': 'uid-bad' })
      .send({ phone: '0123456789' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(await User.findOne({ firebase_uid: 'uid-bad' })).toBeNull();
  });

  test('SĐT dạng +84 được chuẩn hoá về 0 khi lưu', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/sync')
      .set({ 'x-test-uid': 'uid-84' })
      .send({ phone: '+84912345678' });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('0912345678');
  });

  test('sync lần hai cập nhật SĐT/địa chỉ thay vì bỏ qua', async () => {
    const user = await createTestUser('uid-2', '0900000001');

    const res = await request(app)
      .post('/api/v1/users/me/sync')
      .set(as(user.id, 'uid-2'))
      .send({ phone: '0987654321', address: '99 Nguyễn Huệ' });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('0987654321');
    expect(res.body.data.address).toBe('99 Nguyễn Huệ');
  });
});

describe('PATCH /users/me — SĐT và địa chỉ (M08)', () => {
  test('lưu SĐT + địa chỉ rồi GET /me trả lại đúng', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const patch = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ phone: '0912345678', address: '12 Lê Lợi, Q.1' });

    expect(patch.status).toBe(200);
    expect(patch.body.data.phone).toBe('0912345678');
    expect(patch.body.data.address).toBe('12 Lê Lợi, Q.1');

    const get = await request(app).get('/api/v1/users/me').set(as(user.id, 'uid-1'));
    expect(get.body.data.phone).toBe('0912345678');
    expect(get.body.data.address).toBe('12 Lê Lợi, Q.1');
  });

  test('SĐT không hợp lệ → 400, giữ nguyên giá trị cũ', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ phone: '123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    const fresh = await User.findById(user.id);
    expect(fresh!.phone).toBe('0900000001');
  });

  test('địa chỉ quá dài → 400', async () => {
    const user = await createTestUser('uid-1', '0900000001');

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ address: 'a'.repeat(201) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('chuỗi rỗng hoặc null xoá SĐT/địa chỉ', async () => {
    const user = await createTestUser('uid-1', '0900000001');
    await User.updateOne({ _id: user.id }, { $set: { address: '12 Lê Lợi' } });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ phone: '', address: null });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBeNull();
    expect(res.body.data.address).toBeNull();
  });

  test('patch chỉ tên hiển thị không xoá SĐT/địa chỉ', async () => {
    const user = await createTestUser('uid-1', '0900000001');
    await User.updateOne({ _id: user.id }, { $set: { address: '12 Lê Lợi' } });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set(as(user.id, 'uid-1'))
      .send({ displayName: 'Ông Ba' });

    expect(res.status).toBe(200);
    expect(res.body.data.phone).toBe('0900000001');
    expect(res.body.data.address).toBe('12 Lê Lợi');
  });
});
