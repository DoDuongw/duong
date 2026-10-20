import {
  initDb,
  closeDb,
  resetDb,
  createTestUser,
  createTestMedication,
  createTestSchedule,
  createTestDose,
  createTestDevice,
} from './helpers';
import { DoseOccurrence, Device, NotificationLog, Medication, FamilyConnection, User } from '../src/models';
import { Types } from 'mongoose';
import { MISSED_AFTER_MINUTES } from '../src/services/doseService';
import {
  notifyDoseReminder,
  notifyDoseSnooze,
  notifyDoseOverdue,
  notifyRelativeAlert,
  processDueNotifications,
  DEFAULT_MAX_ATTEMPTS,
  type PushSender,
  type PushPayload,
  type PushResult,
  type NotifyDeps,
} from '../src/services/notificationService';

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
});

interface SenderSpy {
  sender: PushSender;
  calls: { tokens: string[]; payload: PushPayload }[];
}

function makeSender(impl?: (tokens: string[]) => PushResult[]): SenderSpy {
  const calls: SenderSpy['calls'] = [];
  const sender: PushSender = async (tokens, payload) => {
    calls.push({ tokens, payload });
    if (impl) return impl(tokens);
    return tokens.map((token) => ({ token, ok: true, invalid: false }));
  };
  return { sender, calls };
}

function makeDeps(spy: SenderSpy, now = new Date()): NotifyDeps {
  return { sender: spy.sender, now, sleep: async () => {}, maxAttempts: DEFAULT_MAX_ATTEMPTS };
}

async function setupDose(status: 'pending' | 'snoozed' | 'overdue' = 'pending', scheduledAt = new Date()) {
  const user = await createTestUser();
  const med = await createTestMedication(user.id);
  const sch = await createTestSchedule(user.id, med.id);
  const dose = await createTestDose(user.id, sch.id, med.id, scheduledAt, status);
  return { user, med, sch, dose };
}

describe('notificationService - nhắc giờ uống', () => {
  test('gửi tới mọi token active, ghi log sent + reminded_at', async () => {
    const { user, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-a');
    await createTestDevice(user.id, 'token-b');
    const spy = makeSender();

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('sent');
    expect(outcome.sent).toBe(2);
    expect(spy.calls).toHaveLength(1);
    expect(spy.calls[0].tokens.sort()).toEqual(['token-a', 'token-b']);
    expect(spy.calls[0].payload.data.doseId).toBe(dose.id);
    expect(spy.calls[0].payload.data.type).toBe('dose_reminder');

    const logs = await NotificationLog.find({ dose_id: dose.id, kind: 'scheduled_reminder' });
    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe('sent');

    const updated = await DoseOccurrence.findById(dose.id);
    expect(updated!.reminded_at).not.toBeNull();
  });

  test('N2: lần uống đã xác nhận → không gửi push', async () => {
    const { user, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-a');
    await DoseOccurrence.updateOne({ _id: dose.id }, { $set: { status: 'confirmed' } });
    const spy = makeSender();

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('status:confirmed');
    expect(spy.calls).toHaveLength(0);
    expect(await NotificationLog.countDocuments({ dose_id: dose.id })).toBe(0);
  });

  test('N3/ngừng thuốc: thuốc đã ngừng → không gửi push', async () => {
    const { user, med, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-a');
    await Medication.updateOne({ _id: med.id }, { $set: { status: 'discontinued' } });
    const spy = makeSender();

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('medication_inactive');
    expect(spy.calls).toHaveLength(0);
  });

  test('chống trùng: gọi lần hai không gửi lại', async () => {
    const { user, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-a');
    const spy = makeSender();

    await notifyDoseReminder(dose.id, makeDeps(spy));
    const second = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(second.status).toBe('skipped');
    expect(second.reason).toBe('already_sent');
    expect(spy.calls).toHaveLength(1);
    expect(await NotificationLog.countDocuments({ dose_id: dose.id, status: 'sent' })).toBe(1);
  });

  test('không có thiết bị active → log failed, không ném lỗi', async () => {
    const { dose } = await setupDose('pending', new Date());
    const spy = makeSender();

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('failed');
    expect(outcome.reason).toBe('no_active_device');
    const log = await NotificationLog.findOne({ dose_id: dose.id });
    expect(log!.status).toBe('failed');
    expect(log!.error).toBe('no_active_device');
  });

  test('N4: token hết hạn → device invalid, log expired, không thử lại', async () => {
    const { user, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-dead');
    const spy = makeSender((tokens) =>
      tokens.map((token) => ({
        token,
        ok: false,
        invalid: true,
        error: 'messaging/registration-token-not-registered',
      })),
    );

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('expired');
    expect(spy.calls).toHaveLength(1); // không retry token hỏng
    const device = await Device.findOne({ fcm_token: 'token-dead' });
    expect(device!.status).toBe('invalid');
    const log = await NotificationLog.findOne({ dose_id: dose.id });
    expect(log!.status).toBe('expired');
  });

  test('lỗi tạm thời → thử lại tối đa 3 lần rồi ghi failed', async () => {
    const { user, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-a');
    const spy = makeSender((tokens) => tokens.map((token) => ({ token, ok: false, invalid: false, error: 'unavailable' })));

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('failed');
    expect(spy.calls).toHaveLength(DEFAULT_MAX_ATTEMPTS);
    const log = await NotificationLog.findOne({ dose_id: dose.id });
    expect(log!.status).toBe('failed');
  });

  test('thử lại rồi thành công → log sent', async () => {
    const { user, dose } = await setupDose('pending', new Date());
    await createTestDevice(user.id, 'token-a');
    let attempt = 0;
    const spy = makeSender((tokens) => {
      attempt++;
      if (attempt < 2) return tokens.map((token) => ({ token, ok: false, invalid: false, error: 'unavailable' }));
      return tokens.map((token) => ({ token, ok: true, invalid: false }));
    });

    const outcome = await notifyDoseReminder(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('sent');
    expect(spy.calls).toHaveLength(2);
  });
});

describe('notificationService - nhắc lại (snooze)', () => {
  test('tới hạn snoozed_until → gửi push nhắc lại', async () => {
    const now = new Date('2026-10-20T03:00:00.000Z');
    const { user, dose } = await setupDose('snoozed', new Date('2026-10-20T02:00:00.000Z'));
    await createTestDevice(user.id, 'token-a');
    await DoseOccurrence.updateOne(
      { _id: dose.id },
      { $set: { snoozed_until: new Date('2026-10-20T02:55:00.000Z'), snooze_count: 1 } },
    );
    const spy = makeSender();

    const outcome = await notifyDoseSnooze(dose.id, makeDeps(spy, now));

    expect(outcome.status).toBe('sent');
    const log = await NotificationLog.findOne({ dose_id: dose.id, kind: 'snooze' });
    expect(log!.status).toBe('sent');
  });

  test('chưa tới snoozed_until → bỏ qua', async () => {
    const now = new Date('2026-10-20T03:00:00.000Z');
    const { user, dose } = await setupDose('snoozed', new Date('2026-10-20T02:00:00.000Z'));
    await createTestDevice(user.id, 'token-a');
    await DoseOccurrence.updateOne(
      { _id: dose.id },
      { $set: { snoozed_until: new Date('2026-10-20T03:10:00.000Z'), snooze_count: 1 } },
    );
    const spy = makeSender();

    const outcome = await notifyDoseSnooze(dose.id, makeDeps(spy, now));

    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('not_due');
    expect(spy.calls).toHaveLength(0);
  });

  test('snooze lần hai → gửi push mới (không bị chặn bởi chống trùng)', async () => {
    const now = new Date('2026-10-20T03:00:00.000Z');
    const { user, dose } = await setupDose('snoozed', new Date('2026-10-20T02:00:00.000Z'));
    await createTestDevice(user.id, 'token-a');
    const spy = makeSender();

    await DoseOccurrence.updateOne(
      { _id: dose.id },
      { $set: { snoozed_until: new Date('2026-10-20T02:55:00.000Z'), snooze_count: 1 } },
    );
    const first = await notifyDoseSnooze(dose.id, makeDeps(spy, now));

    await DoseOccurrence.updateOne(
      { _id: dose.id },
      { $set: { snoozed_until: new Date('2026-10-20T02:56:00.000Z'), snooze_count: 2 } },
    );
    const second = await notifyDoseSnooze(dose.id, makeDeps(spy, now));

    expect(first.status).toBe('sent');
    expect(second.status).toBe('sent');
    expect(spy.calls).toHaveLength(2);
  });
});

describe('notificationService - quá giờ', () => {
  test('overdue → gửi một lần', async () => {
    const { user, dose } = await setupDose('overdue', new Date());
    await createTestDevice(user.id, 'token-a');
    const spy = makeSender();

    const first = await notifyDoseOverdue(dose.id, makeDeps(spy));
    const second = await notifyDoseOverdue(dose.id, makeDeps(spy));

    expect(first.status).toBe('sent');
    expect(second.status).toBe('skipped');
    expect(spy.calls).toHaveLength(1);
  });
});

describe('notificationService - job cron processDueNotifications', () => {
  test('quét pending/snoozed/overdue đến hạn và gửi', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    await createTestDevice(user.id, 'token-a');

    const pending = await createTestDose(user.id, sch.id, med.id, new Date('2026-10-20T11:55:00.000Z'), 'pending');
    const snoozed = await createTestDose(user.id, sch.id, med.id, new Date('2026-10-20T11:30:00.000Z'), 'snoozed');
    await DoseOccurrence.updateOne({ _id: snoozed.id }, { $set: { snoozed_until: new Date('2026-10-20T11:58:00.000Z'), snooze_count: 1 } });
    const overdue = await createTestDose(user.id, sch.id, med.id, new Date('2026-10-20T11:20:00.000Z'), 'overdue');

    const spy = makeSender();
    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.reminders).toBe(1);
    expect(result.snoozes).toBe(1);
    expect(result.overdue).toBe(1);
    expect(spy.calls).toHaveLength(3);
    expect(await NotificationLog.countDocuments({ dose_id: pending.id, status: 'sent' })).toBe(1);
    expect(await NotificationLog.countDocuments({ dose_id: snoozed.id, status: 'sent' })).toBe(1);
    expect(await NotificationLog.countDocuments({ dose_id: overdue.id, status: 'sent' })).toBe(1);
  });

  test('pending quá cũ (ngoài cửa sổ) → không dội thông báo', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    await createTestDevice(user.id, 'token-a');
    await createTestDose(user.id, sch.id, med.id, new Date('2026-10-20T09:00:00.000Z'), 'pending');

    const spy = makeSender();
    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.scanned).toBe(0);
    expect(spy.calls).toHaveLength(0);
  });
});

describe('notificationService - thông báo người thân khi chưa xác nhận uống thuốc (relative_alert)', () => {
  async function setupMissedWithRelative(
    relativeAlerts = true,
    scheduledAt = new Date(Date.now() - (MISSED_AFTER_MINUTES + 5) * 60_000),
    status: 'missed' | 'pending' | 'snoozed' | 'confirmed' = 'missed',
  ) {
    const owner = await createTestUser('uid-owner', '0900000001');
    await User.updateOne({ _id: owner.id }, { $set: { display_name: 'Bà Lan' } });
    const relative = await createTestUser('uid-relative', '0900000002');
    await FamilyConnection.create({
      owner_id: owner.id,
      relative_id: relative.id,
      invite_id: new Types.ObjectId(),
      status: 'active',
      permissions: { view_schedule: true, manage_medication: false, relative_alerts: relativeAlerts },
      connected_at: new Date(),
    });
    const med = await createTestMedication(owner.id);
    const sch = await createTestSchedule(owner.id, med.id);
    const dose = await createTestDose(owner.id, sch.id, med.id, scheduledAt, status);
    await createTestDevice(relative.id, 'relative-token');
    return { owner, relative, med, dose };
  }

  test('gửi tới thiết bị người thân, ghi log relative_alert, không đổi reminded_at', async () => {
    const { dose } = await setupMissedWithRelative(true);
    const spy = makeSender();

    const outcome = await notifyRelativeAlert(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('sent');
    expect(spy.calls).toHaveLength(1);
    expect(spy.calls[0].tokens).toEqual(['relative-token']);
    expect(spy.calls[0].payload.data.type).toBe('relative_alert');
    expect(spy.calls[0].payload.body).toContain('Bà Lan');
    expect(spy.calls[0].payload.body).toContain('Thuốc test');

    const log = await NotificationLog.findOne({ dose_id: dose.id, kind: 'relative_alert' });
    expect(log!.status).toBe('sent');

    const updated = await DoseOccurrence.findById(dose.id);
    expect(updated!.reminded_at).toBeNull();
  });

  test('relative_alerts=false → không gửi cho người thân', async () => {
    const { dose } = await setupMissedWithRelative(false);
    const spy = makeSender();

    const outcome = await notifyRelativeAlert(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('no_relative');
    expect(spy.calls).toHaveLength(0);
  });

  test('chống trùng: gọi lần hai không gửi lại', async () => {
    const { dose } = await setupMissedWithRelative(true);
    const spy = makeSender();

    await notifyRelativeAlert(dose.id, makeDeps(spy));
    const second = await notifyRelativeAlert(dose.id, makeDeps(spy));

    expect(second.status).toBe('skipped');
    expect(second.reason).toBe('already_sent');
    expect(spy.calls).toHaveLength(1);
  });

  test('lần uống đã xác nhận → bỏ qua', async () => {
    const user = await createTestUser();
    const med = await createTestMedication(user.id);
    const sch = await createTestSchedule(user.id, med.id);
    const dose = await createTestDose(user.id, sch.id, med.id, new Date(), 'confirmed');
    const spy = makeSender();

    const outcome = await notifyRelativeAlert(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('status:confirmed');
    expect(spy.calls).toHaveLength(0);
  });

  test('thuốc đã ngừng → bỏ qua', async () => {
    const { med, dose } = await setupMissedWithRelative(true);
    await Medication.updateOne({ _id: med.id }, { $set: { status: 'discontinued' } });
    const spy = makeSender();

    const outcome = await notifyRelativeAlert(dose.id, makeDeps(spy));

    expect(outcome.status).toBe('skipped');
    expect(outcome.reason).toBe('medication_inactive');
    expect(spy.calls).toHaveLength(0);
  });

  test('job cron quét nhóm missed và gửi thông báo người thân', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    const scheduledAt = new Date(now.getTime() - 125 * 60_000); // trong cửa sổ (now-150, now-120]
    await setupMissedWithRelative(true, scheduledAt);
    const spy = makeSender();

    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.relativeAlerts).toBe(1);
    expect(result.scanned).toBe(1);
    expect(spy.calls).toHaveLength(1);
    expect(await NotificationLog.countDocuments({ kind: 'relative_alert', status: 'sent' })).toBe(1);
  });

  test('cron: chưa xác nhận quá ngưỡng 15 phút → báo người thân (dù chưa missed)', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    await setupMissedWithRelative(true, new Date(now.getTime() - 16 * 60_000), 'pending');
    const spy = makeSender();

    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.relativeAlerts).toBe(1);
    const alertCall = spy.calls.find((c) => c.payload.data.type === 'relative_alert');
    expect(alertCall).toBeDefined();
    expect(alertCall!.tokens).toEqual(['relative-token']);
    expect(await NotificationLog.countDocuments({ kind: 'relative_alert', status: 'sent' })).toBe(1);
  });

  test('cron: chưa tới ngưỡng 15 phút → chưa báo người thân', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    await setupMissedWithRelative(true, new Date(now.getTime() - 10 * 60_000), 'pending');
    const spy = makeSender();

    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.relativeAlerts).toBe(0);
    expect(spy.calls.some((c) => c.payload.data.type === 'relative_alert')).toBe(false);
    expect(await NotificationLog.countDocuments({ kind: 'relative_alert' })).toBe(0);
  });

  test('cron: đã xác nhận → không báo người thân', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    await setupMissedWithRelative(true, new Date(now.getTime() - 20 * 60_000), 'confirmed');
    const spy = makeSender();

    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.relativeAlerts).toBe(0);
    expect(spy.calls).toHaveLength(0);
  });

  test('cron: đã nhắc lại → mốc ngưỡng tính từ snoozed_until', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    const { dose } = await setupMissedWithRelative(
      true,
      new Date(now.getTime() - 60 * 60_000),
      'snoozed',
    );
    await DoseOccurrence.updateOne(
      { _id: dose.id },
      { $set: { snoozed_until: new Date(now.getTime() - 16 * 60_000) } },
    );
    const spy = makeSender();

    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.relativeAlerts).toBe(1);
    expect(spy.calls.some((c) => c.payload.data.type === 'relative_alert')).toBe(true);
  });

  test('cron: vừa nhắc lại xong (chưa quá ngưỡng) → chưa báo người thân', async () => {
    const now = new Date('2026-10-20T12:00:00.000Z');
    const { dose } = await setupMissedWithRelative(
      true,
      new Date(now.getTime() - 60 * 60_000),
      'snoozed',
    );
    await DoseOccurrence.updateOne(
      { _id: dose.id },
      { $set: { snoozed_until: new Date(now.getTime() - 5 * 60_000) } },
    );
    const spy = makeSender();

    const result = await processDueNotifications({ sender: spy.sender, now, sleep: async () => {} });

    expect(result.relativeAlerts).toBe(0);
    expect(spy.calls.some((c) => c.payload.data.type === 'relative_alert')).toBe(false);
  });
});
