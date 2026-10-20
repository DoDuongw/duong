import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

export interface NotificationLogDoc extends Document {
  dose_id: string;
  device_id: string | null;
  channel: 'fcm' | 'in_app';
  kind: 'scheduled_reminder' | 'overdue' | 'snooze' | 'relative_alert' | 'sync';
  sent_at: Date;
  status: 'sent' | 'failed' | 'expired';
  error: string | null;
}

const notificationLogSchema = new Schema<NotificationLogDoc>(
  {
    dose_id: objectId({ ref: 'DoseOccurrence', required: true, index: true }),
    device_id: objectId({ ref: 'Device', default: null }),
    channel: { type: String, enum: ['fcm', 'in_app'], required: true },
    kind: {
      type: String,
      enum: ['scheduled_reminder', 'overdue', 'snooze', 'relative_alert', 'sync'],
      required: true,
    },
    sent_at: { type: Date, required: true },
    status: { type: String, enum: ['sent', 'failed', 'expired'], required: true },
    error: { type: String, default: null },
  },
  { timestamps: false },
);

export const NotificationLog = model<NotificationLogDoc>('NotificationLog', notificationLogSchema);
