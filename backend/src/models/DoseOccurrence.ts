import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export type DoseStatus = 'pending' | 'confirmed' | 'overdue' | 'snoozed' | 'missed' | 'cannot_take';

export interface DoseOccurrenceDoc extends Document {
  schedule_id: string;
  medication_id: string;
  user_id: string;
  scheduled_at: Date;
  reminded_at: Date | null;
  status: DoseStatus;
  confirmed_at: Date | null;
  is_late_confirmation: boolean;
  cannot_take_reason: string | null;
  snoozed_until: Date | null;
  snooze_count: number;
  schedule_version: number;
  client_request_id: string | null;
}

const doseSchema = new Schema<DoseOccurrenceDoc>(
  {
    schedule_id: objectId({ ref: 'MedicationSchedule', required: true }),
    medication_id: objectId({ ref: 'Medication', required: true }),
    user_id: objectId({ ref: 'User', required: true }),
    scheduled_at: { type: Date, required: true },
    reminded_at: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'overdue', 'snoozed', 'missed', 'cannot_take'],
      default: 'pending',
    },
    confirmed_at: { type: Date, default: null },
    is_late_confirmation: { type: Boolean, default: false },
    cannot_take_reason: { type: String, default: null },
    snoozed_until: { type: Date, default: null },
    snooze_count: { type: Number, default: 0 },
    schedule_version: { type: Number, required: true, default: 1 },
    client_request_id: { type: String, default: null },
  },
  { timestamps: true },
);

doseSchema.index({ schedule_id: 1, scheduled_at: 1 }, { unique: true });
doseSchema.index({ user_id: 1, scheduled_at: 1 });
doseSchema.index({ user_id: 1, status: 1 });

export const DoseOccurrence = model<DoseOccurrenceDoc>('DoseOccurrence', doseSchema);
