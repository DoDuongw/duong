import { Router, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { currentUserId, requireAdminMiddleware, requireAuthMiddleware } from '../middlewares/auth';
import { ok } from '../middlewares/errorHandler';
import { badRequest, notFound } from '../utils/errors';
import {
  getSummary,
  listAuditLogs,
  listFailedNotifications,
  listUsers,
  resetUserPassword,
  setUserDisabled,
} from '../services/adminService';

/**
 * API quản trị — CHỈ tài khoản users.role = 'admin'.
 * Đây là khu vực vận hành riêng (/admin trên web), không phải màn hình M09.
 */
const router = Router();

router.use(requireAuthMiddleware, requireAdminMiddleware);

const listQuerySchema = z.object({
  q: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(50).optional(),
});

router.get('/summary', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    ok(res, await getSummary());
  } catch (e) {
    next(e);
  }
});

router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) throw badRequest(parsed.error.errors.map((e) => e.message).join('; '));
    ok(res, await listUsers(parsed.data));
  } catch (e) {
    next(e);
  }
});

function targetUserId(req: Request): string {
  const id = String(req.params.id);
  if (!mongoose.isValidObjectId(id)) throw notFound('Không tìm thấy người dùng');
  return id;
}

const statusSchema = z.object({ disabled: z.boolean() });

router.patch('/users/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = statusSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Thiếu trạng thái khóa (disabled: true/false)');
    ok(res, await setUserDisabled(currentUserId(req), targetUserId(req), parsed.data.disabled));
  } catch (e) {
    next(e);
  }
});

const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Mật khẩu mới phải có ít nhất 8 ký tự')
    .max(128, 'Mật khẩu mới quá dài'),
});

router.post('/users/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.errors.map((e) => e.message).join('; '));
    ok(res, await resetUserPassword(currentUserId(req), targetUserId(req), parsed.data.password));
  } catch (e) {
    next(e);
  }
});

const limitSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() });

router.get('/notifications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = limitSchema.safeParse(req.query);
    if (!parsed.success) throw badRequest('Tham số limit không hợp lệ');
    ok(res, await listFailedNotifications(parsed.data.limit ?? 20));
  } catch (e) {
    next(e);
  }
});

router.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = limitSchema.safeParse(req.query);
    if (!parsed.success) throw badRequest('Tham số limit không hợp lệ');
    ok(res, await listAuditLogs(parsed.data.limit ?? 20));
  } catch (e) {
    next(e);
  }
});

export default router;
