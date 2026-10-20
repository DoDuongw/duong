import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface AuditLogDoc extends Document {
  user_id: string;
  entity: string;
  entity_id: string;
  action: string;
  details: Record<string, unknown> | null;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    user_id: objectId({ ref: 'User', required: true, index: true }),
    entity: { type: String, required: true },
    entity_id: objectId({ required: true }),
    action: { type: String, required: true },
    details: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const AuditLog = model<AuditLogDoc>('AuditLog', auditLogSchema);
