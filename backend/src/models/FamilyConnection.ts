import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface FamilyConnectionDoc extends Document {
  owner_id: string;
  relative_id: string;
  invite_id: string;
  status: 'active' | 'revoked';
  permissions: { view_schedule: boolean; manage_medication: boolean; relative_alerts: boolean };
  connected_at: Date;
  revoked_at: Date | null;
}

const familyConnectionSchema = new Schema<FamilyConnectionDoc>(
  {
    owner_id: objectId({ ref: 'User', required: true, index: true }),
    relative_id: objectId({ ref: 'User', required: true, index: true }),
    invite_id: objectId({ ref: 'FamilyInvite', required: true }),
    status: { type: String, enum: ['active', 'revoked'], default: 'active' },
    permissions: {
      type: new Schema(
        {
          view_schedule: { type: Boolean, default: true },
          manage_medication: { type: Boolean, default: false },
          // Nhận thông báo khi chủ hồ sơ bỏ lỡ thuốc (NOTIFICATION_PLAN §3.4) — mặc định bật
          relative_alerts: { type: Boolean, default: true },
        },
        { _id: false },
      ),
      required: true,
      default: () => ({ view_schedule: true, manage_medication: false, relative_alerts: true }),
    },
    connected_at: { type: Date, required: true },
    revoked_at: { type: Date, default: null },
  },
  { timestamps: true },
);

familyConnectionSchema.index(
  { owner_id: 1, relative_id: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } },
);

export const FamilyConnection = model<FamilyConnectionDoc>('FamilyConnection', familyConnectionSchema);
