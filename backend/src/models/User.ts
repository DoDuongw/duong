import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

/** Vai trò tài khoản: người dùng · quản lý vận hành · quản trị hệ thống */
export type UserRole = 'user' | 'manager' | 'admin';

export interface UserDoc extends Document {
  firebase_uid: string;
  phone: string | null;
  display_name: string | null;
  address: string | null;
  timezone: string;
  preferences: Record<string, unknown> | null;
  /**
   * 'user' = người dùng thường;
   * 'manager' = quản lý vận hành (xem dashboard, khóa/mở tài khoản người dùng);
   * 'admin' = quản trị hệ thống (toàn quyền khu vực /admin).
   */
  role: UserRole;
  /** null = đang hoạt động; có ngày = bị quản trị khóa (không đăng nhập/gọi API được) */
  disabled_at: Date | null;
}

const userSchema = new Schema<UserDoc>(
  {
    firebase_uid: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    display_name: { type: String, default: null },
    address: { type: String, default: null },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    preferences: { type: Schema.Types.Mixed, default: null },
    role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
    disabled_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = model<UserDoc>('User', userSchema);
