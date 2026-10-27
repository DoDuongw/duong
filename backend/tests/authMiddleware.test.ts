import type { NextFunction, Request, Response } from 'express';

const mockVerifyIdToken = jest.fn();

jest.mock('../src/config/firebase', () => ({
  verifyIdToken: (token: string) => mockVerifyIdToken(token),
}));

import {
  authMiddleware,
  currentTimezone,
  requireAdminMiddleware,
  requireAuthMiddleware,
  requireFirebaseAuthMiddleware,
} from '../src/middlewares/auth';
import { User } from '../src/models/User';
import { closeDb, createTestUser, initDb, resetDb } from './helpers';

/** Chạy middleware (đồng bộ hoặc async) và trả về hàm next để kiểm tra */
async function runMiddleware(
  middleware: (req: Request, res: Response, next: NextFunction) => unknown,
  req: Request,
): Promise<jest.Mock> {
  const next = jest.fn();
  await middleware(req, {} as Response, next as unknown as NextFunction);
  return next;
}

function makeReq(authorization?: string): Request {
  return { headers: authorization ? { authorization } : {} } as Request;
}

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
  mockVerifyIdToken.mockReset();
});

describe('authMiddleware', () => {
  test('R1: token hợp lệ nhưng CHƯA có bản ghi user → vẫn gắn uid (để /users/me/sync tạo được user)', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-moi' });
    const req = makeReq('Bearer token-hop-le');

    const next = await runMiddleware(authMiddleware, req);

    expect(req.user).toEqual({ uid: 'uid-moi', userId: undefined, timezone: 'Asia/Ho_Chi_Minh' });
    expect(next).toHaveBeenCalledWith();
  });

  test('R2: token hợp lệ + đã có bản ghi user → gắn cả uid và userId', async () => {
    const user = await createTestUser('uid-co-san');
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-co-san' });
    const req = makeReq('Bearer token-hop-le');

    await runMiddleware(authMiddleware, req);

    expect(req.user?.uid).toBe('uid-co-san');
    expect(req.user?.userId).toBe(String(user.id));
    expect(req.user?.timezone).toBe('Asia/Ho_Chi_Minh');
  });

  test('R2b: user đổi múi giờ → req.user.timezone theo dữ liệu user', async () => {
    const user = await createTestUser('uid-tz');
    await User.updateOne({ _id: user.id }, { $set: { timezone: 'Asia/Tokyo' } });
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-tz' });
    const req = makeReq('Bearer token-hop-le');

    await runMiddleware(authMiddleware, req);

    expect(currentTimezone(req)).toBe('Asia/Tokyo');
  });

  test('R3: token sai → không gắn user, không làm sập request', async () => {
    mockVerifyIdToken.mockRejectedValue(Object.assign(new Error('invalid'), { code: 'auth/argument-error' }));
    const req = makeReq('Bearer token-sai');

    const next = await runMiddleware(authMiddleware, req);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  test('R4: không có header Authorization → đi tiếp không xác thực', async () => {
    const req = makeReq();
    const next = await runMiddleware(authMiddleware, req);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith();
  });

  test('R5: server chưa cấu hình Firebase Admin → 401 kèm hướng dẫn sửa .env', async () => {
    mockVerifyIdToken.mockRejectedValue(
      Object.assign(new Error('chưa cấu hình'), { code: 'FIREBASE_NOT_CONFIGURED' }),
    );
    const req = makeReq('Bearer bat-ky');

    const next = await runMiddleware(authMiddleware, req);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, message: expect.stringContaining('backend/.env') }),
    );
  });

  test('R10: tài khoản bị quản trị khóa → 403 ngay, không gắn req.user', async () => {
    const user = await createTestUser('uid-bi-khoa');
    await User.updateOne({ _id: user.id }, { $set: { disabled_at: new Date() } });
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-bi-khoa' });
    const req = makeReq('Bearer token-hop-le');

    const next = await runMiddleware(authMiddleware, req);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 403,
        code: 'FORBIDDEN',
        message: expect.stringContaining('bị khóa'),
      }),
    );
  });

  test('R11: role admin → req.user.isAdmin = true', async () => {
    const user = await createTestUser('uid-admin');
    user.role = 'admin';
    await user.save();
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-admin' });
    const req = makeReq('Bearer token-hop-le');

    await runMiddleware(authMiddleware, req);

    expect(req.user?.isAdmin).toBe(true);
  });

  test('R12: người dùng thường → không có cờ isAdmin', async () => {
    await createTestUser('uid-thuong');
    mockVerifyIdToken.mockResolvedValue({ uid: 'uid-thuong' });
    const req = makeReq('Bearer token-hop-le');

    await runMiddleware(authMiddleware, req);

    expect(req.user?.isAdmin).toBeUndefined();
  });
});

describe('requireAuthMiddleware (cần bản ghi user)', () => {
  test('R6: có uid nhưng chưa có userId → 401', async () => {
    const req = makeReq();
    req.user = { uid: 'uid-moi', timezone: 'Asia/Ho_Chi_Minh' };

    const next = await runMiddleware(requireAuthMiddleware, req);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }));
  });

  test('R7: có userId → đi tiếp', async () => {
    const req = makeReq();
    req.user = { uid: 'uid-x', userId: 'user-x', timezone: 'Asia/Ho_Chi_Minh' };

    const next = await runMiddleware(requireAuthMiddleware, req);

    expect(next).toHaveBeenCalledWith();
  });
});

describe('requireFirebaseAuthMiddleware (chỉ cần token — dùng cho /users/me/sync)', () => {
  test('R8: có uid dù chưa có user trong CSDL → đi tiếp (không chặn lần đăng nhập đầu)', async () => {
    const req = makeReq();
    req.user = { uid: 'uid-moi', timezone: 'Asia/Ho_Chi_Minh' };

    const next = await runMiddleware(requireFirebaseAuthMiddleware, req);

    expect(next).toHaveBeenCalledWith();
  });

  test('R9: không có token → 401', async () => {
    const req = makeReq();

    const next = await runMiddleware(requireFirebaseAuthMiddleware, req);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }));
  });
});

describe('requireAdminMiddleware', () => {
  test('R13: người dùng thường → 403 FORBIDDEN', async () => {
    const req = makeReq();
    req.user = { uid: 'uid-thuong', userId: 'user-thuong', timezone: 'Asia/Ho_Chi_Minh' };

    const next = await runMiddleware(requireAdminMiddleware, req);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 403, code: 'FORBIDDEN' }),
    );
  });

  test('R14: chưa có bản ghi user → 401', async () => {
    const req = makeReq();
    req.user = { uid: 'uid-moi', timezone: 'Asia/Ho_Chi_Minh' };

    const next = await runMiddleware(requireAdminMiddleware, req);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, code: 'UNAUTHENTICATED' }),
    );
  });

  test('R15: admin → đi tiếp', async () => {
    const req = makeReq();
    req.user = {
      uid: 'uid-admin',
      userId: 'user-admin',
      timezone: 'Asia/Ho_Chi_Minh',
      isAdmin: true,
    };

    const next = await runMiddleware(requireAdminMiddleware, req);

    expect(next).toHaveBeenCalledWith();
  });
});
