import { apiFetch } from './api';
import type {
  AdminAuditItem,
  AdminFailedNotification,
  AdminSummary,
  AdminUserPage,
  DayDoses,
  Dose,
  DoseWithMedication,
  FamilyConnectionItem,
  FamilyInviteCreated,
  FamilyPermissions,
  HistoryPage,
  Medication,
  MedicationInput,
  MedicationSchedule,
  MedicationStatus,
  TodayDoses,
  UserPreferences,
  UserProfile,
} from '../types';

/** Sinh id chống trùng cho xác nhận (idempotency) — ưu tiên crypto.randomUUID */
export function newClientRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Dự phòng khi môi trường cũ không có crypto.randomUUID (vẫn đủ dài để qua validation 8–64 ký tự)
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Bỏ các query rỗng/undefined để URL gọn */
function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/* ---------- Người dùng ---------- */

export function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me');
}

export function syncProfile(input?: {
  displayName?: string;
  phone?: string;
  address?: string;
  timezone?: string;
}): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me/sync', { method: 'POST', body: input ?? {} });
}

/** PATCH /users/me — đổi tên hiển thị / SĐT / địa chỉ / múi giờ (M08) */
export function updateProfile(input: {
  displayName?: string;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
}): Promise<UserProfile> {
  return apiFetch<UserProfile>('/users/me', { method: 'PATCH', body: input });
}

/** PATCH /users/me/notification-settings — cài đặt nhắc lại (M08) */
export function updateNotificationSettings(input: {
  snoozeMinutes?: number;
  snoozeMax?: number;
}): Promise<{ preferences: UserPreferences | null }> {
  return apiFetch('/users/me/notification-settings', { method: 'PATCH', body: input });
}

/* ---------- Thuốc ---------- */

/** `ownerId` (tuỳ chọn) = xem thuốc của chủ hồ sơ đã kết nối (M03/M04 — vai trò người thân) */
export function listMedications(status: MedicationStatus, ownerId?: string): Promise<Medication[]> {
  return apiFetch<Medication[]>(`/medications${query({ status, ownerId })}`);
}

export function getMedication(id: string): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`);
}

export function createMedication(input: MedicationInput): Promise<Medication> {
  return apiFetch<Medication>('/medications', { method: 'POST', body: input });
}

export interface MedicationUpdate {
  name?: string;
  imageUrl?: string;
  dosageText?: string;
  instructions?: string;
  startDate?: string;
  /** null = xóa hạn kết thúc */
  endDate?: string | null;
}

export function updateMedication(id: string, input: MedicationUpdate): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`, { method: 'PATCH', body: input });
}

export function discontinueMedication(
  id: string,
  reason?: string,
): Promise<{ id: string; status: MedicationStatus; removedFutureDoses: number }> {
  return apiFetch(`/medications/${id}/discontinue`, {
    method: 'POST',
    body: reason ? { reason } : {},
  });
}

export function addSchedule(
  medicationId: string,
  input: { timeOfDay: string; recurrenceRule?: string; effectiveFrom?: string; effectiveTo?: string | null },
): Promise<MedicationSchedule> {
  return apiFetch<MedicationSchedule>(`/medications/${medicationId}/schedules`, {
    method: 'POST',
    body: input,
  });
}

export function removeSchedule(
  scheduleId: string,
): Promise<{ id: string; status: string; removedFutureDoses: number }> {
  return apiFetch(`/medications/schedules/${scheduleId}`, { method: 'DELETE' });
}

export function updateSchedule(
  scheduleId: string,
  input: { timeOfDay: string; recurrenceRule?: string; effectiveFrom: string; effectiveTo?: string | null },
): Promise<MedicationSchedule & { regeneratedDoses: number }> {
  return apiFetch(`/medications/schedules/${scheduleId}`, { method: 'PUT', body: input });
}

/* ---------- Lần uống ---------- */

export function getTodayDoses(): Promise<TodayDoses> {
  return apiFetch<TodayDoses>('/doses/today');
}

/** `ownerId` (tuỳ chọn) = xem lịch của chủ hồ sơ đã kết nối (M03 — vai trò người thân) */
export function getDosesByDate(date: string, ownerId?: string): Promise<DayDoses> {
  return apiFetch<DayDoses>(`/doses${query({ date, ownerId })}`);
}

export function getDose(id: string): Promise<DoseWithMedication> {
  return apiFetch<DoseWithMedication>(`/doses/${id}`);
}

export function confirmDose(id: string, clientRequestId: string): Promise<Dose> {
  return apiFetch<Dose>(`/doses/${id}/confirm`, { method: 'POST', body: { clientRequestId } });
}

export function snoozeDose(id: string): Promise<Dose> {
  return apiFetch<Dose>(`/doses/${id}/snooze`, { method: 'POST', body: {} });
}

export function cannotTakeDose(id: string, reason: string): Promise<Dose> {
  return apiFetch<Dose>(`/doses/${id}/cannot-take`, { method: 'POST', body: { reason } });
}

/* ---------- Thiết bị và Web Push ---------- */

export function registerDevice(input: {
  fcmToken: string;
  platform: 'web';
  userAgent?: string;
}): Promise<{ id: string; platform: string }> {
  return apiFetch('/users/devices/register', { method: 'POST', body: input });
}

export function unregisterDevice(fcmToken: string): Promise<{ removed: boolean }> {
  return apiFetch('/users/devices/unregister', { method: 'DELETE', body: { fcmToken } });
}

/* ---------- Lịch sử ---------- */

export interface HistoryQuery {
  from?: string;
  to?: string;
  medicationId?: string;
  page?: number;
  pageSize?: number;
}

export function getHistory(params: HistoryQuery): Promise<HistoryPage> {
  return apiFetch<HistoryPage>(`/history${query({ ...params })}`);
}

/* ---------- Người thân (M07) ---------- */

export function createFamilyInvite(): Promise<FamilyInviteCreated> {
  return apiFetch<FamilyInviteCreated>('/family/invites', { method: 'POST', body: {} });
}

export function acceptFamilyInvite(
  code: string,
): Promise<{ id: string; owner: { id: string; displayName: string | null }; permissions: FamilyPermissions }> {
  return apiFetch(`/family/invites/${code}/accept`, { method: 'POST', body: {} });
}

export function listFamilyConnections(): Promise<FamilyConnectionItem[]> {
  return apiFetch<FamilyConnectionItem[]>('/family/connections');
}

export function updateFamilyPermissions(
  connectionId: string,
  permissions: { viewSchedule?: boolean; manageMedication?: boolean; relativeAlerts?: boolean },
): Promise<{ id: string; permissions: FamilyPermissions }> {
  return apiFetch(`/family/connections/${connectionId}/permissions`, { method: 'PATCH', body: permissions });
}

export function revokeFamilyConnection(connectionId: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/family/connections/${connectionId}`, { method: 'DELETE' });
}

/* ---------- Quản trị (chỉ role='admin') ---------- */

export function getAdminSummary(): Promise<AdminSummary> {
  return apiFetch<AdminSummary>('/admin/summary');
}

export function getAdminUsers(params: { q?: string; page?: number; pageSize?: number }): Promise<AdminUserPage> {
  return apiFetch<AdminUserPage>(`/admin/users${query(params)}`);
}

export function setAdminUserDisabled(id: string, disabled: boolean): Promise<{ id: string; disabled: boolean }> {
  return apiFetch(`/admin/users/${id}/status`, { method: 'PATCH', body: { disabled } });
}

export function adminResetPassword(id: string, password: string): Promise<{ id: string; reset: true }> {
  return apiFetch(`/admin/users/${id}/reset-password`, { method: 'POST', body: { password } });
}

export function getAdminNotifications(limit = 20): Promise<AdminFailedNotification[]> {
  return apiFetch<AdminFailedNotification[]>(`/admin/notifications${query({ limit })}`);
}

export function getAdminAuditLogs(limit = 20): Promise<AdminAuditItem[]> {
  return apiFetch<AdminAuditItem[]>(`/admin/audit-logs${query({ limit })}`);
}
