import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

/** Câu trả lời nhanh cho push hỏi thăm sức khỏe. */
export type HealthAnswer = 'good' | 'tired' | 'dizzy' | 'unwell' | 'other';

/**
 * Nhật ký sức khỏe: mỗi push hỏi thăm sau khi uống thuốc được lưu thành một mục
 * để người dùng xem lại và trả lời cảm giác của mình.
 */
export interface HealthLogDoc extends Document {
  user_id: string;
  dose_id: string | null;
  medication_id: string | null;
  medication_name: string | null;
  kind: 'wellness_check' | 'note';
  scheduled_at: Date | null;
  confirmed_at: Date | null;
  asked_at: Date;
  question: string;
  answer: HealthAnswer | null;
  answer_note: string | null;
  answered_at: Date | null;
}

const healthLogSchema = new Schema<HealthLogDoc>(
  {
    user_id: objectId({ ref: 'User', required: true, index: true }),
    dose_id: objectId({ ref: 'DoseOccurrence', default: null }),
    medication_id: objectId({ ref: 'Medication', default: null }),
    medication_name: { type: String, default: null },
    kind: { type: String, enum: ['wellness_check', 'note'], required: true },
    scheduled_at: { type: Date, default: null },
    confirmed_at: { type: Date, default: null },
    asked_at: { type: Date, required: true, index: true },
    question: { type: String, required: true },
    answer: { type: String, enum: ['good', 'tired', 'dizzy', 'unwell', 'other', null], default: null },
    answer_note: { type: String, default: null },
    answered_at: { type: Date, default: null },
  },
  { timestamps: false },
);

healthLogSchema.index({ user_id: 1, asked_at: -1 });
/** Mỗi lần uống chỉ có một mục hỏi thăm (idempotent khi cron chạy lại). */
healthLogSchema.index(
  { dose_id: 1 },
  { unique: true, partialFilterExpression: { dose_id: { $type: 'objectId' } } },
);

export const HealthLog = model<HealthLogDoc>('HealthLog', healthLogSchema);
