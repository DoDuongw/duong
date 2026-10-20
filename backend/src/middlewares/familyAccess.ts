import { Request } from 'express';
import { Types } from 'mongoose';
import { FamilyConnection } from '../models/FamilyConnection';
import { User } from '../models/User';
import { currentTimezone, currentUserId } from './auth';
import { env } from '../config/env';
import { forbidden } from '../utils/errors';

export interface OwnerAccess {
  /** Chủ hồ sơ mà yêu cầu này đọc dữ liệu (mặc định là chính người gọi) */
  ownerId: string;
  /** Múi giờ của chủ hồ sơ — dùng để quy đổi ngày/giờ địa phương */
  timezone: string;
  /** true khi người gọi là người thân đọc hộ hồ sơ khác */
  isRelative: boolean;
  /** Người gọi có quyền thiết lập thuốc cho hồ sơ này không */
  canManage: boolean;
}

/**
 * Xác định chủ hồ sơ cho một yêu cầu đọc/ghi (M07 — phân quyền người thân):
 * - Không truyền `?ownerId=` → dùng `opts.fallbackOwnerId` (chủ của tài nguyên đang đọc,
 *   ví dụ `dose.user_id`) nếu có, ngược lại là chính người gọi.
 * - Chủ hồ sơ trùng chính mình → toàn quyền.
 * - Chủ hồ sơ khác → phải có kết nối `active` + `view_schedule`;
 *   nếu `opts.manage` thì cần thêm `manage_medication`.
 * Không đủ quyền → 403 (không lộ sự tồn tại của hồ sơ).
 */
export async function resolveOwnerAccess(
  req: Request,
  opts: { manage?: boolean; fallbackOwnerId?: string } = {},
): Promise<OwnerAccess> {
  const callerId = currentUserId(req);
  const requested = req.query.ownerId
    ? String(req.query.ownerId)
    : (opts.fallbackOwnerId ?? callerId);

  if (requested === callerId) {
    return { ownerId: callerId, timezone: currentTimezone(req), isRelative: false, canManage: true };
  }

  if (!Types.ObjectId.isValid(requested)) throw forbidden('Không có quyền truy cập dữ liệu này');

  const conn = await FamilyConnection.findOne({
    owner_id: requested,
    relative_id: callerId,
    status: 'active',
  });
  if (!conn || !conn.permissions.view_schedule) {
    throw forbidden('Không có quyền truy cập dữ liệu này');
  }
  if (opts.manage && !conn.permissions.manage_medication) {
    throw forbidden('Không có quyền thiết lập thuốc cho hồ sơ này');
  }

  const owner = await User.findById(requested);
  return {
    ownerId: requested,
    timezone: owner?.timezone || env.TZ_DEFAULT,
    isRelative: true,
    canManage: conn.permissions.manage_medication,
  };
}
