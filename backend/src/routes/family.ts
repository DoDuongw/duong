import { Router, Request, Response, NextFunction } from 'express';
import { createHash, randomInt } from 'crypto';
import { z } from 'zod';
import { FamilyInvite } from '../models/FamilyInvite';
import { FamilyConnection } from '../models/FamilyConnection';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { ok } from '../middlewares/errorHandler';
import { currentUserId, requireAuthMiddleware } from '../middlewares/auth';
import { badRequest, conflict, forbidden, notFound, rateLimited } from '../utils/errors';

const router = Router();
router.use(requireAuthMiddleware);

const INVITE_TTL_MINUTES = 15;
const INVITE_MAX_PER_MINUTE = 5;

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

router.post('/invites', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const oneMinuteAgo = new Date(Date.now() - 60_000);
    const recent = await FamilyInvite.countDocuments({ owner_id: userId, createdAt: { $gte: oneMinuteAgo } });
    if (recent >= INVITE_MAX_PER_MINUTE) throw rateLimited('Quá nhiều yêu cầu tạo mã mời, thử lại sau');

    const code = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + INVITE_TTL_MINUTES * 60_000);

    await FamilyInvite.updateMany({ owner_id: userId, status: 'pending' }, { $set: { status: 'revoked' } });

    const invite = await FamilyInvite.create({
      owner_id: userId,
      code_hash: hashCode(code),
      expires_at: expiresAt,
      status: 'pending',
    });

    await AuditLog.create({
      user_id: userId,
      entity: 'invite',
      entity_id: invite._id,
      action: 'create',
      details: { expires_at: expiresAt.toISOString() },
    });

    ok(res, { code, expiresAt: expiresAt.toISOString() }, 201);
  } catch (e) {
    next(e);
  }
});

router.post('/invites/:code/accept', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const code = String(req.params.code);
    if (!/^\d{6}$/.test(code)) throw badRequest('Mã mời phải gồm 6 chữ số');

    const invite = await FamilyInvite.findOne({ code_hash: hashCode(code), status: 'pending' });
    if (!invite) throw notFound('Mã mời không tồn tại hoặc đã hết hạn');
    if (invite.expires_at < new Date()) {
      invite.status = 'expired';
      await invite.save();
      throw notFound('Mã mời đã hết hạn');
    }
    if (invite.owner_id.toString() === userId) throw badRequest('Không thể kết nối với chính mình');

    const existing = await FamilyConnection.findOne({
      owner_id: invite.owner_id,
      relative_id: userId,
      status: 'active',
    });
    if (existing) throw conflict('Đã kết nối với người này');

    const conn = await FamilyConnection.create({
      owner_id: invite.owner_id,
      relative_id: userId,
      invite_id: invite._id,
      status: 'active',
      permissions: { view_schedule: true, manage_medication: false, relative_alerts: true },
      connected_at: new Date(),
    });
    invite.status = 'accepted';
    await invite.save();
    await AuditLog.create({
      user_id: userId,
      entity: 'connection',
      entity_id: conn._id,
      action: 'accept_invite',
      details: null,
    });

    const owner = await User.findById(invite.owner_id);
    ok(
      res,
      {
        id: conn._id,
        owner: { id: owner?._id, displayName: owner?.display_name },
        permissions: conn.permissions,
        connectedAt: conn.connected_at.toISOString(),
      },
      201,
    );
  } catch (e) {
    next(e);
  }
});

router.get('/connections', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const conns = await FamilyConnection.find({
      status: 'active',
      $or: [{ owner_id: userId }, { relative_id: userId }],
    }).sort({ connected_at: -1 });

    const otherIds = conns.map((c) =>
      c.owner_id.toString() === userId ? c.relative_id : c.owner_id,
    );
    const others = await User.find({ _id: { $in: otherIds } });
    const otherMap = new Map(others.map((u) => [u._id.toString(), u]));

    const result = conns.map((c) => {
      const isOwner = c.owner_id.toString() === userId;
      const other = otherMap.get((isOwner ? c.relative_id : c.owner_id).toString());
      return {
        id: c._id,
        role: isOwner ? 'owner' : 'relative',
        user: {
          id: other?._id,
          displayName: other?.display_name,
          phone: other?.phone,
          timezone: other?.timezone ?? null,
        },
        permissions: c.permissions,
        connectedAt: c.connected_at.toISOString(),
      };
    });
    ok(res, result);
  } catch (e) {
    next(e);
  }
});

const permSchema = z.object({
  viewSchedule: z.boolean().optional(),
  manageMedication: z.boolean().optional(),
  relativeAlerts: z.boolean().optional(),
});

router.patch('/connections/:id/permissions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = permSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw badRequest('Dữ liệu quyền không hợp lệ');
    const conn = await FamilyConnection.findById(req.params.id);
    if (!conn || conn.status !== 'active') throw notFound('Không tìm thấy kết nối');
    if (conn.owner_id.toString() !== currentUserId(req)) throw forbidden('Chỉ chủ hồ sơ được đổi quyền');

    const perms = {
      view_schedule: parsed.data.viewSchedule ?? conn.permissions.view_schedule,
      manage_medication: parsed.data.manageMedication ?? conn.permissions.manage_medication,
      relative_alerts: parsed.data.relativeAlerts ?? conn.permissions.relative_alerts,
    };
    conn.permissions = perms as never;
    await conn.save();
    await AuditLog.create({
      user_id: currentUserId(req),
      entity: 'connection',
      entity_id: conn._id,
      action: 'update_permissions',
      details: { permissions: perms },
    });
    ok(res, { id: conn._id, permissions: perms });
  } catch (e) {
    next(e);
  }
});

router.delete('/connections/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = currentUserId(req);
    const conn = await FamilyConnection.findById(req.params.id);
    if (!conn || conn.status !== 'active') throw notFound('Không tìm thấy kết nối');
    if (conn.owner_id.toString() !== userId && conn.relative_id.toString() !== userId) throw forbidden();

    conn.status = 'revoked';
    conn.revoked_at = new Date();
    await conn.save();
    await AuditLog.create({
      user_id: userId,
      entity: 'connection',
      entity_id: conn._id,
      action: 'revoke',
      details: null,
    });
    ok(res, { id: conn._id, status: 'revoked' });
  } catch (e) {
    next(e);
  }
});

export { router as familyRouter };
