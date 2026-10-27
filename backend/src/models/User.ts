import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface UserDoc extends Document {
  firebase_uid: string;
  phone: string | null;
  display_name: string | null;
  address: string | null;
  timezone: string;
  preferences: Record<string, unknown> | null;
  /** 'admin' = quản trị hệ thống (khu vực /admin); mặc định người dùng thường */
  role: 'user' | 'admin';
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
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    disabled_at: { type: Date, default: null },
  },
  { timestamps: true },
);

export const User = model<UserDoc>('User', userSchema);
