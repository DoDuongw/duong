/** Kiểu dữ liệu dùng chung — khớp với API_SPEC.md và phản hồi thật của backend */

export type DoseStatus = 'pending' | 'snoozed' | 'confirmed' | 'cannot_take' | 'overdue' | 'missed';

/** Vai trò tài khoản: người dùng · quản lý vận hành · quản trị hệ thống */
export type UserRole = 'user' | 'manager' | 'admin';

export type MedicationStatus = 'active' | 'discontinued';

export type ScheduleStatus = 'active' | 'archived';

/** Tùy chọn người dùng (users.preferences) */
export interface UserPreferences {
  fontScale?: 'sm' | 'md' | 'lg';
  /** Số phút chờ nhắc lại (M08) — backend tuân theo khi snooze */
  snoozeMinutes?: number;
  /** Số lần nhắc lại tối đa cho một lần uống (M08) */
  snoozeMax?: number;
  [key: string]: unknown;
}

/** GET /users/me · POST /users/me/sync — backend không trả email (Firebase giữ) */
export interface UserProfile {
  id: string;
  phone: string | null;
  displayName: string | null;
  /** Thông tin hồ sơ (M08) — địa chỉ liên hệ, có thể null */
  address: string | null;
  timezone: string;
  preferences: UserPreferences | null;
  /** 'manager' = quản lý vận hành; 'admin' = quản trị (thấy khu /admin); backend luôn trả về */
  role?: UserRole;
}

export interface MedicationSchedule {
  id: string;
  medicationId: string;
  timeOfDay: string; // HH:mm:ss
  recurrenceRule: string;
  effectiveFrom: string; // yyyy-mm-dd
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
  startDate: string; // yyyy-mm-dd
  endDate?: string | null;
  status: MedicationStatus;
  /** Có ở GET /medications, GET /medications/:id — không có ở POST/PATCH */
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

/** Một lần uống (dose_occurrences) */
export interface Dose {
  id: string;
  scheduleId: string;
  medicationId: string;
  scheduledAt: string; // ISO UTC
  status: DoseStatus;
  confirmedAt: string | null;
  isLateConfirmation: boolean;
  cannotTakeReason: string | null;
  snoozedUntil: string | null;
  snoozeCount: number;
}

/** Dose kèm thông tin thuốc — GET /doses, /doses/today, /doses/:id */
export interface DoseWithMedication extends Dose {
  medicationName: string | null;
  dosageText?: string | null;
  instructions?: string | null;
  /** Chỉ có ở GET /doses/:id — false khi người xem là người thân (chỉ xem, không hành động) */
  canAct?: boolean;
  /** Chỉ có ở GET /doses/:id — múi giờ của chủ hồ sơ (người thân xem hộ) */
  timezone?: string;
}

export interface TodayDoses {
  date: string; // yyyy-mm-dd theo múi giờ người dùng
  doses: DoseWithMedication[];
  stats: { confirmed: number; remaining: number; total: number };
}

export interface DayDoses {
  date: string;
  doses: DoseWithMedication[];
}

/** GET /history — thêm giờ gửi nhắc */
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

/** Phản hồi thống nhất từ backend: { success, data?, error? { code, message } } */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: { code: string; message: string };
}

/* ---------- Người thân (M07) ---------- */

/** Quyền của một kết nối — backend trả về dạng snake_case (family_connections.permissions) */
export interface FamilyPermissions {
  view_schedule: boolean;
  manage_medication: boolean;
  /** Người thân nhận thông báo khi chủ hồ sơ bỏ lỡ thuốc (NOTIFICATION_PLAN §3.4) */
  relative_alerts: boolean;
}

export interface FamilyConnectionItem {
  id: string;
  /** Vai trò của người đang đăng nhập trong kết nối này */
  role: 'owner' | 'relative';
  user: { id: string; displayName: string | null; phone: string | null; timezone: string | null };
  permissions: FamilyPermissions;
  connectedAt: string;
}

export interface FamilyInviteCreated {
  code: string;
  expiresAt: string;
}

/* ---------- Khu vực vận hành (role='manager' hoặc 'admin') ---------- */

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
  /** Nhãn tiếng Việt do API trả về. */
  error: string;
  /** Mã gốc trong notification_logs — dùng để đối chiếu kỹ thuật. */
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
