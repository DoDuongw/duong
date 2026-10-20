import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface DeviceDoc extends Document {
  user_id: string;
  fcm_token: string;
  platform: 'web';
  user_agent: string | null;
  notifications_enabled: boolean;
  last_seen_at: Date | null;
  status: 'active' | 'invalid';
}

const deviceSchema = new Schema<DeviceDoc>(
  {
    user_id: objectId({ ref: 'User', required: true, index: true }),
    fcm_token: { type: String, required: true, unique: true },
    platform: { type: String, enum: ['web'], required: true },
    user_agent: { type: String, default: null },
    notifications_enabled: { type: Boolean, default: true },
    last_seen_at: { type: Date, default: null },
    status: { type: String, enum: ['active', 'invalid'], default: 'active' },
  },
  { timestamps: true },
);

export const Device = model<DeviceDoc>('Device', deviceSchema);
