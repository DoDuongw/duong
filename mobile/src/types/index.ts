export type DoseStatus = 'pending' | 'snoozed' | 'confirmed' | 'cannot_take' | 'overdue' | 'missed';

export type UserRole = 'user' | 'manager' | 'admin';

export type MedicationStatus = 'active' | 'discontinued';

export type ScheduleStatus = 'active' | 'archived';

export interface UserPreferences {
  fontScale?: 'sm' | 'md' | 'lg';
  snoozeMinutes?: number;
  snoozeMax?: number;
  [key: string]: unknown;
}

export interface UserProfile {
  id: string;
  phone: string | null;
  displayName: string | null;
  address: string | null;
  timezone: string;
  preferences: UserPreferences | null;
  role?: UserRole;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  timeOfDay: string;
  recurrenceRule: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: ScheduleStatus;
  currentVersion: number;
}

export interface Medication {
  id: string;
  name: string;
  imageUrl?: string | null;
  dosageText?: string | null;
  instructions?: string | null;
  startDate: string;
  endDate?: string | null;
  status: MedicationStatus;
  schedules?: MedicationSchedule[];
}

export interface MedicationInput {
  name: string;
  imageUrl?: string;
  dosageText?: string;
  instructions?: string;
  startDate: string;
  endDate?: string;
  schedules?: { timeOfDay: string; recurrenceRule?: string }[];
}

export interface Dose {
  id: string;
  scheduleId: string;
  medicationId: string;
  scheduledAt: string;
  status: DoseStatus;
  confirmedAt: string | null;
  isLateConfirmation: boolean;
  cannotTakeReason: string | null;
  snoozedUntil: string | null;
  snoozeCount: number;
}

export interface DoseWithMedication extends Dose {
  medicationName: string | null;
  dosageText?: string | null;
  instructions?: string | null;
  canAct?: boolean;
  timezone?: string;
}

export interface TodayDoses {
  date: string;
  doses: DoseWithMedication[];
  stats: { confirmed: number; remaining: number; total: number };
}

export interface DayDoses {
  date: string;
  doses: DoseWithMedication[];
}

export interface HistoryItem extends Dose {
  medicationName: string | null;
  remindedAt: string | null;
}

export interface HistoryPage {
  items: HistoryItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string };
}

export interface FamilyPermissions {
  view_schedule: boolean;
  manage_medication: boolean;
  relative_alerts: boolean;
}

export interface FamilyConnectionItem {
  id: string;
  role: 'owner' | 'relative';
  user: { id: string; displayName: string | null; phone: string | null; timezone: string | null };
  permissions: FamilyPermissions;
  connectedAt: string;
}

export interface FamilyInviteCreated {
  code: string;
  expiresAt: string;
}

export interface AdminSummary {
  users: number;
  disabledUsers: number;
  activeMedications: number;
  doses24h: number;
  confirmed24h: number;
  activeConnections: number;
  activeDevices: number;
  failedNotifications24h: number;
}

export interface AdminUserItem {
  id: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  emailVerified: boolean;
  role: UserRole;
  disabled: boolean;
  timezone: string;
  createdAt: string;
  medicationsActive: number;
  doses7d: number;
  confirmed7d: number;
  devicesActive: number;
}

export interface AdminUserPage {
  items: AdminUserItem[];
  page: number;
  pageSize: number;
  total: number;
}

export interface AdminFailedNotification {
  id: string;
  kind: string;
  channel: string;
  sentAt: string;
  error: string;
  errorCode: string | null;
  doseId: string;
}

export interface AdminAuditItem {
  id: string;
  action: string;
  entity: string;
  entityId: string;
  actorName: string | null;
  actorPhone: string | null;
  createdAt: string;
  details: Record<string, unknown> | null;
}
