import type { FilterQuery } from 'mongoose';
import { User, UserDoc } from '../models/User';
import { Medication } from '../models/Medication';
import { DoseOccurrence } from '../models/DoseOccurrence';
import { FamilyConnection } from '../models/FamilyConnection';
import { Device } from '../models/Device';
import { NotificationLog } from '../models/NotificationLog';
import { AuditLog } from '../models/AuditLog';
import {
  getFirebaseUserEmails,
  isFirebaseReady,
  revokeFirebaseRefreshTokens,
  setFirebaseUserDisabled,
  setFirebaseUserPassword,
} from '../config/firebase';
import { badRequest, notFound, serviceUnavailable } from '../utils/errors';

/**
 * Dịch vụ quản trị (chỉ đọc + khóa/mở + đặt lại mật khẩu).
 *
 * Nguyên tắc riêng tư: danh sách người dùng KHÔNG trả nội dung y tế
 * (tên thuốc, ghi chú, lý do không uống) — chỉ trả số đếm phục vụ vận hành.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_PAGE_SIZE = 50;

type UserWithTimestamps = UserDoc & { createdAt: Date; updatedAt: Date };

function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface AdminSummary {
  users: number;
  disabledUsers: number;
  activeMedications: number;
  doses24h: number;
  confirmed24h: number;
  activeConnections: number;
  activeDevices: number;
  failedNotifications24h: number;
}

/** Số liệu tổng quan 24 giờ qua — không chứa dữ liệu y tế chi tiết */
export async function getSummary(): Promise<AdminSummary> {
  const now = new Date();
  const since = new Date(now.getTime() - DAY_MS);
  const [users, disabledUsers, activeMedications, doses24h, confirmed24h, activeConnections, activeDevices, failedNotifications24h] =
    await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ disabled_at: { $ne: null } }),
      Medication.countDocuments({ status: 'active' }),
      DoseOccurrence.countDocuments({ scheduled_at: { $gte: since, $lte: now } }),
      DoseOccurrence.countDocuments({ scheduled_at: { $gte: since, $lte: now }, status: 'confirmed' }),
      FamilyConnection.countDocuments({ status: 'active' }),
      Device.countDocuments({ status: 'active' }),
      NotificationLog.countDocuments({ status: 'failed', sent_at: { $gte: since, $lte: now } }),
    ]);

  return {
    users,
    disabledUsers,
    activeMedications,
    doses24h,
    confirmed24h,
    activeConnections,
    activeDevices,
    failedNotifications24h,
  };
}

export interface AdminUserItem {
  id: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  role: 'user' | 'admin';
  disabled: boolean;
  timezone: string;
  createdAt: string;
  medicationsActive: number;
  doses7d: number;
  confirmed7d: number;
  devicesActive: number;
}

export interface AdminUserPage {
  items: AdminUserItem[];
  page: number;
  pageSize: number;
  total: number;
}

interface CountRow {
  _id: unknown;
  count?: number;
  total?: number;
  confirmed?: number;
}

/** Danh sách người dùng + số đếm vận hành (không có tên thuốc/lý do y tế) */
export async function listUsers(input: {
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<AdminUserPage> {
  const page = Math.max(1, Math.floor(input.page ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(input.pageSize ?? 20)));
  const q = (input.q ?? '').trim();

  const filter: FilterQuery<UserDoc> = {};
  if (q) {
    const pattern = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ display_name: pattern }, { phone: pattern }];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize),
  ]);

  const rows = users as unknown as UserWithTimestamps[];
  const ids = rows.map((u) => u._id);
  const since7d = new Date(Date.now() - 7 * DAY_MS);

  const [medRows, doseRows, deviceRows] = await Promise.all([
    Medication.aggregate<CountRow>([
      { $match: { user_id: { $in: ids }, status: 'active' } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
    ]),
    DoseOccurrence.aggregate<CountRow>([
      { $match: { user_id: { $in: ids }, scheduled_at: { $gte: since7d } } },
      {
        $group: {
          _id: '$user_id',
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] } },
        },
      },
    ]),
    Device.aggregate<CountRow>([
      { $match: { user_id: { $in: ids }, status: 'active' } },
      { $group: { _id: '$user_id', count: { $sum: 1 } } },
    ]),
  ]);

  const medsByUser = new Map(medRows.map((r) => [String(r._id), r.count ?? 0]));
  const dosesByUser = new Map(doseRows.map((r) => [String(r._id), r]));
  const devicesByUser = new Map(deviceRows.map((r) => [String(r._id), r.count ?? 0]));

  // Email không lưu trong MongoDB (Firebase giữ) — lấy 1 lần cho cả trang.
  let emails: Record<string, string | null> = {};
  if (isFirebaseReady()) {
    try {
      emails = await getFirebaseUserEmails(rows.map((u) => u.firebase_uid));
    } catch {
      emails = {}; // Firebase lỗi không được làm hỏng trang chỉ đọc
    }
  }

  return {
    items: rows.map((u) => {
      const dose = dosesByUser.get(String(u._id));
      return {
        id: String(u._id),
        displayName: u.display_name,
        phone: u.phone,
        email: emails[u.firebase_uid] ?? null,
        role: u.role ?? 'user',
        disabled: Boolean(u.disabled_at),
        timezone: u.timezone,
        createdAt: u.createdAt.toISOString(),
        medicationsActive: medsByUser.get(String(u._id)) ?? 0,
        doses7d: dose?.total ?? 0,
        confirmed7d: dose?.confirmed ?? 0,
        devicesActive: devicesByUser.get(String(u._id)) ?? 0,
      };
    }),
    page,
    pageSize,
    total,
  };
}

export interface AdminFailedNotification {
  id: string;
  kind: string;
  channel: string;
  sentAt: string;
  error: string | null;
  doseId: string;
}

/** Các lần gửi Web Push thất bại gần đây — dùng để phát hiện token chết/cấu hình sai */
export async function listFailedNotifications(limit = 20): Promise<AdminFailedNotification[]> {
  const docs = await NotificationLog.find({ status: 'failed' })
    .sort({ sent_at: -1 })
    .limit(Math.min(100, Math.max(1, Math.floor(limit))))
    .lean();

  return docs.map((d) => ({
    id: String(d._id),
    kind: d.kind,
    channel: d.channel,
    sentAt: d.sent_at.toISOString(),
    error: d.error,
    doseId: String(d.dose_id),
  }));
}

export interface AdminAuditItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorName: string | null;
  actorPhone: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
}

/** Nhật ký thao tác gần đây (kèm thao tác của quản trị) */
export async function listAuditLogs(limit = 20): Promise<AdminAuditItem[]> {
  interface AuditLean {
    _id: unknown;
    action: string;
    entity: string;
    entity_id: unknown;
    details: Record<string, unknown> | null;
    createdAt: Date;
    user_id: { display_name?: string | null; phone?: string | null } | null;
  }

  const docs = (await AuditLog.find({})
    .sort({ createdAt: -1 })
    .limit(Math.min(100, Math.max(1, Math.floor(limit))))
    .populate('user_id', 'display_name phone')
    .lean()) as unknown as AuditLean[];

  return docs.map((d) => ({
    id: String(d._id),
    action: d.action,
    entity: d.entity,
    entityId: String(d.entity_id),
    actorName: d.user_id?.display_name ?? null,
    actorPhone: d.user_id?.phone ?? null,
    createdAt: d.createdAt.toISOString(),
    details: d.details ?? null,
  }));
}

function firebaseFailure(action: string): never {
  throw serviceUnavailable(`Không kết nối được Firebase để ${action}. Kiểm tra FIREBASE_* trong backend/.env`);
}

/** Khóa/mở tài khoản: cập nhật Firebase trước, rồi lưu trạng thái + nhật ký */
export async function setUserDisabled(
  adminId: string,
  targetId: string,
  disabled: boolean,
): Promise<{ id: string; disabled: boolean }> {
  if (adminId === targetId) throw badRequest('Không thể khóa tài khoản đang đăng nhập');

  const user = await User.findById(targetId);
  if (!user) throw notFound('Không tìm thấy người dùng');
  if (!user.firebase_uid) throw badRequest('Người dùng chưa có tài khoản Firebase');

  try {
    await setFirebaseUserDisabled(user.firebase_uid, disabled);
    if (disabled) await revokeFirebaseRefreshTokens(user.firebase_uid);
  } catch {
    firebaseFailure(disabled ? 'khóa tài khoản' : 'mở khóa tài khoản');
  }

  user.disabled_at = disabled ? new Date() : null;
  await user.save();

  await AuditLog.create({
    user_id: targetId,
    entity: 'user',
    entity_id: targetId,
    action: disabled ? 'admin_lock' : 'admin_unlock',
    details: { admin_id: adminId },
  });

  return { id: String(user._id), disabled: Boolean(user.disabled_at) };
}

/** Đặt lại mật khẩu (không trả/ghi lại mật khẩu ở bất kỳ đâu) */
export async function resetUserPassword(
  adminId: string,
  targetId: string,
  password: string,
): Promise<{ id: string; reset: true }> {
  const user = await User.findById(targetId);
  if (!user) throw notFound('Không tìm thấy người dùng');
  if (!user.firebase_uid) throw badRequest('Người dùng chưa có tài khoản Firebase');

  try {
    await setFirebaseUserPassword(user.firebase_uid, password);
    await revokeFirebaseRefreshTokens(user.firebase_uid);
  } catch {
    firebaseFailure('đặt lại mật khẩu');
  }

  await AuditLog.create({
    user_id: targetId,
    entity: 'user',
    entity_id: targetId,
    action: 'admin_reset_password',
    details: { admin_id: adminId },
  });

  return { id: String(user._id), reset: true };
}
