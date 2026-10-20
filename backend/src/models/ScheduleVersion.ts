import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface ScheduleVersionDoc extends Document {
  schedule_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  changed_by: string;
}

const scheduleVersionSchema = new Schema<ScheduleVersionDoc>(
  {
    schedule_id: objectId({ ref: 'MedicationSchedule', required: true }),
    version: { type: Number, required: true },
    snapshot: { type: Schema.Types.Mixed, required: true },
    changed_by: objectId({ ref: 'User', required: true }),
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

scheduleVersionSchema.index({ schedule_id: 1, version: 1 }, { unique: true });

export const ScheduleVersion = model<ScheduleVersionDoc>('ScheduleVersion', scheduleVersionSchema);
