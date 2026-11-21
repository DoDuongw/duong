import { Types } from 'mongoose';
import { AuditLog } from '../models/AuditLog';

interface AuditEntry {
  user_id: string | Types.ObjectId;
  entity: string;
  entity_id: string | Types.ObjectId;
  action: string;
  details?: Record<string, unknown> | null;
}

/** Ghi một bản ghi kiểm toán với cùng cấu trúc ở mọi route/service. */
export function writeAudit(entry: AuditEntry) {
  return AuditLog.create({ ...entry, details: entry.details ?? null });
}
