import { connectDb, disconnectDb } from '../src/models';
import { User, UserDoc } from '../src/models/User';
import { Medication, MedicationDoc } from '../src/models/Medication';
import { MedicationSchedule, ScheduleDoc } from '../src/models/MedicationSchedule';
import { DoseOccurrence, DoseStatus, DoseOccurrenceDoc } from '../src/models/DoseOccurrence';
import { Device, DeviceDoc } from '../src/models/Device';
import mongoose from 'mongoose';

export async function initDb() {
  await connectDb(process.env.MONGODB_URI);
}

export async function closeDb() {
  await disconnectDb();
}

export async function resetDb() {
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }
}

export async function createTestUser(firebaseUid = 'test-uid-1', phone = '0900000001'): Promise<UserDoc> {
  return User.create({ firebase_uid: firebaseUid, phone, display_name: 'Test', timezone: 'Asia/Ho_Chi_Minh' });
}

export async function createTestMedication(userId: string): Promise<MedicationDoc> {
  return Medication.create({
    user_id: userId,
    name: 'Thuốc test',
    dosage_text: '1 viên',
    start_date: '2026-10-01',
    status: 'active',
    created_by: userId,
  });
}

export async function createTestSchedule(userId: string, medicationId: string, time = '08:00:00'): Promise<ScheduleDoc> {
  return MedicationSchedule.create({
    medication_id: medicationId,
    user_id: userId,
    time_of_day: time,
    recurrence_rule: 'daily',
    effective_from: '2026-10-01',
    status: 'active',
    current_version: 1,
  });
}

export async function createTestDose(
  userId: string,
  scheduleId: string,
  medicationId: string,
  scheduledAt: Date,
  status: DoseStatus = 'pending',
): Promise<DoseOccurrenceDoc> {
  return DoseOccurrence.create({
    schedule_id: scheduleId,
    medication_id: medicationId,
    user_id: userId,
    scheduled_at: scheduledAt,
    status,
    schedule_version: 1,
  });
}

export async function createTestDevice(
  userId: string,
  fcmToken = 'token-test-1',
  status: 'active' | 'invalid' = 'active',
): Promise<DeviceDoc> {
  return Device.create({
    user_id: userId,
    fcm_token: fcmToken,
    platform: 'web',
    notifications_enabled: true,
    last_seen_at: new Date(),
    status,
  });
}
