import { apiFetch } from "./api";
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
  HealthAnswer,
  HealthLogItem,
  HealthLogPage,
  Medication,
  MedicationInput,
  MedicationSchedule,
  MedicationStatus,
  NotificationHistoryPage,
  TodayDoses,
  UserPreferences,
  UserProfile,
  UserRole,
} from "../types";

export function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function query(params: Record<string, string | number | undefined | null>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") searchParams.append(key, String(value));
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export function getProfile(): Promise<UserProfile> {
  return apiFetch<UserProfile>("/users/me");
}

export function syncProfile(input?: {
  displayName?: string;
  phone?: string;
  address?: string;
  timezone?: string;
  dateOfBirth?: string;
}): Promise<UserProfile> {
  return apiFetch<UserProfile>("/users/me/sync", { method: "POST", body: input ?? {} });
}

export function updateProfile(input: {
  displayName?: string;
  phone?: string | null;
  address?: string | null;
  timezone?: string;
  dateOfBirth?: string;
}): Promise<UserProfile> {
  return apiFetch<UserProfile>("/users/me", { method: "PATCH", body: input });
}

export function updateNotificationSettings(input: {
  snoozeMinutes?: number;
  snoozeMax?: number;
}): Promise<{ preferences: UserPreferences | null }> {
  return apiFetch("/users/me/notification-settings", { method: "PATCH", body: input });
}

export function listMedications(status: MedicationStatus, ownerId?: string): Promise<Medication[]> {
  return apiFetch<Medication[]>(`/medications${query({ status, ownerId })}`);
}

export function getMedication(id: string): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`);
}

export function createMedication(input: MedicationInput): Promise<Medication> {
  return apiFetch<Medication>("/medications", { method: "POST", body: input });
}

export interface MedicationUpdate {
  name?: string;
  imageUrl?: string;
  dosageText?: string;
  instructions?: string;
  startDate?: string;
  endDate?: string | null;
}

export function updateMedication(id: string, input: MedicationUpdate): Promise<Medication> {
  return apiFetch<Medication>(`/medications/${id}`, { method: "PATCH", body: input });
}

export function discontinueMedication(
  id: string,
  reason?: string,
): Promise<{ id: string; status: MedicationStatus; removedFutureDoses: number }> {
  return apiFetch(`/medications/${id}/discontinue`, {
    method: "POST",
    body: reason ? { reason } : {},
  });
}

export function addSchedule(
  medicationId: string,
  input: { timeOfDay: string; recurrenceRule?: string; effectiveFrom?: string; effectiveTo?: string | null },
): Promise<MedicationSchedule> {
  return apiFetch<MedicationSchedule>(`/medications/${medicationId}/schedules`, {
    method: "POST",
    body: input,
  });
}

export function removeSchedule(scheduleId: string): Promise<{ id: string; status: string; removedFutureDoses: number }> {
  return apiFetch(`/medications/schedules/${scheduleId}`, { method: "DELETE" });
}

export function updateSchedule(
  scheduleId: string,
  input: { timeOfDay: string; recurrenceRule?: string; effectiveFrom: string; effectiveTo?: string | null },
): Promise<MedicationSchedule & { regeneratedDoses: number }> {
  return apiFetch(`/medications/schedules/${scheduleId}`, { method: "PUT", body: input });
}

export function getTodayDoses(): Promise<TodayDoses> {
  return apiFetch<TodayDoses>("/doses/today");
}

export function getDosesByDate(date: string, ownerId?: string): Promise<DayDoses> {
  return apiFetch<DayDoses>(`/doses${query({ date, ownerId })}`);
}

export function getDose(id: string): Promise<DoseWithMedication> {
  return apiFetch<DoseWithMedication>(`/doses/${id}`);
}

export function confirmDose(id: string, clientRequestId: string): Promise<Dose> {
  return apiFetch<Dose>(`/doses/${id}/confirm`, { method: "POST", body: { clientRequestId } });
}

export function snoozeDose(id: string): Promise<Dose> {
  return apiFetch<Dose>(`/doses/${id}/snooze`, { method: "POST", body: {} });
}

export function cannotTakeDose(id: string, reason: string): Promise<Dose> {
  return apiFetch<Dose>(`/doses/${id}/cannot-take`, { method: "POST", body: { reason } });
}

export function registerDevice(input: {
  fcmToken: string;
  platform: "android" | "ios" | "web";
  userAgent?: string;
}): Promise<{ id: string; platform: string }> {
  return apiFetch("/users/devices/register", { method: "POST", body: input });
}

export function unregisterDevice(fcmToken: string): Promise<{ removed: boolean }> {
  return apiFetch("/users/devices/unregister", { method: "DELETE", body: { fcmToken } });
}

export interface HistoryQuery {
  from?: string;
  to?: string;
  medicationId?: string;
  ownerId?: string;
  page?: number;
  pageSize?: number;
}

export function getHistory(params: HistoryQuery): Promise<HistoryPage> {
  return apiFetch<HistoryPage>(`/history${query({ ...params })}`);
}

export interface HealthLogQuery {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export function getHealthLogs(params: HealthLogQuery = {}): Promise<HealthLogPage> {
  return apiFetch<HealthLogPage>(`/health-logs${query({ ...params })}`);
}

export function answerHealthLog(
  id: string,
  input: { answer: HealthAnswer; note?: string | null },
): Promise<HealthLogItem> {
  return apiFetch<HealthLogItem>(`/health-logs/${id}`, { method: "PATCH", body: input });
}

export function getNotificationHistory(
  params: { page?: number; pageSize?: number } = {},
): Promise<NotificationHistoryPage> {
  return apiFetch<NotificationHistoryPage>(`/notifications${query({ ...params })}`);
}

export function createFamilyInvite(): Promise<FamilyInviteCreated> {
  return apiFetch<FamilyInviteCreated>("/family/invites", { method: "POST", body: {} });
}

export function acceptFamilyInvite(
  code: string,
): Promise<{ id: string; owner: { id: string; displayName: string | null }; permissions: FamilyPermissions }> {
  return apiFetch<{ id: string; owner: { id: string; displayName: string | null }; permissions: FamilyPermissions }>(
    `/family/invites/${code}/accept`,
    { method: "POST", body: {} },
  );
}

export function listFamilyConnections(): Promise<FamilyConnectionItem[]> {
  return apiFetch<FamilyConnectionItem[]>("/family/connections");
}

export function updateFamilyPermissions(
  connectionId: string,
  permissions: { viewSchedule?: boolean; manageMedication?: boolean; relativeAlerts?: boolean },
): Promise<{ id: string; permissions: FamilyPermissions }> {
  return apiFetch(`/family/connections/${connectionId}/permissions`, { method: "PATCH", body: permissions });
}

export function revokeFamilyConnection(connectionId: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/family/connections/${connectionId}`, { method: "DELETE" });
}

export function getAdminSummary(): Promise<AdminSummary> {
  return apiFetch<AdminSummary>("/admin/summary");
}

export function getAdminUsers(params: { q?: string; page?: number; pageSize?: number }): Promise<AdminUserPage> {
  return apiFetch<AdminUserPage>(`/admin/users${query(params)}`);
}

export function setAdminUserDisabled(id: string, disabled: boolean): Promise<{ id: string; disabled: boolean }> {
  return apiFetch(`/admin/users/${id}/status`, { method: "PATCH", body: { disabled } });
}

export function setAdminUserRole(id: string, role: UserRole): Promise<{ id: string; role: UserRole }> {
  return apiFetch(`/admin/users/${id}/role`, { method: "PATCH", body: { role } });
}

export function deleteAdminUser(id: string): Promise<{ id: string; deleted: true }> {
  return apiFetch(`/admin/users/${id}`, { method: "DELETE" });
}

export function getAdminNotifications(limit = 20): Promise<AdminFailedNotification[]> {
  return apiFetch<AdminFailedNotification[]>(`/admin/notifications${query({ limit })}`);
}

export function getAdminAuditLogs(limit = 20): Promise<AdminAuditItem[]> {
  return apiFetch<AdminAuditItem[]>(`/admin/audit-logs${query({ limit })}`);
}
