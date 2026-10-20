export { connectDb, disconnectDb } from '../config/db';
export { User } from './User';
export { Device } from './Device';
export { Medication } from './Medication';
export { MedicationSchedule } from './MedicationSchedule';
export { ScheduleVersion } from './ScheduleVersion';
export { DoseOccurrence, DoseStatus } from './DoseOccurrence';
export { FamilyInvite } from './FamilyInvite';
export { FamilyConnection } from './FamilyConnection';
export { NotificationLog } from './NotificationLog';
export { AuditLog } from './AuditLog';

import { connectDb } from '../config/db';

export async function initDb(): Promise<void> {
  await connectDb();
}
