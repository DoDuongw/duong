import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Device } from '../models/Device';
import { ok } from '../middlewares/errorHandler';
import { requireAuthMiddleware, currentUserId, requireFirebaseAuthMiddleware } from '../middlewares/auth';
import { badRequest, notFound } from '../utils/errors';
import { env } from '../config/env';
import {
  SNOOZE_MAX_MAX,
  SNOOZE_MAX_MIN,
  SNOOZE_MINUTES_MAX,
  SNOOZE_MINUTES_MIN,
} from '../utils/preferences';
import { ADDRESS_MAX_LENGTH, PHONE_LOCAL_PART_LENGTH, normalizePhone } from '../utils/profile';

const router = Router();

/** SĐT hồ sơ: chuẩn hoá về `0xxxxxxxxx`; `null`/rỗng = xoá SĐT */
const phoneField = z
  .string()
  .max(20)
  .nullish()
  .transform((value, ctx) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    if (trimmed === '') return null;
    const normalized = normalizePhone(trimmed);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Số điện thoại không hợp lệ (cần ${PHONE_LOCAL_PART_LENGTH} chữ số, ví dụ 0912345678)`,
      });
      return z.NEVER;
    }
    return normalized;
  });

/** Địa chỉ: 1–200 ký tự; `null`/rỗng = xoá địa chỉ */
const addressField = z
  .string()
  .max(ADDRESS_MAX_LENGTH)
  .nullish()
  .transform((value, ctx) => {
    if (value === null || value === undefined) return null;
    const trimmed = value.trim();
    if (trimmed === '') return null;
    if (trimmed.length > ADDRESS_MAX_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Địa chỉ tối đa ${ADDRESS_MAX_LENGTH} ký tự`,
      });
      return z.NEVER;
    }
    return trimmed;
  });

const syncSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: phoneField.optional(),
  address: addressField.optional(),
  timezone: z.string().min(1).max(50).optional(),
  preferences: z.record(z.unknown()).optional(),
});

// Lần đăng nhập đầu tiên chưa có bản ghi user → chỉ cần token hợp lệ, route tự tạo bản ghi
router.post('/me/sync', requireFirebaseAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = syncSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.errors.map((e) => e.message).join('; '));

    const { uid } = req.user!;

    let user = await User.findOne({ firebase_uid: uid });
    if (!user) {
      try {
        user = await User.create({
          firebase_uid: uid,
          phone: parsed.data.phone ?? null,
          display_name: parsed.data.displayName ?? null,
          address: parsed.data.address ?? null,
          timezone: parsed.data.timezone ?? env.TZ_DEFAULT,
          preferences: parsed.data.preferences ?? null,
        });
      } catch (e) {
        // Hai request đồng thời (2 tab) cùng tạo → một request trúng unique index
        // `firebase_uid`; đọc lại bản ghi đã được request kia tạo thay vì trả 500.
        if ((e as { code?: number }).code === 11000) {
          user = await User.findOne({ firebase_uid: uid });
        }
        if (!user) throw e;
      }
    } else {
      const updates: Record<string, unknown> = {};
      if (parsed.data.displayName !== undefined) updates.display_name = parsed.data.displayName;
      if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
      if (parsed.data.address !== undefined) updates.address = parsed.data.address;
      if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone;
      if (parsed.data.preferences !== undefined) updates.preferences = parsed.data.preferences;
      if (Object.keys(updates).length > 0) {
        user = await User.findByIdAndUpdate(user._id, updates, { new: true });
      }
    }

    req.user!.userId = user!._id.toString();
    req.user!.isAdmin = user!.role === 'admin' ? true : undefined;
    ok(res, {
      id: user!._id,
      phone: user!.phone,
      displayName: user!.display_name,
      address: user!.address,
      timezone: user!.timezone,
      preferences: user!.preferences,
      role: user!.role,
    });
  } catch (e) {
    next(e);
  }
});

router.get('/me', requireAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findById(currentUserId(req));
    if (!user) throw notFound('Không tìm thấy người dùng');
    ok(res, {
      id: user._id,
      phone: user.phone,
      displayName: user.display_name,
      address: user.address,
      timezone: user.timezone,
      preferences: user.preferences,
      role: user.role,
    });
  } catch (e) {
    next(e);
  }
});

const patchSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  phone: phoneField.optional(),
  address: addressField.optional(),
  timezone: z.string().min(1).max(50).optional(),
  preferences: z.record(z.unknown()).optional(),
});

router.patch('/me', requireAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = patchSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.errors.map((e) => e.message).join('; '));
    const updates: Record<string, unknown> = {};
    if (parsed.data.displayName !== undefined) updates.display_name = parsed.data.displayName;
    if (parsed.data.phone !== undefined) updates.phone = parsed.data.phone;
    if (parsed.data.address !== undefined) updates.address = parsed.data.address;
    if (parsed.data.timezone !== undefined) updates.timezone = parsed.data.timezone;
    if (parsed.data.preferences !== undefined) updates.preferences = parsed.data.preferences;

    const user = await User.findByIdAndUpdate(currentUserId(req), updates, { new: true });
    if (!user) throw notFound('Không tìm thấy người dùng');
    ok(res, {
      id: user._id,
      phone: user.phone,
      displayName: user.display_name,
      address: user.address,
      timezone: user.timezone,
      preferences: user.preferences,
      role: user.role,
    });
  } catch (e) {
    next(e);
  }
});

const notifSettingsSchema = z.object({
  snoozeMinutes: z.number().int().min(SNOOZE_MINUTES_MIN).max(SNOOZE_MINUTES_MAX).optional(),
  snoozeMax: z.number().int().min(SNOOZE_MAX_MIN).max(SNOOZE_MAX_MAX).optional(),
});

// Cài đặt thông báo/nhắc lại (M08) — merge vào users.preferences (Mixed)
router.patch('/me/notification-settings', requireAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = notifSettingsSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest(parsed.error.errors.map((e) => e.message).join('; '));

    const user = await User.findById(currentUserId(req));
    if (!user) throw notFound('Không tìm thấy người dùng');

    const preferences = { ...(user.preferences ?? {}), ...parsed.data };
    user.preferences = preferences;
    await user.save();
    ok(res, { preferences: user.preferences });
  } catch (e) {
    next(e);
  }
});

const deviceSchema = z.object({
  fcmToken: z.string().min(1).max(512),
  platform: z.enum(['web']),
  userAgent: z.string().max(255).optional(),
});

router.post('/devices/register', requireAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = deviceSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Dữ liệu thiết bị không hợp lệ');
    let device = await Device.findOne({ fcm_token: parsed.data.fcmToken });
    if (!device) {
      device = await Device.create({
        user_id: currentUserId(req),
        fcm_token: parsed.data.fcmToken,
        platform: parsed.data.platform,
        user_agent: parsed.data.userAgent ?? null,
        notifications_enabled: true,
        last_seen_at: new Date(),
        status: 'active',
      });
    } else {
      device.user_id = currentUserId(req) as never;
      device.status = 'active';
      device.last_seen_at = new Date();
      await device.save();
    }
    ok(res, { id: device._id, platform: device.platform });
  } catch (e) {
    next(e);
  }
});

router.delete('/devices/unregister', requireAuthMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = z.object({ fcmToken: z.string().min(1) }).safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Thiếu fcmToken');
    await Device.findOneAndDelete({ fcm_token: parsed.data.fcmToken, user_id: currentUserId(req) });
    ok(res, { removed: true });
  } catch (e) {
    next(e);
  }
});

export default router;
