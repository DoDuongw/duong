import { initDb, closeDb, resetDb, createTestUser, createTestMedication, createTestSchedule, createTestDose } from './helpers';
import { DoseOccurrence, User } from '../src/models';
import {
  confirmDose,
  snoozeDose,
  snoozeDenyReason,
  cannotTakeDose,
  transitionOverdueAndMissed,
  generateUpcomingDoses,
  SNOOZE_MAX,
  OVERDUE_AFTER_MINUTES,
  MISSED_AFTER_MINUTES,
} from '../src/services/doseService';
import { localDateTimeToUtc, todayLocal } from '../src/utils/time';

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
});

describe('doseService - xác nhận lần uống', () => {
  test('B4: confirm pending → confirmed', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() - 5 * 60_000));

    const result = await confirmDose(dose.id, user.id, 'req-12345678');
    expect(result.status).toBe('confirmed');
    expect(result.confirmed_at).not.toBeNull();
  });

  test('B5: confirm hai lần liên tiếp → lần hai conflict', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() - 5 * 60_000));

    await confirmDose(dose.id, user.id, 'req-12345678');
    await expect(confirmDose(dose.id, user.id, 'req-different-99')).rejects.toThrow('đã được xác nhận');
  });

  test('B5-idempotent: cùng clientRequestId → trả về kết quả cũ, không lỗi', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() - 5 * 60_000));

    const r1 = await confirmDose(dose.id, user.id, 'req-12345678');
    const r2 = await confirmDose(dose.id, user.id, 'req-12345678');
    expect(r2.id).toBe(r1.id);
    expect(r2.status).toBe('confirmed');
  });

  test('confirm user khác → forbidden', async () => {
    const user = await createTestUser();
    const other = await createTestUser('other-uid', '0900000002');
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date());

    await expect(confirmDose(dose.id, other.id, 'req-12345678')).rejects.toThrow('Không có quyền');
  });

  test('xác nhận muộn trong cùng ngày → is_late_confirmation=true', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    // Phải là thời điểm ĐÃ qua VẪN CÒN TRONG HÔM NAY (giờ VN = UTC+7, không DST),
    // tránh phụ thuộc giờ chạy test (nếu chạy sau nửa đêm thì "2 giờ trước" đã là hôm qua).
    const VN_OFFSET_MS = 7 * 60 * 60_000;
    const now = Date.now();
    const localDayStart = Math.floor((now + VN_OFFSET_MS) / 86_400_000) * 86_400_000 - VN_OFFSET_MS;
    const scheduledAt = new Date(Math.max(localDayStart, now - 2 * 60 * 60_000));
    const dose = await createTestDose(user.id, sch.id, med.id, scheduledAt, 'overdue');

    const result = await confirmDose(dose.id, user.id, 'req-late-1234');
    expect(result.status).toBe('confirmed');
    expect(result.is_late_confirmation).toBe(true);
  });
});

describe('doseService - snooze', () => {
  const TZ = 'Asia/Ho_Chi_Minh';

  test('B7: snooze quá giới hạn → conflict', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    // Dùng mốc giờ cố định để test không phụ thuộc giờ chạy (đồng hồ test truyền vào)
    const today = todayLocal(TZ);
    const now = localDateTimeToUtc(today, '10:00', TZ);
    const dose = await createTestDose(user.id, sch.id, med.id, localDateTimeToUtc(today, '09:30', TZ));

    for (let i = 0; i < SNOOZE_MAX; i++) {
      const d = await snoozeDose(dose.id, user.id, TZ, now);
      expect(d.snooze_count).toBe(i + 1);
      expect(d.status).toBe('snoozed');
    }
    await expect(snoozeDose(dose.id, user.id, TZ, now)).rejects.toThrow('tối đa');
  });

  test('snooze lần đã confirmed → conflict', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() - 5 * 60_000));

    await confirmDose(dose.id, user.id, 'req-12345678');
    await expect(snoozeDose(dose.id, user.id)).rejects.toThrow('không cho phép nhắc lại');
  });

  test('cài đặt nhắc lại của người dùng được tuân theo (snoozeMinutes/snoozeMax)', async () => {
    const user = await createTestUser();
    await User.updateOne({ _id: user.id }, { $set: { preferences: { snoozeMinutes: 5, snoozeMax: 1 } } });
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const today = todayLocal(TZ);
    const now = localDateTimeToUtc(today, '10:00', TZ);
    const dose = await createTestDose(user.id, sch.id, med.id, localDateTimeToUtc(today, '09:30', TZ));

    const first = await snoozeDose(dose.id, user.id, TZ, now);
    expect(first.snooze_count).toBe(1);
    // Đúng 5 phút (không phải mặc định 10)
    expect(first.snoozed_until!.getTime()).toBe(now.getTime() + 5 * 60_000);

    // Giới hạn riêng = 1 → lần hai bị từ chối
    await expect(snoozeDose(dose.id, user.id, TZ, now)).rejects.toThrow('tối đa 1 lần');
  });
});

describe('doseService - B8: nhắc lại không được vượt hạn trong ngày', () => {
  const TZ = 'Asia/Ho_Chi_Minh';

  test('snoozeDenyReason: vượt 23:59 giờ địa phương → DAY', () => {
    const doseAt = localDateTimeToUtc('2026-10-20', '23:30', TZ);
    const until = localDateTimeToUtc('2026-10-21', '00:00', TZ);
    expect(snoozeDenyReason(doseAt, until, TZ)).toBe('DAY');
  });

  test('snoozeDenyReason: vượt scheduled_at + 2 giờ → LIMIT', () => {
    const doseAt = localDateTimeToUtc('2026-10-20', '10:00', TZ);
    expect(snoozeDenyReason(doseAt, localDateTimeToUtc('2026-10-20', '12:30', TZ), TZ)).toBe('LIMIT');
  });

  test('snoozeDenyReason: cùng ngày và trong 2 giờ → hợp lệ', () => {
    const doseAt = localDateTimeToUtc('2026-10-20', '23:00', TZ);
    expect(snoozeDenyReason(doseAt, localDateTimeToUtc('2026-10-20', '23:10', TZ), TZ)).toBeNull();
  });

  test('B8: nhắc lại vượt 23:59 giờ địa phương → 409', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id, '23:30:00');
    const today = todayLocal(TZ);
    const dose = await createTestDose(user.id, sch.id, med.id, localDateTimeToUtc(today, '23:30', TZ), 'pending');
    const now = localDateTimeToUtc(today, '23:50', TZ); // +10 phút → 00:00 ngày kế tiếp

    await expect(snoozeDose(dose.id, user.id, TZ, now)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('23:59'),
    });
  });

  test('B8: nhắc lại vượt quá 2 giờ của lần uống → 409', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id, '12:00:00');
    const today = todayLocal(TZ);
    const dose = await createTestDose(user.id, sch.id, med.id, localDateTimeToUtc(today, '12:00', TZ), 'pending');
    const now = localDateTimeToUtc(today, '15:00', TZ); // 15:10 > 12:00 + 2 giờ

    await expect(snoozeDose(dose.id, user.id, TZ, now)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining('thời gian cho phép'),
    });
  });
});

describe('doseService - cannot take', () => {
  test('B9: cannot-take không lý do → validation do schema (service nhận rỗng vẫn chặn)', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() + 60 * 60_000));

    await expect(cannotTakeDose(dose.id, user.id, '')).rejects.toThrow();
  });

  test('B10: cannot-take có lý do', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() - 5 * 60_000));

    const result = await cannotTakeDose(dose.id, user.id, 'Đang đi khám bệnh');
    expect(result.status).toBe('cannot_take');
    expect(result.cannot_take_reason).toBe('Đang đi khám bệnh');
  });
});

describe('doseService - máy trạng thái tự động', () => {
  test('B11: pending quá 30 phút → overdue', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const longAgo = new Date(Date.now() - (OVERDUE_AFTER_MINUTES + 5) * 60_000);
    const dose = await createTestDose(user.id, sch.id, med.id, longAgo, 'pending');

    await transitionOverdueAndMissed();
    const updated = await DoseOccurrence.findById(dose.id);
    expect(updated!.status).toBe('overdue');
  });

  test('B12: pending quá 2 giờ → missed', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const longAgo = new Date(Date.now() - (MISSED_AFTER_MINUTES + 5) * 60_000);
    const dose = await createTestDose(user.id, sch.id, med.id, longAgo, 'pending');

    await transitionOverdueAndMissed();
    const updated = await DoseOccurrence.findById(dose.id);
    expect(updated!.status).toBe('missed');
  });

  test('confirmed không bị chuyển trạng thái', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const longAgo = new Date(Date.now() - (MISSED_AFTER_MINUTES + 5) * 60_000);
    const dose = await createTestDose(user.id, sch.id, med.id, longAgo, 'confirmed');

    await transitionOverdueAndMissed();
    const updated = await DoseOccurrence.findById(dose.id);
    expect(updated!.status).toBe('confirmed');
  });
});

describe('doseService - tạo lần uống theo múi giờ người dùng', () => {
  test('B3: sinh lần uống từ lịch daily — đủ 7 ngày, chạy lại không tạo trùng', async () => {
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id, '08:00:00');

    await generateUpcomingDoses(7, tz);
    const dosesAfterFirst = await DoseOccurrence.find({ schedule_id: sch.id });
    const n1 = dosesAfterFirst.length;

    const again = await generateUpcomingDoses(7, tz);
    const n2 = await DoseOccurrence.countDocuments({ schedule_id: sch.id });

    expect(n1).toBeGreaterThanOrEqual(7);
    expect(n1).toBeLessThanOrEqual(8); // d=0..7, hôm nay có thể đã qua 08:00
    expect(again.created).toBe(0);
    expect(n2).toBe(n1); // unique (schedule_id, scheduled_at) chặn trùng

    const instants = new Set(dosesAfterFirst.map((d) => d.scheduled_at.toISOString()));
    expect(instants.size).toBe(n1);
  });

  test('B6: hai yêu cầu xác nhận song song cùng clientRequestId → chỉ một bản confirmed', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(Date.now() - 60_000), 'pending');

    const results = await Promise.allSettled([
      confirmDose(dose.id, user.id, 'song-song-0001'),
      confirmDose(dose.id, user.id, 'song-song-0001'),
    ]);

    const after = await DoseOccurrence.findById(dose.id);
    expect(after!.status).toBe('confirmed');
    expect(after!.client_request_id).toBe('song-song-0001');
    expect(results.some((r) => r.status === 'fulfilled')).toBe(true);
    // Không có bản ghi trùng nào được tạo thêm
    expect(await DoseOccurrence.countDocuments({ user_id: user.id })).toBe(1);
  });
  test('lịch 08:00 giờ VN → scheduled_at = 01:00Z (không lệch 7 giờ)', async () => {
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    await createTestSchedule(user.id, med.id, '08:00:00');

    await generateUpcomingDoses(3, tz);

    const doses = await DoseOccurrence.find({ user_id: user.id }).sort({ scheduled_at: 1 });
    expect(doses.length).toBeGreaterThan(0);
    for (const dose of doses) {
      // Giờ UTC đúng: VN = UTC+7 (không có DST)
      expect(dose.scheduled_at.getUTCHours()).toBe(1);
      expect(dose.scheduled_at.getUTCMinutes()).toBe(0);
      // Đọc lại theo giờ địa phương phải đúng 08:00
      const local = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(dose.scheduled_at);
      expect(local).toBe('08:00');
    }
  });

  test('lịch 20:00 giờ Tokyo → scheduled_at = 11:00Z cùng ngày', async () => {
    const tz = 'Asia/Tokyo';
    const user = await createTestUser('uid-tokyo');
    const med = await createTestMedication(user.id);
    await createTestSchedule(user.id, med.id, '20:00:00');

    await generateUpcomingDoses(2, tz);

    const doses = await DoseOccurrence.find({ user_id: user.id });
    expect(doses.length).toBeGreaterThan(0);
    for (const dose of doses) expect(dose.scheduled_at.getUTCHours()).toBe(11);
  });
});
