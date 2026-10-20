import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface FamilyInviteDoc extends Document {
  owner_id: string;
  code_hash: string;
  expires_at: Date;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
}

const familyInviteSchema = new Schema<FamilyInviteDoc>(
  {
    owner_id: objectId({ ref: 'User', required: true, index: true }),
    code_hash: { type: String, required: true, unique: true },
    expires_at: { type: Date, required: true },
    status: { type: String, enum: ['pending', 'accepted', 'revoked', 'expired'], default: 'pending' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export const FamilyInvite = model<FamilyInviteDoc>('FamilyInvite', familyInviteSchema);
