import { Schema, model, Document } from 'mongoose';

/** Vai trò tài khoản: người dùng · quản lý vận hành · quản trị hệ thống */
export type UserRole = 'user' | 'manager' | 'admin';

export interface UserHealthInfo {
  weight_kg: number | null;
  height_cm: number | null;
  blood_pressure: string | null;
  heart_rate: number | null;
  blood_sugar: number | null;
  notes: string | null;
  updated_at: Date | null;
}

export interface UserDoc extends Document {
  firebase_uid: string;
  phone: string | null;
  display_name: string | null;
  address: string | null;
  timezone: string;
  preferences: Record<string, unknown> | null;
  /** Thông tin sức khỏe tự khai (không bắt buộc) */
  health_info: UserHealthInfo | null;
  /**
   * 'user' = người dùng thường;
   * 'manager' = quản lý vận hành (xem dashboard, khóa/mở tài khoản người dùng);
   * 'admin' = quản trị hệ thống (toàn quyền khu vực /admin).
   */
  role: UserRole;
  /** null = đang hoạt động; có ngày = bị quản trị khóa (không đăng nhập/gọi API được) */
  disabled_at: Date | null;
  /** Ngày sinh (bắt buộc) */
  date_of_birth: Date;
  /** null = chưa xác minh email; có ngày = đã xác minh email */
  email_verified_at: Date | null;
}

const healthInfoSchema = new Schema<UserHealthInfo>(
  {
    weight_kg: { type: Number, default: null },
    height_cm: { type: Number, default: null },
    blood_pressure: { type: String, default: null },
    heart_rate: { type: Number, default: null },
    blood_sugar: { type: Number, default: null },
    notes: { type: String, default: null },
    updated_at: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new Schema<UserDoc>(
  {
    firebase_uid: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    display_name: { type: String, default: null },
    address: { type: String, default: null },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    preferences: { type: Schema.Types.Mixed, default: null },
    health_info: { type: healthInfoSchema, default: null },
    role: { type: String, enum: ['user', 'manager', 'admin'], default: 'user' },
    disabled_at: { type: Date, default: null },
    date_of_birth: { type: Date, required: true },
    email_verified_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = model<UserDoc>('User', userSchema);
