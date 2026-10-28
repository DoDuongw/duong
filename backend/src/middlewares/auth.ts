import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../config/firebase';
import { User, UserRole } from '../models/User';
import { unauthenticated, forbidden } from '../utils/errors';
import { env } from '../config/env';

export interface AuthUser {
  uid: string;
  /** Chỉ có khi user đã có bản ghi trong CSDL (lần đăng nhập đầu tiên thì chưa) */
  userId?: string;
  /** Múi giờ của người dùng (mặc định TZ_DEFAULT) — dùng để quy đổi ngày/giờ địa phương */
  timezone: string;
  /** Vai trò tài khoản; chỉ có khi đã có bản ghi user */
  role?: UserRole;
  /** true khi users.role = 'admin' (không gắn false để giữ nguyên dạng cũ của req.user) */
  isAdmin?: boolean;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const FIREBASE_NOT_CONFIGURED_MESSAGE =
  'Máy chủ chưa cấu hình Firebase Admin — điền FIREBASE_* trong backend/.env';

/**
 * Đọc Bearer token Firebase → gắn `req.user` nếu token hợp lệ.
 * `userId` chỉ được gắn khi đã có bản ghi user; lần đăng nhập đầu tiên chưa có
 * → `POST /users/me/sync` (dùng requireFirebaseAuthMiddleware) sẽ tạo bản ghi đó.
 * Token sai/không có → đi tiếp mà không có `req.user` (route tự quyết định 401).
 */
export async function authMiddleware(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = header.slice(7);
  try {
    const { uid } = await verifyIdToken(token);
    const user = await User.findOne({ firebase_uid: uid });
    // Tài khoản bị quản trị khóa: chặn ngay mọi API (kể cả đồng bộ hồ sơ)
    if (user?.disabled_at) {
      next(forbidden('Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.'));
      return;
    }
    req.user = {
      uid,
      userId: user ? user._id.toString() : undefined,
      timezone: user?.timezone || env.TZ_DEFAULT,
      ...(user ? { role: user.role ?? 'user' } : {}),
      ...(user?.role === 'admin' ? { isAdmin: true } : {}),
    };
    next();
  } catch (err) {
    // Server chưa có credentials Firebase Admin → báo rõ để người dùng sửa .env
    if ((err as { code?: string }).code === 'FIREBASE_NOT_CONFIGURED') {
      next(unauthenticated(FIREBASE_NOT_CONFIGURED_MESSAGE));
      return;
    }
    next();
  }
}

/** Chỉ cần token Firebase hợp lệ (user có thể chưa có bản ghi) — dùng cho POST /users/me/sync */
export function requireFirebaseAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(unauthenticated());
    return;
  }
  next();
}

/**
 * Lấy userId trong route ĐÃ qua requireAuthMiddleware.
 * Type `userId` là optional vì lần đăng nhập đầu tiên chưa có bản ghi user;
 * hàm này là nơi duy nhất chuyển optional → string (lỗi 401 nếu gọi nhầm chỗ).
 */
export function currentUserId(req: Request): string {
  const userId = req.user?.userId;
  if (!userId) throw unauthenticated();
  return userId;
}

/** Múi giờ của người dùng đang đăng nhập (mặc định TZ_DEFAULT nếu chưa có bản ghi) */
export function currentTimezone(req: Request): string {
  return req.user?.timezone || env.TZ_DEFAULT;
}

/** Vai trò của người dùng đang đăng nhập; chưa có bản ghi → 'user' */
export function currentUserRole(req: Request): UserRole {
  return req.user?.role ?? 'user';
}

/** Cần user đã có bản ghi trong CSDL */
export function requireAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.userId) {
    next(unauthenticated());
    return;
  }
  next();
}

/** Cần tài khoản vận hành (manager hoặc admin) — dùng cho khu vực /api/v1/admin */
export function requireStaffMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.userId) {
    next(unauthenticated());
    return;
  }
  if (req.user.role !== 'manager' && req.user.role !== 'admin' && !req.user.isAdmin) {
    next(forbidden('Chỉ quản lý hoặc quản trị viên mới được truy cập'));
    return;
  }
  next();
}

/** Cần tài khoản quản trị (users.role = 'admin') — dùng cho thao tác quản trị nâng cao */
export function requireAdminMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user?.userId) {
    next(unauthenticated());
    return;
  }
  if (!req.user.isAdmin && req.user.role !== 'admin') {
    next(forbidden('Chỉ quản trị viên mới được thực hiện thao tác này'));
    return;
  }
  next();
}
