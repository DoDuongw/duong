import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface UserDoc extends Document {
  firebase_uid: string;
  phone: string | null;
  display_name: string | null;
  address: string | null;
  timezone: string;
  preferences: Record<string, unknown> | null;
}

const userSchema = new Schema<UserDoc>(
  {
    firebase_uid: { type: String, required: true, unique: true },
    phone: { type: String, default: null },
    display_name: { type: String, default: null },
    address: { type: String, default: null },
    timezone: { type: String, default: 'Asia/Ho_Chi_Minh' },
    preferences: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true },
);

export const User = model<UserDoc>('User', userSchema);
