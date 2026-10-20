import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface ScheduleDoc extends Document {
  medication_id: string;
  user_id: string;
  time_of_day: string;
  recurrence_rule: string;
  effective_from: string;
  effective_to: string | null;
  status: 'active' | 'archived';
  current_version: number;
}

const scheduleSchema = new Schema<ScheduleDoc>(
  {
    medication_id: objectId({ ref: 'Medication', required: true, index: true }),
    user_id: objectId({ ref: 'User', required: true, index: true }),
    time_of_day: { type: String, required: true },
    recurrence_rule: { type: String, required: true, default: 'daily' },
    effective_from: { type: String, required: true },
    effective_to: { type: String, default: null },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
    current_version: { type: Number, default: 1 },
  },
  { timestamps: true },
);

scheduleSchema.index({ user_id: 1, status: 1, effective_from: 1 });

export const MedicationSchedule = model<ScheduleDoc>('MedicationSchedule', scheduleSchema);
