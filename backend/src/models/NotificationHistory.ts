import { Schema, model, Document } from 'mongoose';
import { objectId } from './schemaHelpers';

/**
 * Lịch sử thông báo push theo người nhận.
 * Khác với `NotificationLog` (dùng để chống trùng/gửi lại theo dose + kind),
 * mỗi bản ghi ở đây là một thông báo người dùng đã thực sự nhận được,
 * kèm tiêu đề/nội dung để hiển thị trong tab "Thông báo".
 */
export interface NotificationHistoryDoc extends Document {
  user_id: string;
  dose_id: string | null;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  sent_at: Date;
}

const notificationHistorySchema = new Schema<NotificationHistoryDoc>(
  {
    user_id: objectId({ ref: 'User', required: true, index: true }),
    dose_id: objectId({ ref: 'DoseOccurrence', default: null }),
    kind: { type: String, required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    data: { type: Schema.Types.Mixed, default: null },
    sent_at: { type: Date, required: true, index: true },
  },
  { timestamps: false },
);

notificationHistorySchema.index({ user_id: 1, sent_at: -1 });

export const NotificationHistory = model<NotificationHistoryDoc>(
  'NotificationHistory',
  notificationHistorySchema,
);
