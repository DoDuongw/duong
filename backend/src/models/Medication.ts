import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface MedicationDoc extends Document {
  user_id: string;
  name: string;
  image_url: string | null;
  dosage_text: string | null;
  instructions: string | null;
  start_date: string;
  end_date: string | null;
  status: 'active' | 'discontinued';
  created_by: string;
  updated_by: string | null;
}

const medicationSchema = new Schema<MedicationDoc>(
  {
    user_id: objectId({ ref: 'User', required: true, index: true }),
    name: { type: String, required: true, maxlength: 200 },
    image_url: { type: String, default: null },
    dosage_text: { type: String, default: null },
    instructions: { type: String, default: null },
    start_date: { type: String, required: true },
    end_date: { type: String, default: null },
    status: { type: String, enum: ['active', 'discontinued'], default: 'active' },
    created_by: objectId({ ref: 'User', required: true }),
    updated_by: objectId({ ref: 'User', default: null }),
  },
  { timestamps: true },
);

export const Medication = model<MedicationDoc>('Medication', medicationSchema);
