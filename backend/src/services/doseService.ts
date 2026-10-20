import { Types } from 'mongoose';
import { DoseOccurrence, DoseStatus, DoseOccurrenceDoc } from '../models/DoseOccurrence';
import { MedicationSchedule, ScheduleDoc } from '../models/MedicationSchedule';
import { Medication, MedicationDoc } from '../models/Medication';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { badRequest, conflict, forbidden, notFound } from '../utils/errors';
import { addMinutes, isSameLocalDay, isSameLocalDayAs, localDateTimeToUtc } from '../utils/time';
import { env } from '../config/env';
import { SNOOZE_MAX_DEFAULT, SNOOZE_MINUTES_DEFAULT, readSnoozeSettings } from '../utils/preferences';

export const OVERDUE_AFTER_MINUTES = 30;
/** Giá trị mặc định (người dùng có thể chỉnh ở M08 — xem utils/preferences) */
export const SNOOZE_MINUTES = SNOOZE_MINUTES_DEFAULT;
export const SNOOZE_MAX = SNOOZE_MAX_DEFAULT;
export const MISSED_AFTER_MINUTES = 120;

const CONFIRMABLE: DoseStatus[] = ['pending', 'snoozed', 'overdue'];
const SNOOZABLE: DoseStatus[] = ['pending', 'snoozed', 'overdue'];

export async function assertDoseOwner(doseId: string, userId: string) {
  if (!Types.ObjectId.isValid(doseId) || !Types.ObjectId.isValid(userId)) throw notFound('Không tìm thấy lần uống');
  const dose = await DoseOccurrence.findById(doseId);
  if (!dose) throw notFound('Không tìm thấy lần uống');
  if (dose.user_id.toString() !== userId) throw forbidden();
  return dose;
}

export async function confirmDose(
  doseId: string,
  userId: string,
  clientRequestId: string,
  tz: string = env.TZ_DEFAULT,
) {
  if (!Types.ObjectId.isValid(doseId) || !Types.ObjectId.isValid(userId)) throw notFound('Không tìm thấy lần uống');

  const dose = await DoseOccurrence.findOneAndUpdate(
    { _id: doseId, user_id: userId, status: { $in: CONFIRMABLE } },
    {
      $set: {
        status: 'confirmed',
        confirmed_at: new Date(),
        client_request_id: clientRequestId,
        snoozed_until: null,
      },
    },
    { new: true },
  );

  if (dose) {
    // "Muộn" = xác nhận sau giờ dự kiến nhưng VẪN TRONG NGÀY ĐỊA PHƯƠNG của người dùng
    const isLate = new Date() > dose.scheduled_at && isSameLocalDay(dose.scheduled_at, tz);
    if (isLate) {
      dose.is_late_confirmation = true;
      await dose.save();
    }
    await AuditLog.create({
      user_id: userId,
      entity: 'dose',
      entity_id: dose._id,
      action: 'confirm',
      details: { is_late: isLate },
    });
    return dose;
  }

  const existing = await DoseOccurrence.findById(doseId);
  if (!existing) throw notFound('Không tìm thấy lần uống');
  if (existing.user_id.toString() !== userId) throw forbidden();
  if (existing.status === 'confirmed' && existing.client_request_id === clientRequestId) return existing;
  throw conflict('Lần uống này đã được xác nhận hoặc trạng thái không cho phép');
}

/**
 * Lý do từ chối nhắc lại (B8), hoặc `null` nếu hợp lệ:
 * - `DAY`: giờ nhắc lại vượt quá 23:59 giờ địa phương của ngày có lần uống
 * - `LIMIT`: vượt quá `scheduled_at + MISSED_AFTER_MINUTES`
 */
export function snoozeDenyReason(
  doseScheduledAt: Date,
  until: Date,
  tz: string,
): 'DAY' | 'LIMIT' | null {
  if (!isSameLocalDayAs(until, doseScheduledAt, tz)) return 'DAY';
  if (until.getTime() > addMinutes(doseScheduledAt, MISSED_AFTER_MINUTES).getTime()) return 'LIMIT';
  return null;
}

export async function snoozeDose(
  doseId: string,
  userId: string,
  tz: string = env.TZ_DEFAULT,
  now: Date = new Date(),
) {
  if (!Types.ObjectId.isValid(doseId) || !Types.ObjectId.isValid(userId)) throw notFound('Không tìm thấy lần uống');

  const existing = await DoseOccurrence.findOne({ _id: doseId, user_id: userId });
  if (!existing) throw notFound('Không tìm thấy lần uống');
  if (!SNOOZABLE.includes(existing.status)) {
    throw conflict('Trạng thái hiện tại không cho phép nhắc lại');
  }

  // Cài đặt nhắc lại do người dùng chỉnh ở M08 (mặc định 10 phút × 3 lần)
  const user = await User.findById(userId);
  const { minutes, max } = readSnoozeSettings(user?.preferences);

  if (existing.snooze_count >= max) {
    throw conflict(`Đã nhắc lại tối đa ${max} lần`);
  }
  const until = addMinutes(now, minutes);
  const deny = snoozeDenyReason(existing.scheduled_at, until, tz);
  if (deny === 'DAY') {
    throw conflict('Giờ nhắc lại vượt quá 23:59 giờ địa phương của ngày uống thuốc');
  }
  if (deny === 'LIMIT') {
    throw conflict('Giờ nhắc lại vượt quá thời gian cho phép của lần uống');
  }

  const dose = await DoseOccurrence.findOneAndUpdate(
    { _id: doseId, user_id: userId, status: { $in: SNOOZABLE }, snooze_count: { $lt: max } },
    { $set: { status: 'snoozed', snoozed_until: until }, $inc: { snooze_count: 1 } },
    { new: true },
  );
  if (!dose) throw conflict('Không thể nhắc lại lần uống này');
  return dose;
}

export async function cannotTakeDose(doseId: string, userId: string, reason: string) {
  if (!reason || reason.trim().length === 0 || reason.length > 500) {
    throw badRequest('Lý do không thể uống là bắt buộc (1–500 ký tự)');
  }
  if (!Types.ObjectId.isValid(doseId) || !Types.ObjectId.isValid(userId)) throw notFound('Không tìm thấy lần uống');

  const dose = await DoseOccurrence.findOneAndUpdate(
    { _id: doseId, user_id: userId, status: { $nin: ['confirmed', 'cannot_take'] } },
    { $set: { status: 'cannot_take', cannot_take_reason: reason, snoozed_until: null } },
    { new: true },
  );
  if (!dose) {
    const existing = await DoseOccurrence.findById(doseId);
    if (!existing) throw notFound('Không tìm thấy lần uống');
    throw conflict('Lần uống đã được ghi nhận');
  }
  await AuditLog.create({
    user_id: userId,
    entity: 'dose',
    entity_id: dose._id,
    action: 'cannot_take',
    details: null,
  });
  return dose;
}

export async function transitionOverdueAndMissed(): Promise<{ overdue: number; missed: number }> {
  const now = new Date();
  const overdueBefore = addMinutes(now, -OVERDUE_AFTER_MINUTES);
  const missedBefore = addMinutes(now, -MISSED_AFTER_MINUTES);

  const overdueResult = await DoseOccurrence.updateMany(
    { status: 'pending', scheduled_at: { $lte: overdueBefore, $gt: missedBefore } },
    { $set: { status: 'overdue' } },
  );

  const missedResult = await DoseOccurrence.updateMany(
    { status: { $in: ['pending', 'snoozed', 'overdue'] }, scheduled_at: { $lte: missedBefore } },
    { $set: { status: 'missed' } },
  );

  return { overdue: overdueResult.modifiedCount, missed: missedResult.modifiedCount };
}

export interface GenerateDosesResult {
  created: number;
  skipped: number;
}

export async function generateUpcomingDoses(
  days: number,
  tz: string,
  onlyScheduleId?: string,
): Promise<GenerateDosesResult> {
  const now = new Date();
  const end = addMinutes(now, days * 24 * 60);

  const filter: Record<string, unknown> = { status: 'active' };
  if (onlyScheduleId) filter._id = onlyScheduleId;
  const schedules = await MedicationSchedule.find(filter).populate('medication_id');

  let created = 0;
  let skipped = 0;

  for (const schedule of schedules) {
    const medication = schedule.medication_id as unknown as MedicationDoc;
    if (!medication || medication.status !== 'active') continue;

    const [h, m] = schedule.time_of_day.split(':').map(Number);
    const daysBetween = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));

    for (let d = 0; d <= daysBetween; d++) {
      const day = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
      const ymd = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(day);
      if (ymd < schedule.effective_from) continue;
      if (schedule.effective_to && ymd > schedule.effective_to) continue;

      const scheduledAt = localDateTimeToUtc(ymd, `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`, tz);
      if (scheduledAt < now) continue;

      try {
        await DoseOccurrence.create({
          schedule_id: schedule._id,
          medication_id: medication._id,
          user_id: schedule.user_id,
          scheduled_at: scheduledAt,
          schedule_version: schedule.current_version,
        });
        created++;
      } catch {
        skipped++;
      }
    }
  }

  return { created, skipped };
}

const CANCELABLE: DoseStatus[] = ['pending', 'snoozed', 'overdue'];

/**
 * B15 — ngừng thuốc: xóa các lần uống TƯƠNG LAI chưa có kết quả cuối của một thuốc.
 * Lần uống trong quá khứ (và lần đã xác nhận) giữ nguyên làm lịch sử.
 */
export async function deleteFutureDosesForMedication(
  medicationId: string,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const res = await DoseOccurrence.deleteMany({
    medication_id: medicationId,
    user_id: userId,
    status: { $in: CANCELABLE },
    scheduled_at: { $gt: now },
  });
  return res.deletedCount;
}

/**
 * Xóa các lần uống TƯƠNG LAI chưa có kết quả cuối của MỘT lịch (dùng khi xóa/ngừng một lịch).
 * Lần uống trong quá khứ và lần đã xác nhận giữ nguyên làm lịch sử.
 */
export async function deleteFutureDosesForSchedule(
  scheduleId: string,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const res = await DoseOccurrence.deleteMany({
    schedule_id: scheduleId,
    user_id: userId,
    status: { $in: CANCELABLE },
    scheduled_at: { $gt: now },
  });
  return res.deletedCount;
}

/**
 * B14 — đổi giờ lịch đang hoạt động: xóa lần uống TƯƠNG LAI theo lịch cũ rồi sinh lại
 * theo cấu hình/phiên bản mới. Lần uống trong quá khứ giữ nguyên phiên bản cũ.
 */
export async function regenerateScheduleDoses(
  scheduleId: string,
  userId: string,
  tz: string,
  now: Date = new Date(),
): Promise<number> {
  await DoseOccurrence.deleteMany({
    schedule_id: scheduleId,
    user_id: userId,
    status: { $in: CANCELABLE },
    scheduled_at: { $gt: now },
  });
  const result = await generateUpcomingDoses(env.DOSE_GENERATION_DAYS, tz, scheduleId);
  return result.created;
}
