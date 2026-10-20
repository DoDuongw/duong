import request from 'supertest';
import { createApp } from '../src/app';
import { initDb, closeDb, resetDb, createTestUser } from './helpers';
import { authMiddleware } from '../src/middlewares/auth';
import { User } from '../src/models/User';
import type { DoseStatus } from '../src/models/DoseOccurrence';

jest.mock('../src/middlewares/auth', () => {
  const actual = jest.requireActual('../src/middlewares/auth');
  return {
    ...actual,
    authMiddleware: (req: any, _res: any, next: any) => {
      const uid = req.headers['x-test-uid'];
      if (uid) {
        req.user = { uid: String(uid), userId: String(req.headers['x-test-user-id'] ?? '') };
      }
      next();
    },
  };
});

const app = createApp();

beforeAll(async () => {
  await initDb();
});

afterAll(async () => {
  await closeDb();
});

beforeEach(async () => {
  await resetDb();
});

describe('API tích hợp', () => {
  test('health check công khai', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('S1: gọi API có auth mà không token → 401', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('S2: token sai → không có user → 401', async () => {
    const res = await request(app).get('/api/v1/users/me').set('Authorization', 'Bearer sai-token');
    expect(res.status).toBe(401);
  });

  test('POST /users/me/sync tạo user và trả profile', async () => {
    const res = await request(app)
      .post('/api/v1/users/me/sync')
      .set('x-test-uid', 'uid-abc')
      .send({ displayName: 'Người dùng test' });
    expect(res.status).toBe(200);
    expect(res.body.data.displayName).toBe('Người dùng test');
    expect(res.body.data.timezone).toBe('Asia/Ho_Chi_Minh');
  });

  test('hai request /users/me/sync đồng thời cùng uid → cả hai 200, chỉ một bản ghi user', async () => {
    await User.init(); // bảo đảm unique index firebase_uid đã được tạo
    const [a, b] = await Promise.all([
      request(app).post('/api/v1/users/me/sync').set('x-test-uid', 'uid-race').send({ displayName: 'A' }),
      request(app).post('/api/v1/users/me/sync').set('x-test-uid', 'uid-race').send({ displayName: 'B' }),
    ]);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(await User.countDocuments({ firebase_uid: 'uid-race' })).toBe(1);
  });

  test('JSON hỏng → 400 chứ không phải 500', async () => {
    const user = await createTestUser('uid-json');
    const res = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-json')
      .set('x-test-user-id', String(user.id))
      .set('Content-Type', 'application/json')
      .send('{"name":');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('S17/B17: user A không đọc được medication của user B', async () => {
    const userA = await createTestUser('uid-a', '0900000001');
    const userB = await createTestUser('uid-b', '0900000002');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-a')
      .set('x-test-user-id', String(userA.id))
      .send({
        name: 'Thuốc A',
        startDate: '2026-10-01',
        schedules: [{ timeOfDay: '08:00' }],
      });
    expect(created.status).toBe(201);
    const medId = created.body.data.id;

    const res = await request(app)
      .get(`/api/v1/medications/${medId}`)
      .set('x-test-uid', 'uid-b')
      .set('x-test-user-id', String(userB.id));
    expect(res.status).toBe(404);
  });

  test('B1: tạo thuốc hợp lệ → 201 kèm lịch', async () => {
    const user = await createTestUser('uid-c');
    const res = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-c')
      .set('x-test-user-id', String(user.id))
      .send({
        name: 'Thuốc B',
        dosageText: '1 viên/lần',
        startDate: '2026-10-01',
        schedules: [{ timeOfDay: '08:00' }, { timeOfDay: '20:00' }],
      });
    expect(res.status).toBe(201);
    expect(res.body.data.schedules).toHaveLength(2);
    expect(res.body.data.schedules[0].timeOfDay).toContain('08:00');
  });

  test('B2: tạo thuốc thiếu tên → 400', async () => {
    const user = await createTestUser('uid-d');
    const res = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-d')
      .set('x-test-user-id', String(user.id))
      .send({ startDate: '2026-10-01', schedules: [{ timeOfDay: '08:00' }] });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('B4: confirm qua API thành công', async () => {
    const user = await createTestUser('uid-e');
    const { DoseOccurrence, Medication, MedicationSchedule } = await import('../src/models');
    const med = await Medication.create({
      user_id: user.id,
      name: 'X',
      start_date: '2026-10-01',
      status: 'active',
      created_by: user.id,
    });
    const sch = await MedicationSchedule.create({
      medication_id: med.id,
      user_id: user.id,
      time_of_day: '08:00:00',
      recurrence_rule: 'daily',
      effective_from: '2026-10-01',
      status: 'active',
      current_version: 1,
    });
    const dose = await DoseOccurrence.create({
      schedule_id: sch.id,
      medication_id: med.id,
      user_id: user.id,
      scheduled_at: new Date(Date.now() - 60_000),
      status: 'pending',
      schedule_version: 1,
    });

    const res = await request(app)
      .post(`/api/v1/doses/${dose.id}/confirm`)
      .set('x-test-uid', 'uid-e')
      .set('x-test-user-id', String(user.id))
      .send({ clientRequestId: 'client-req-0001' });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('confirmed');
  });

  test('B16: /doses/today lấy đúng ngày địa phương (mốc 23:30–00:30), không theo UTC', async () => {
    const { DoseOccurrence, Medication, MedicationSchedule } = await import('../src/models');
    const { todayLocal, localDateTimeToUtc, startOfLocalDayUtc, endOfLocalDayUtc } = await import(
      '../src/utils/time'
    );
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-b16');
    const med = await Medication.create({
      user_id: user.id,
      name: 'Thuốc B16',
      start_date: '2026-10-01',
      status: 'active',
      created_by: user.id,
    });
    // Lịch archived để route /doses/today không sinh thêm lần uống nào cho hôm nay
    const sch = await MedicationSchedule.create({
      medication_id: med.id,
      user_id: user.id,
      time_of_day: '08:00:00',
      recurrence_rule: 'daily',
      effective_from: '2026-10-01',
      status: 'archived',
      current_version: 1,
    });

    const today = todayLocal(tz);
    const yesterdayLastMoment = new Date(startOfLocalDayUtc(tz, today).getTime() - 1); // 23:59:59.999 hôm qua
    const earlyToday = localDateTimeToUtc(today, '00:30', tz); // 17:30Z hôm qua theo UTC
    const lateToday = localDateTimeToUtc(today, '23:30', tz); // 16:30Z hôm nay theo UTC
    const tomorrowStart = new Date(endOfLocalDayUtc(tz, today).getTime() + 1);

    for (const [scheduledAt, status] of [
      [yesterdayLastMoment, 'pending'],
      [earlyToday, 'confirmed'],
      [lateToday, 'pending'],
      [tomorrowStart, 'pending'],
    ] as [Date, DoseStatus][]) {
      await DoseOccurrence.create({
        schedule_id: sch.id,
        medication_id: med.id,
        user_id: user.id,
        scheduled_at: scheduledAt,
        status,
        schedule_version: 1,
      });
    }

    const res = await request(app)
      .get('/api/v1/doses/today')
      .set('x-test-uid', 'uid-b16')
      .set('x-test-user-id', String(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe(today);
    expect(res.body.data.stats.total).toBe(2); // 00:30 và 23:30 giờ VN
    const times = res.body.data.doses.map((d: { scheduledAt: string }) => d.scheduledAt);
    expect(times).toContain(earlyToday.toISOString());
    expect(times).toContain(lateToday.toISOString());
    expect(times).not.toContain(yesterdayLastMoment.toISOString());
    expect(times).not.toContain(tomorrowStart.toISOString());
  });

  test('B14: đổi giờ lịch → phiên bản mới, lần uống tương lai theo giờ mới, quá khứ giữ nguyên', async () => {
    const { DoseOccurrence, ScheduleVersion } = await import('../src/models');
    const { todayLocal, localDateTimeToUtc, shiftYmd } = await import('../src/utils/time');
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-b14');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-b14')
      .set('x-test-user-id', String(user.id))
      .send({
        name: 'Thuốc B14',
        startDate: shiftYmd(todayLocal(tz), -1),
        schedules: [{ timeOfDay: '08:00' }],
      });
    expect(created.status).toBe(201);
    const medId = created.body.data.id;
    const scheduleId = created.body.data.schedules[0].id;

    const tomorrow = shiftYmd(todayLocal(tz), 1);
    const yesterday = shiftYmd(todayLocal(tz), -1);
    const futureDose = await DoseOccurrence.create({
      schedule_id: scheduleId,
      medication_id: medId,
      user_id: user.id,
      scheduled_at: localDateTimeToUtc(tomorrow, '08:00', tz),
      status: 'pending',
      schedule_version: 1,
    });
    const pastDose = await DoseOccurrence.create({
      schedule_id: scheduleId,
      medication_id: medId,
      user_id: user.id,
      scheduled_at: localDateTimeToUtc(yesterday, '08:00', tz),
      status: 'confirmed',
      schedule_version: 1,
    });

    const res = await request(app)
      .put(`/api/v1/medications/schedules/${scheduleId}`)
      .set('x-test-uid', 'uid-b14')
      .set('x-test-user-id', String(user.id))
      .send({ timeOfDay: '09:00', recurrenceRule: 'daily', effectiveFrom: todayLocal(tz) });

    expect(res.status).toBe(200);
    expect(res.body.data.currentVersion).toBe(2);

    // Lần uống tương lai theo lịch cũ bị thay bằng lần uống theo giờ mới
    expect(await DoseOccurrence.findById(futureDose.id)).toBeNull();
    const newDoses = await DoseOccurrence.find({
      schedule_id: scheduleId,
      scheduled_at: { $gt: new Date() },
    });
    expect(newDoses.length).toBeGreaterThan(0);
    for (const d of newDoses) {
      expect(d.schedule_version).toBe(2);
      const localTime = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d.scheduled_at);
      expect(localTime).toBe('09:00');
    }

    // Lịch sử cũ giữ nguyên phiên bản 1
    expect((await DoseOccurrence.findById(pastDose.id))!.schedule_version).toBe(1);

    const versions = await ScheduleVersion.find({ schedule_id: scheduleId }).sort({ version: 1 });
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
  });

  test('B15: ngừng thuốc → discontinued + lịch archived + xóa lần uống tương lai, giữ quá khứ', async () => {
    const { DoseOccurrence, Medication, MedicationSchedule } = await import('../src/models');
    const { todayLocal, localDateTimeToUtc, shiftYmd } = await import('../src/utils/time');
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-b15');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-b15')
      .set('x-test-user-id', String(user.id))
      .send({
        name: 'Thuốc B15',
        startDate: shiftYmd(todayLocal(tz), -1),
        schedules: [{ timeOfDay: '08:00' }],
      });
    expect(created.status).toBe(201);
    const medId = created.body.data.id;
    const scheduleId = created.body.data.schedules[0].id;

    const futureDose = await DoseOccurrence.create({
      schedule_id: scheduleId,
      medication_id: medId,
      user_id: user.id,
      scheduled_at: localDateTimeToUtc(shiftYmd(todayLocal(tz), 1), '08:00', tz),
      status: 'pending',
      schedule_version: 1,
    });
    const pastDose = await DoseOccurrence.create({
      schedule_id: scheduleId,
      medication_id: medId,
      user_id: user.id,
      scheduled_at: localDateTimeToUtc(shiftYmd(todayLocal(tz), -1), '08:00', tz),
      status: 'confirmed',
      schedule_version: 1,
    });

    const res = await request(app)
      .post(`/api/v1/medications/${medId}/discontinue`)
      .set('x-test-uid', 'uid-b15')
      .set('x-test-user-id', String(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('discontinued');
    expect(res.body.data.removedFutureDoses).toBe(1);

    expect((await Medication.findById(medId))!.status).toBe('discontinued');
    expect((await MedicationSchedule.findById(scheduleId))!.status).toBe('archived');
    expect(await DoseOccurrence.findById(futureDose.id)).toBeNull();
    expect((await DoseOccurrence.findById(pastDose.id))!.status).toBe('confirmed');
  });

  test('cannot-take thiếu lý do → 400', async () => {
    const user = await createTestUser('uid-f');
    const { DoseOccurrence, Medication, MedicationSchedule } = await import('../src/models');
    const med = await Medication.create({
      user_id: user.id,
      name: 'X',
      start_date: '2026-10-01',
      status: 'active',
      created_by: user.id,
    });
    const sch = await MedicationSchedule.create({
      medication_id: med.id,
      user_id: user.id,
      time_of_day: '08:00:00',
      recurrence_rule: 'daily',
      effective_from: '2026-10-01',
      status: 'active',
      current_version: 1,
    });
    const dose = await DoseOccurrence.create({
      schedule_id: sch.id,
      medication_id: med.id,
      user_id: user.id,
      scheduled_at: new Date(Date.now() + 3600_000),
      status: 'pending',
      schedule_version: 1,
    });

    const res = await request(app)
      .post(`/api/v1/doses/${dose.id}/cannot-take`)
      .set('x-test-uid', 'uid-f')
      .set('x-test-user-id', String(user.id))
      .send({});
    expect(res.status).toBe(400);
  });

  test('M05: thêm giờ/lịch vào thuốc đang dùng → 201 và sinh lần uống tương lai', async () => {
    const { DoseOccurrence } = await import('../src/models');
    const { todayLocal } = await import('../src/utils/time');
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-m05a');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-m05a')
      .set('x-test-user-id', String(user.id))
      .send({ name: 'Thuốc M05a', startDate: todayLocal(tz), schedules: [{ timeOfDay: '08:00' }] });
    const medId = created.body.data.id;

    const res = await request(app)
      .post(`/api/v1/medications/${medId}/schedules`)
      .set('x-test-uid', 'uid-m05a')
      .set('x-test-user-id', String(user.id))
      .send({ timeOfDay: '20:00' });

    expect(res.status).toBe(201);
    expect(res.body.data.timeOfDay).toContain('20:00');
    const newScheduleId = res.body.data.id;
    const future = await DoseOccurrence.find({ schedule_id: newScheduleId, scheduled_at: { $gt: new Date() } });
    expect(future.length).toBeGreaterThan(0);
  });

  test('M05: thêm giờ trùng lịch đang có → 409 CONFLICT', async () => {
    const { todayLocal } = await import('../src/utils/time');
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-m05b');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-m05b')
      .set('x-test-user-id', String(user.id))
      .send({ name: 'Thuốc M05b', startDate: todayLocal(tz), schedules: [{ timeOfDay: '08:00' }] });
    const medId = created.body.data.id;

    const res = await request(app)
      .post(`/api/v1/medications/${medId}/schedules`)
      .set('x-test-uid', 'uid-m05b')
      .set('x-test-user-id', String(user.id))
      .send({ timeOfDay: '08:00' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  test('M05: thêm giờ vào thuốc đã ngừng → 409', async () => {
    const { todayLocal } = await import('../src/utils/time');
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-m05c');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-m05c')
      .set('x-test-user-id', String(user.id))
      .send({ name: 'Thuốc M05c', startDate: todayLocal(tz), schedules: [{ timeOfDay: '08:00' }] });
    const medId = created.body.data.id;
    await request(app)
      .post(`/api/v1/medications/${medId}/discontinue`)
      .set('x-test-uid', 'uid-m05c')
      .set('x-test-user-id', String(user.id));

    const res = await request(app)
      .post(`/api/v1/medications/${medId}/schedules`)
      .set('x-test-uid', 'uid-m05c')
      .set('x-test-user-id', String(user.id))
      .send({ timeOfDay: '20:00' });
    expect(res.status).toBe(409);
  });

  test('M05: xóa giờ/lịch → archived + xóa lần uống tương lai, giữ quá khứ', async () => {
    const { DoseOccurrence, MedicationSchedule } = await import('../src/models');
    const { todayLocal, localDateTimeToUtc, shiftYmd } = await import('../src/utils/time');
    const tz = 'Asia/Ho_Chi_Minh';
    const user = await createTestUser('uid-m05d');

    const created = await request(app)
      .post('/api/v1/medications')
      .set('x-test-uid', 'uid-m05d')
      .set('x-test-user-id', String(user.id))
      .send({ name: 'Thuốc M05d', startDate: shiftYmd(todayLocal(tz), -1), schedules: [{ timeOfDay: '08:00' }] });
    const medId = created.body.data.id;
    const scheduleId = created.body.data.schedules[0].id;

    const futureDose = await DoseOccurrence.create({
      schedule_id: scheduleId,
      medication_id: medId,
      user_id: user.id,
      scheduled_at: localDateTimeToUtc(shiftYmd(todayLocal(tz), 1), '08:00', tz),
      status: 'pending',
      schedule_version: 1,
    });
    const pastDose = await DoseOccurrence.create({
      schedule_id: scheduleId,
      medication_id: medId,
      user_id: user.id,
      scheduled_at: localDateTimeToUtc(shiftYmd(todayLocal(tz), -1), '08:00', tz),
      status: 'confirmed',
      schedule_version: 1,
    });

    const res = await request(app)
      .delete(`/api/v1/medications/schedules/${scheduleId}`)
      .set('x-test-uid', 'uid-m05d')
      .set('x-test-user-id', String(user.id));

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('archived');
    expect(res.body.data.removedFutureDoses).toBe(1);
    expect(await DoseOccurrence.findById(futureDose.id)).toBeNull();
    expect((await DoseOccurrence.findById(pastDose.id))!.status).toBe('confirmed');
    expect((await MedicationSchedule.findById(scheduleId))!.status).toBe('archived');
  });

  test('GET /doses/:id trả kèm tên thuốc và hướng dẫn cho M02', async () => {
    const { DoseOccurrence, Medication, MedicationSchedule } = await import('../src/models');
    const user = await createTestUser('uid-m02');
    const med = await Medication.create({
      user_id: user.id,
      name: 'Thuốc M02',
      dosage_text: '2 viên',
      instructions: 'Sau ăn',
      start_date: '2026-10-01',
      status: 'active',
      created_by: user.id,
    });
    const sch = await MedicationSchedule.create({
      medication_id: med.id,
      user_id: user.id,
      time_of_day: '08:00:00',
      recurrence_rule: 'daily',
      effective_from: '2026-10-01',
      status: 'active',
      current_version: 1,
    });
    const dose = await DoseOccurrence.create({
      schedule_id: sch.id,
      medication_id: med.id,
      user_id: user.id,
      scheduled_at: new Date(Date.now() + 3600_000),
      status: 'pending',
      schedule_version: 1,
    });

    const res = await request(app)
      .get(`/api/v1/doses/${dose.id}`)
      .set('x-test-uid', 'uid-m02')
      .set('x-test-user-id', String(user.id));
    expect(res.status).toBe(200);
    expect(res.body.data.medicationName).toBe('Thuốc M02');
    expect(res.body.data.dosageText).toBe('2 viên');
    expect(res.body.data.instructions).toBe('Sau ăn');
  });
});

void authMiddleware;
