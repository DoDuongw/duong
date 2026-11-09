import { DoseOccurrence, DoseOccurrenceDoc } from '../models/DoseOccurrence';
import { Medication, MedicationDoc } from '../models/Medication';
import { User, UserDoc } from '../models/User';
import { Device } from '../models/Device';
import { FamilyConnection } from '../models/FamilyConnection';
import { NotificationLog } from '../models/NotificationLog';
import { NotificationHistory } from '../models/NotificationHistory';
import { HealthLog } from '../models/HealthLog';
import { getMessagingOrNull } from '../config/firebase';
import { env } from '../config/env';
import { addMinutes } from '../utils/time';
import { MISSED_AFTER_MINUTES, OVERDUE_AFTER_MINUTES } from './doseService';

/** Loại thông báo do server chủ động gửi (khớp `notification_logs.kind`). */
export type PushKind = 'scheduled_reminder' | 'overdue' | 'snooze' | 'relative_alert' | 'wellness_check';

/** Nội dung push — gửi dạng data-only để Service Worker tự hiển thị (kiểm soát actions). */
export interface PushPayload {
  title: string;
  body: string;
  tag: string;
  /** Android notification channel; mặc định `med-reminders`. */
  channelId?: string;
  data: Record<string, string>;
}

export interface PushResult {
  token: string;
  ok: boolean;
  /** Token không còn hiệu lực (unregistered/invalid) → đánh dấu device `invalid`, không thử lại. */
  invalid: boolean;
  error?: string;
}

/** Hàm gửi thật; tiêm được để test dùng sender giả (không gọi FCM thật). */
export type PushSender = (tokens: string[], payload: PushPayload) => Promise<PushResult[]>;

export interface NotifyDeps {
  sender: PushSender;
  /** Đồng hồ tiêm được (test dùng mốc cố định). */
  now?: Date;
  /** Hàm chờ tiêm được (test không chờ thật). */
  sleep?: (ms: number) => Promise<void>;
  /** Số lần thử tối đa cho một lần gửi (mặc định 3 — không retry vô hạn). */
  maxAttempts?: number;
}

export interface NotifyOutcome {
  status: 'sent' | 'failed' | 'expired' | 'skipped';
  reason?: string;
  sent?: number;
  invalid?: number;
}

export const DEFAULT_MAX_ATTEMPTS = 3;
/** Backoff giữa các lần thử: 1s / 5s / 15s (NOTIFICATION_PLAN §4). */
export const RETRY_BACKOFF_MS = [1000, 5000, 15000];
/** Cửa sổ gửi push trễ tối đa (phút) — tránh "dội" thông báo cũ khi server vừa bật lại. */
export const NOTIFY_WINDOW_MINUTES = OVERDUE_AFTER_MINUTES;

/**
 * Trạng thái "chưa xác nhận" → còn phải báo người thân:
 * `pending`/`overdue`/`snoozed` (chưa uống) và `missed` (bỏ lỡ).
 * `confirmed`/`cannot_take` là đã có hành động → không báo.
 */
export const UNCONFIRMED_STATUSES: string[] = ['pending', 'snoozed', 'overdue', 'missed'];

export const DEFAULT_SLEEP = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function isInvalidTokenError(code: string | undefined): boolean {
  if (!code) return false;
  return (
    code === 'messaging/registration-token-not-registered' ||
    code === 'messaging/invalid-registration-token' ||
    code === 'messaging/invalid-argument'
  );
}

function isExpoPushToken(token: string): boolean {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

function isExpoInvalidError(error: string | undefined): boolean {
  return error === 'DeviceNotRegistered' || error === 'InvalidCredentials';
}

async function sendViaExpo(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
  try {
    const fetchFn: typeof fetch | undefined = (globalThis as any).fetch;
    if (!fetchFn) {
      return tokens.map((token) => ({ token, ok: false, invalid: false, error: 'fetch_unavailable' }));
    }
    const messages = tokens.map((to) => ({
      to,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      sound: 'default',
      priority: 'high',
      channelId: payload.channelId || 'med-reminders',
    }));
    const res = await fetchFn('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });
    const json: any = await res.json().catch(() => ({}));
    const tickets: any[] = Array.isArray(json?.data) ? json.data : [];
    return tokens.map((token, i) => {
      const t = tickets[i] || {};
      const ok = t.status === 'ok';
      const err = t.details?.error || t.message;
      return { token, ok, invalid: !ok && isExpoInvalidError(err), error: ok ? undefined : String(err || 'expo_push_failed') };
    });
  } catch (e) {
    return tokens.map((token) => ({ token, ok: false, invalid: false, error: (e as Error).message }));
  }
}

async function sendViaFcm(tokens: string[], payload: PushPayload): Promise<PushResult[]> {
  const messaging = getMessagingOrNull();
  if (!messaging) {
    return tokens.map((token) => ({ token, ok: false, invalid: false, error: 'FIREBASE_NOT_CONFIGURED' }));
  }
  const response = await messaging.sendEachForMulticast({
    tokens,
    notification: { title: payload.title, body: payload.body },
    data: payload.data,
    android: {
      priority: 'high',
      notification: {
        channelId: payload.channelId || 'med-reminders',
        sound: 'default',
        tag: payload.tag,
      },
    },
    apns: {
      headers: { 'apns-priority': '10', 'apns-push-type': 'alert' },
      payload: {
        aps: {
          alert: { title: payload.title, body: payload.body },
          sound: 'default',
          'thread-id': payload.tag,
        },
      },
    },
    webpush: {
      headers: { Urgency: 'high', TTL: '600' },
      notification: { title: payload.title, body: payload.body, tag: payload.tag },
      data: payload.data,
      fcmOptions: payload.data.url ? { link: payload.data.url } : undefined,
    },
  });
  return response.responses.map((r, i) => ({
    token: tokens[i],
    ok: r.success,
    invalid: isInvalidTokenError(r.error?.code),
    error: r.error ? r.error.code ?? r.error.message : undefined,
  }));
}

/**
 * Sender thật: hỗ trợ cả Expo Push Token (Expo Push Service, phù hợp Expo Go/dev)
 * và token FCM/native (Firebase Admin). Nếu Firebase Admin chưa cấu hình, vẫn gửi được
 * các token Expo Push; token FCM sẽ ghi lỗi `FIREBASE_NOT_CONFIGURED`.
 */
export const firebasePushSender: PushSender = async (tokens, payload) => {
  const expoTokens = tokens.filter(isExpoPushToken);
  const fcmTokens = tokens.filter((t) => !isExpoPushToken(t));
  const results: PushResult[] = [];
  if (expoTokens.length) results.push(...(await sendViaExpo(expoTokens, payload)));
  if (fcmTokens.length) results.push(...(await sendViaFcm(fcmTokens, payload)));
  // preserve input order
  const byToken = new Map<string, PushResult[]>();
  for (const r of results) {
    const arr = byToken.get(r.token) || [];
    arr.push(r);
    byToken.set(r.token, arr);
  }
  return tokens.map((t) => (byToken.get(t) || [{ token: t, ok: false, invalid: false, error: 'missing_result' }]).shift()!);
};

interface DoseContext {
  dose: DoseOccurrenceDoc;
  medication: MedicationDoc | null;
  owner: UserDoc | null;
  timezone: string;
}

async function loadDoseContext(doseId: string): Promise<DoseContext | null> {
  const dose = await DoseOccurrence.findById(doseId);
  if (!dose) return null;
  const [medication, owner] = await Promise.all([
    Medication.findById(dose.medication_id),
    User.findById(dose.user_id),
  ]);
  return { dose, medication, owner, timezone: owner?.timezone || env.TZ_DEFAULT };
}

function reminderPayload(ctx: DoseContext, tz: string): PushPayload {
  const dose = ctx.dose;
  const name = ctx.medication?.name ?? 'Thuốc';
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dose.scheduled_at);
  const dosage = ctx.medication?.dosage_text ? ` — ${ctx.medication.dosage_text}` : '';
  const instructions = ctx.medication?.instructions ? ` (${ctx.medication.instructions})` : '';
  return {
    title: 'Đến giờ uống thuốc',
    body: `${name} — ${time}${dosage}${instructions}`,
    tag: `dose-${dose.id}`,
    data: {
      type: 'dose_reminder',
      doseId: dose.id,
      title: 'Đến giờ uống thuốc',
      body: `${name} — ${time}${dosage}`,
      tag: `dose-${dose.id}`,
      url: `/dose/${dose.id}`,
    },
  };
}

function overduePayload(ctx: DoseContext): PushPayload {
  const dose = ctx.dose;
  const name = ctx.medication?.name ?? 'Thuốc';
  return {
    title: 'Quá giờ uống thuốc',
    body: `Bạn chưa xác nhận đã uống ${name}.`,
    tag: `dose-overdue-${dose.id}`,
    data: {
      type: 'dose_overdue',
      doseId: dose.id,
      title: 'Quá giờ uống thuốc',
      body: `Bạn chưa xác nhận đã uống ${name}.`,
      tag: `dose-overdue-${dose.id}`,
      url: `/dose/${dose.id}`,
    },
  };
}

function snoozePayload(ctx: DoseContext): PushPayload {
  const dose = ctx.dose;
  const name = ctx.medication?.name ?? 'Thuốc';
  return {
    title: 'Nhắc lại: uống thuốc',
    body: `Đến giờ uống lại ${name}.`,
    tag: `dose-snooze-${dose.id}`,
    data: {
      type: 'dose_snooze',
      doseId: dose.id,
      title: 'Nhắc lại: uống thuốc',
      body: `Đến giờ uống lại ${name}.`,
      tag: `dose-snooze-${dose.id}`,
      url: `/dose/${dose.id}`,
    },
  };
}

function wellnessCheckPayload(ctx: DoseContext): PushPayload {
  const dose = ctx.dose;
  const name = ctx.medication?.name ?? 'thuốc';
  const body = `Bạn cảm thấy thế nào sau khi uống ${name}? Hãy theo dõi sức khỏe và báo cho người thân nếu thấy bất thường.`;
  return {
    title: 'Hỏi thăm sức khỏe',
    body,
    tag: `dose-wellness-${dose.id}`,
    channelId: 'med-wellness',
    data: {
      type: 'wellness_check',
      doseId: dose.id,
      title: 'Hỏi thăm sức khỏe',
      body,
      tag: `dose-wellness-${dose.id}`,
      url: `/dose/${dose.id}`,
    },
  };
}

function relativeAlertPayload(ctx: DoseContext): PushPayload {
  const dose = ctx.dose;
  const name = ctx.medication?.name ?? 'Thuốc';
  const ownerName = ctx.owner?.display_name ?? 'Người thân';
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: ctx.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dose.scheduled_at);
  const body = `${ownerName} chưa uống thuốc ${name} lúc ${time}.`;
  return {
    title: 'Người thân chưa uống thuốc',
    body,
    tag: `dose-relative-${dose.id}`,
    data: {
      type: 'relative_alert',
      doseId: dose.id,
      title: 'Người thân chưa uống thuốc',
      body,
      tag: `dose-relative-${dose.id}`,
      url: `/dose/${dose.id}`,
    },
  };
}

/** Token của mọi thiết bị đang hoạt động của một người dùng. */
async function activeTokensForUser(userId: string): Promise<string[]> {
  const devices = await Device.find({
    user_id: userId,
    status: 'active',
    notifications_enabled: true,
  });
  return devices.map((d) => d.fcm_token);
}

/**
 * Gửi push tới một danh sách token, có:
 * - thử lại có giới hạn (mặc định 3 lần, backoff 1s/5s/15s),
 * - token hỏng → device `invalid` (N4),
 * - ghi `notification_logs` (dùng để chống trùng theo dose + kind).
 */
async function sendPushToTokens(
  tokens: string[],
  doseId: string,
  kind: PushKind,
  payload: PushPayload,
  deps: NotifyDeps,
  options: { maxAttempts: number; alreadySent: boolean; markReminded?: boolean },
): Promise<NotifyOutcome> {
  if (options.alreadySent) return { status: 'skipped', reason: 'already_sent' };

  const now = deps.now ?? new Date();
  const sleep = deps.sleep ?? DEFAULT_SLEEP;

  if (tokens.length === 0) {
    await NotificationLog.create({
      dose_id: doseId,
      device_id: null,
      channel: 'fcm',
      kind,
      sent_at: now,
      status: 'failed',
      error: 'no_active_device',
    });
    return { status: 'failed', reason: 'no_active_device' };
  }

  let results: PushResult[] = [];
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      results = await deps.sender(tokens, payload);
    } catch (e) {
      results = tokens.map((token) => ({ token, ok: false, invalid: false, error: (e as Error).message }));
    }
    const retryable = results.some((r) => !r.ok && !r.invalid);
    if (!retryable) break;
    if (attempt < options.maxAttempts) await sleep(RETRY_BACKOFF_MS[attempt - 1]);
  }

  const invalidTokens = results.filter((r) => r.invalid).map((r) => r.token);
  if (invalidTokens.length > 0) {
    await Device.updateMany({ fcm_token: { $in: invalidTokens } }, { $set: { status: 'invalid' } });
  }

  const sent = results.filter((r) => r.ok).length;
  const status = sent > 0 ? 'sent' : invalidTokens.length === tokens.length ? 'expired' : 'failed';
  const error =
    status === 'sent'
      ? null
      : results.find((r) => !r.ok && r.error)?.error ?? (status === 'expired' ? 'token_invalid' : 'send_failed');

  await NotificationLog.create({
    dose_id: doseId,
    device_id: null,
    channel: 'fcm',
    kind,
    sent_at: now,
    status,
    error,
  });

  // Lịch sử thông báo cho người dùng: mỗi người nhận tối đa 1 bản ghi cho một lần gửi,
  // kể cả khi họ có nhiều thiết bị cùng nhận thành công.
  if (status === 'sent') {
    const okTokens = results.filter((r) => r.ok).map((r) => r.token);
    if (okTokens.length > 0) {
      try {
        const devices = await Device.find({ fcm_token: { $in: okTokens } }).select('user_id');
        const userIds = Array.from(new Set(devices.map((d) => d.user_id.toString())));
        if (userIds.length > 0) {
          await NotificationHistory.insertMany(
            userIds.map((user_id) => ({
              user_id,
              dose_id: doseId,
              kind,
              title: payload.title,
              body: payload.body,
              data: payload.data ?? null,
              sent_at: now,
            })),
            { ordered: false },
          );
        }
      } catch {
        // Lịch sử chỉ để hiển thị; lỗi ghi lịch sử không được làm hỏng luồng gửi nhắc thuốc.
      }
    }
  }

  if (status === 'sent' && options.markReminded) {
    await DoseOccurrence.updateOne({ _id: doseId }, { $set: { reminded_at: now } });
  }

  return { status, sent, invalid: invalidTokens.length };
}

/** Gửi push tới thiết bị của chủ hồ sơ (dùng cho nhắc giờ uống / snooze / quá giờ). */
async function sendDosePush(
  ctx: DoseContext,
  kind: PushKind,
  payload: PushPayload,
  deps: NotifyDeps,
  options: { maxAttempts: number; alreadySent: boolean },
): Promise<NotifyOutcome> {
  const tokens = await activeTokensForUser(ctx.dose.user_id);
  return sendPushToTokens(tokens, ctx.dose.id, kind, payload, deps, {
    maxAttempts: options.maxAttempts,
    alreadySent: options.alreadySent,
    markReminded: true,
  });
}

/** Số lần đã gửi thành công (chỉ tính 'sent') cho một dose + kind. */
async function sentCount(doseId: string, kind: PushKind): Promise<number> {
  return NotificationLog.countDocuments({ dose_id: doseId, kind, status: 'sent' });
}

async function terminalSent(doseId: string, kind: PushKind): Promise<boolean> {
  const count = await NotificationLog.countDocuments({
    dose_id: doseId,
    kind,
    status: { $in: ['sent', 'expired'] },
  });
  return count > 0;
}

async function attemptCount(doseId: string, kind: PushKind): Promise<number> {
  return NotificationLog.countDocuments({ dose_id: doseId, kind });
}

/**
 * Nhắc giờ uống: chỉ gửi khi lần uống còn `pending` và thuốc còn hoạt động.
 * Đã xác nhận / không thể uống / ngừng thuốc → bỏ qua (N2).
 */
export async function notifyDoseReminder(doseId: string, deps: NotifyDeps): Promise<NotifyOutcome> {
  const ctx = await loadDoseContext(doseId);
  if (!ctx) return { status: 'skipped', reason: 'not_found' };
  if (ctx.dose.status !== 'pending') return { status: 'skipped', reason: `status:${ctx.dose.status}` };
  if (!ctx.medication || ctx.medication.status !== 'active') {
    return { status: 'skipped', reason: 'medication_inactive' };
  }
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const alreadySent = (await terminalSent(doseId, 'scheduled_reminder')) || (await attemptCount(doseId, 'scheduled_reminder')) >= maxAttempts;
  return sendDosePush(ctx, 'scheduled_reminder', reminderPayload(ctx, ctx.timezone), deps, {
    maxAttempts,
    alreadySent,
  });
}

/** Nhắc lại sau snooze: gửi khi đã tới `snoozed_until`; mỗi lần snooze một push mới. */
export async function notifyDoseSnooze(doseId: string, deps: NotifyDeps): Promise<NotifyOutcome> {
  const ctx = await loadDoseContext(doseId);
  if (!ctx) return { status: 'skipped', reason: 'not_found' };
  const dose = ctx.dose;
  if (dose.status !== 'snoozed') return { status: 'skipped', reason: `status:${dose.status}` };
  const now = deps.now ?? new Date();
  if (dose.snoozed_until && dose.snoozed_until.getTime() > now.getTime()) {
    return { status: 'skipped', reason: 'not_due' };
  }
  if (!ctx.medication || ctx.medication.status !== 'active') {
    return { status: 'skipped', reason: 'medication_inactive' };
  }
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const sent = await sentCount(doseId, 'snooze');
  const alreadySent = sent >= dose.snooze_count || (await attemptCount(doseId, 'snooze')) >= maxAttempts * Math.max(1, dose.snooze_count);
  return sendDosePush(ctx, 'snooze', snoozePayload(ctx), deps, { maxAttempts, alreadySent });
}

/** Nhắc khi quá giờ (status `overdue`) — mỗi lần uống chỉ gửi một lần. */
export async function notifyDoseOverdue(doseId: string, deps: NotifyDeps): Promise<NotifyOutcome> {
  const ctx = await loadDoseContext(doseId);
  if (!ctx) return { status: 'skipped', reason: 'not_found' };
  if (ctx.dose.status !== 'overdue') return { status: 'skipped', reason: `status:${ctx.dose.status}` };
  if (!ctx.medication || ctx.medication.status !== 'active') {
    return { status: 'skipped', reason: 'medication_inactive' };
  }
  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const alreadySent = (await terminalSent(doseId, 'overdue')) || (await attemptCount(doseId, 'overdue')) >= maxAttempts;
  return sendDosePush(ctx, 'overdue', overduePayload(ctx), deps, { maxAttempts, alreadySent });
}

function relativeCannotTakePayload(ctx: DoseContext): PushPayload {
  const dose = ctx.dose;
  const name = ctx.medication?.name ?? 'Thuốc';
  const ownerName = ctx.owner?.display_name ?? 'Người thân';
  const time = new Intl.DateTimeFormat('vi-VN', {
    timeZone: ctx.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dose.scheduled_at);
  const reason = dose.cannot_take_reason ? ` Lý do: ${dose.cannot_take_reason}` : '';
  const body = `${ownerName} báo không thể uống ${name} lúc ${time}.${reason}`;
  return {
    title: 'Người thân không thể uống thuốc',
    body,
    tag: `dose-relative-${dose.id}`,
    data: {
      type: 'relative_alert',
      doseId: dose.id,
      title: 'Người thân không thể uống thuốc',
      body,
      tag: `dose-relative-${dose.id}`,
      url: `/dose/${dose.id}`,
    },
  };
}

/**
 * Thông báo người thân (NOTIFICATION_PLAN §3.4): khi lần uống **chưa được xác nhận**
 * (còn `pending`/`snoozed`/`overdue`, hoặc đã `missed`) quá ngưỡng
 * `RELATIVE_ALERT_AFTER_MINUTES`, gửi push tới thiết bị của mọi người thân có kết nối
 * `active` và `permissions.relative_alerts = true`.
 * Chống trùng theo `(dose_id, kind='relative_alert')` — mỗi lần uống chỉ gửi một lần.
 * `allowCannotTake`: khi người dùng chủ động báo "không thể uống", vẫn thông báo người thân
 * (nội dung khác) nếu chưa từng gửi cảnh báo cho lần uống này.
 */
export async function notifyRelativeAlert(
  doseId: string,
  deps: NotifyDeps,
  opts?: { allowCannotTake?: boolean },
): Promise<NotifyOutcome> {
  const ctx = await loadDoseContext(doseId);
  if (!ctx) return { status: 'skipped', reason: 'not_found' };
  const isCannotTake = ctx.dose.status === 'cannot_take';
  if (isCannotTake && !opts?.allowCannotTake) {
    return { status: 'skipped', reason: `status:${ctx.dose.status}` };
  }
  if (!isCannotTake && !UNCONFIRMED_STATUSES.includes(ctx.dose.status)) {
    return { status: 'skipped', reason: `status:${ctx.dose.status}` };
  }
  if (!ctx.medication || ctx.medication.status !== 'active') {
    return { status: 'skipped', reason: 'medication_inactive' };
  }

  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const alreadySent =
    (await terminalSent(doseId, 'relative_alert')) || (await attemptCount(doseId, 'relative_alert')) >= maxAttempts;
  if (alreadySent) return { status: 'skipped', reason: 'already_sent' };

  const connections = await FamilyConnection.find({
    owner_id: ctx.dose.user_id,
    status: 'active',
    'permissions.relative_alerts': true,
  });
  if (connections.length === 0) return { status: 'skipped', reason: 'no_relative' };

  const tokens: string[] = [];
  for (const conn of connections) {
    tokens.push(...(await activeTokensForUser(conn.relative_id.toString())));
  }
  if (tokens.length === 0) return { status: 'skipped', reason: 'no_relative_device' };

  const payload = isCannotTake ? relativeCannotTakePayload(ctx) : relativeAlertPayload(ctx);
  return sendPushToTokens(tokens, ctx.dose.id, 'relative_alert', payload, deps, {
    maxAttempts,
    alreadySent: false,
    markReminded: false,
  });
}

/** Cửa sổ "bắt kịp" cho push hỏi thăm sức khỏe (phút) — tránh gửi muộn sau khi server downtime dài. */
export const WELLNESS_CATCHUP_MINUTES = 5;

/**
 * Push hỏi thăm sức khỏe: gửi tới chủ hồ sơ sau khi đã xác nhận uống thuốc
 * `WELLNESS_CHECK_AFTER_MINUTES` phút. Mỗi lần uống chỉ gửi một lần
 * (chống trùng theo `(dose_id, kind='wellness_check')`).
 */
export async function notifyDoseWellnessCheck(doseId: string, deps: NotifyDeps): Promise<NotifyOutcome> {
  const ctx = await loadDoseContext(doseId);
  if (!ctx) return { status: 'skipped', reason: 'not_found' };
  const dose = ctx.dose;
  if (dose.status !== 'confirmed') return { status: 'skipped', reason: `status:${dose.status}` };
  if (!dose.confirmed_at) return { status: 'skipped', reason: 'not_confirmed_at' };
  const now = deps.now ?? new Date();
  const dueAt = addMinutes(dose.confirmed_at, env.WELLNESS_CHECK_AFTER_MINUTES);
  if (dueAt.getTime() > now.getTime()) return { status: 'skipped', reason: 'not_due' };
  if (!ctx.medication || ctx.medication.status !== 'active') {
    return { status: 'skipped', reason: 'medication_inactive' };
  }

  const maxAttempts = deps.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const alreadySent =
    (await terminalSent(doseId, 'wellness_check')) ||
    (await attemptCount(doseId, 'wellness_check')) >= maxAttempts;
  if (alreadySent) return { status: 'skipped', reason: 'already_sent' };

  const tokens = await activeTokensForUser(dose.user_id);
  const payload = wellnessCheckPayload(ctx);
  // Lưu vào nhật ký sức khỏe trước khi gửi push: mục vẫn còn để xem/trả lời
  // ngay cả khi thiết bị chưa đăng ký nhận thông báo.
  await HealthLog.updateOne(
    { dose_id: dose.id },
    {
      $setOnInsert: {
        user_id: dose.user_id,
        dose_id: dose.id,
        medication_id: dose.medication_id,
        medication_name: ctx.medication?.name ?? null,
        kind: 'wellness_check',
        scheduled_at: dose.scheduled_at,
        confirmed_at: dose.confirmed_at,
        asked_at: now,
        question: payload.body,
        answer: null,
        answer_note: null,
        answered_at: null,
      },
    },
    { upsert: true },
  );
  return sendPushToTokens(tokens, dose.id, 'wellness_check', payload, deps, {
    maxAttempts,
    alreadySent: false,
    // Không đụng `reminded_at` của liều uống.
    markReminded: false,
  });
}

export interface ProcessResult {
  reminders: number;
  snoozes: number;
  overdue: number;
  relativeAlerts: number;
  wellnessChecks: number;
  scanned: number;
}

/**
 * Job cron (mỗi phút): quét lần uống đến hạn và gửi push.
 * - `pending` trong cửa sổ NOTIFY_WINDOW_MINUTES → nhắc giờ uống
 * - `snoozed` đã tới `snoozed_until` → nhắc lại
 * - `overdue` mới chuyển (trong MISSED_AFTER_MINUTES) → nhắc quá giờ
 * - chưa xác nhận quá `RELATIVE_ALERT_AFTER_MINUTES` → báo người thân có bật `relative_alerts`
 * - `missed` mới chuyển → lưới an toàn: vẫn báo người thân nếu lúc tới ngưỡng server đang tắt
 */
export async function processDueNotifications(deps: NotifyDeps): Promise<ProcessResult> {
  const now = deps.now ?? new Date();
  const windowStart = addMinutes(now, -NOTIFY_WINDOW_MINUTES);
  const overdueStart = addMinutes(now, -MISSED_AFTER_MINUTES);
  const missedStart = addMinutes(now, -(MISSED_AFTER_MINUTES + NOTIFY_WINDOW_MINUTES));
  const alertThreshold = addMinutes(now, -env.RELATIVE_ALERT_AFTER_MINUTES);
  const alertWindowStart = addMinutes(
    now,
    -(env.RELATIVE_ALERT_AFTER_MINUTES + NOTIFY_WINDOW_MINUTES),
  );

  const pendingDue = await DoseOccurrence.find({
    status: 'pending',
    scheduled_at: { $lte: now, $gt: windowStart },
  }).limit(200);

  const snoozedDue = await DoseOccurrence.find({
    status: 'snoozed',
    snoozed_until: { $lte: now, $gt: overdueStart },
  }).limit(200);

  const overdueDue = await DoseOccurrence.find({
    status: 'overdue',
    scheduled_at: { $lte: now, $gt: overdueStart },
  }).limit(200);

  const missedDue = await DoseOccurrence.find({
    status: 'missed',
    scheduled_at: { $lte: overdueStart, $gt: missedStart },
  }).limit(200);

  // Chưa xác nhận quá ngưỡng: mốc tính là giờ nhắc lại cuối (`snoozed_until`) nếu đã nhắc lại.
  const alertOverdueDue = await DoseOccurrence.find({
    status: 'overdue',
    scheduled_at: { $lte: alertThreshold, $gt: alertWindowStart },
  }).limit(200);

  const alertSnoozedDue = await DoseOccurrence.find({
    status: 'snoozed',
    snoozed_until: { $lte: alertThreshold, $gt: alertWindowStart },
  }).limit(200);

  const alertPendingDue = await DoseOccurrence.find({
    status: 'pending',
    scheduled_at: { $lte: alertThreshold, $gt: alertWindowStart },
  }).limit(200);

  // Đã xác nhận đủ lâu → push hỏi thăm sức khỏe (chống trùng theo dose+kind).
  const wellnessThreshold = addMinutes(now, -env.WELLNESS_CHECK_AFTER_MINUTES);
  const wellnessWindowStart = addMinutes(
    now,
    -(env.WELLNESS_CHECK_AFTER_MINUTES + WELLNESS_CATCHUP_MINUTES),
  );
  const wellnessDue = await DoseOccurrence.find({
    status: 'confirmed',
    confirmed_at: { $lte: wellnessThreshold, $gt: wellnessWindowStart },
  }).limit(200);

  let reminders = 0;
  let snoozes = 0;
  let overdue = 0;
  let relativeAlerts = 0;
  let wellnessChecks = 0;

  for (const dose of pendingDue) {
    const r = await notifyDoseReminder(dose.id, deps);
    if (r.status === 'sent') reminders++;
  }
  for (const dose of snoozedDue) {
    const r = await notifyDoseSnooze(dose.id, deps);
    if (r.status === 'sent') snoozes++;
  }
  for (const dose of overdueDue) {
    const r = await notifyDoseOverdue(dose.id, deps);
    if (r.status === 'sent') overdue++;
  }

  // Gộp 3 nhóm "chưa xác nhận quá ngưỡng" rồi báo người thân (chống trùng theo dose+kind).
  const alertCandidates = [...alertPendingDue, ...alertSnoozedDue, ...alertOverdueDue];
  const seenAlertIds = new Set<string>();
  for (const dose of alertCandidates) {
    const id = dose.id as string;
    if (seenAlertIds.has(id)) continue;
    seenAlertIds.add(id);
    const r = await notifyRelativeAlert(id, deps);
    if (r.status === 'sent') relativeAlerts++;
  }
  for (const dose of missedDue) {
    const r = await notifyRelativeAlert(dose.id, deps);
    if (r.status === 'sent') relativeAlerts++;
  }

  for (const dose of wellnessDue) {
    const r = await notifyDoseWellnessCheck(dose.id, deps);
    if (r.status === 'sent') wellnessChecks++;
  }

  return {
    reminders,
    snoozes,
    overdue,
    relativeAlerts,
    wellnessChecks,
    scanned:
      pendingDue.length +
      snoozedDue.length +
      overdueDue.length +
      missedDue.length +
      alertCandidates.length +
      wellnessDue.length,
  };
}
