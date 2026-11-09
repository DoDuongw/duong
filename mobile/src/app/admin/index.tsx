import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentProps, ReactNode } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Modal,
  Pressable,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, StateView, Input, Notice, Text } from "../../components";
import { colors, spacing, typography, radius } from "../../theme";
import { useAuth } from "../../hooks/useAuth";
import {
  deleteAdminUser,
  getAdminAuditLogs,
  getAdminNotifications,
  getAdminSummary,
  getAdminUsers,
  setAdminUserDisabled,
  setAdminUserRole,
} from "../../services/endpoints";
import type {
  AdminAuditItem,
  AdminFailedNotification,
  AdminSummary,
  AdminUserItem,
  AdminUserPage,
  UserRole,
} from "../../types";
import { formatTimezoneLabel } from "../../utils/dateTime";

/* ------------------------------------------------------------------ */
/* Hằng số & nhãn                                                      */
/* ------------------------------------------------------------------ */

const PAGE_SIZE = 10;
/** Ngưỡng tuân thủ: từ 80% là tốt, dưới 50% là cần liên hệ. */
const ADHERENCE_GOOD = 0.8;
const ADHERENCE_LOW = 0.5;
/** Cần tối thiểu bấy nhiêu liều trong 7 ngày thì mới cảnh báo tuân thủ thấp. */
const MIN_DOSES_FOR_FLAG = 3;

type IconName = ComponentProps<typeof Ionicons>["name"];
type Tone = "primary" | "success" | "warning" | "danger" | "neutral";
type TabKey = "overview" | "users" | "alerts" | "audit";
type UserFilter = "all" | "active" | "locked" | "staff" | "lowAdherence";

const KIND_LABEL: Record<string, string> = {
  scheduled_reminder: "Nhắc uống thuốc",
  overdue: "Quá giờ",
  snooze: "Nhắc lại",
  relative_alert: "Báo người thân",
  sync: "Đồng bộ",
};

const ACTION_LABEL: Record<string, string> = {
  admin_lock: "Khóa tài khoản",
  admin_unlock: "Mở khóa tài khoản",
  admin_reset_password: "Đặt lại mật khẩu (lịch sử)",
  admin_set_role: "Đổi vai trò",
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xóa",
  revoke: "Thu hồi",
  discontinue: "Ngừng thuốc",
  confirm: "Xác nhận uống",
  cannot_take: "Không thể uống",
  snooze: "Nhắc lại",
  accept_invite: "Chấp nhận lời mời",
  update_permissions: "Đổi quyền xem",
  archive: "Lưu trữ lịch",
  update_version: "Đổi lịch uống",
};

const ACTION_TONE: Record<string, Tone> = {
  admin_lock: "danger",
  delete: "danger",
  revoke: "danger",
  discontinue: "danger",
  cannot_take: "danger",
  admin_unlock: "success",
  confirm: "success",
  accept_invite: "success",
  admin_set_role: "warning",
  update_permissions: "warning",
  admin_reset_password: "warning",
};

const ENTITY_LABEL: Record<string, string> = {
  user: "Tài khoản",
  dose: "Lần uống thuốc",
  invite: "Lời mời kết nối",
  connection: "Kết nối người thân",
  medication: "Thuốc",
  schedule: "Lịch uống thuốc",
};

const ROLE_LABEL: Record<UserRole, string> = {
  user: "Người dùng",
  manager: "Quản lý",
  admin: "Quản trị",
};

const ROLE_DESC: Record<UserRole, string> = {
  user: "Dùng ứng dụng nhắc thuốc bình thường, không vào được khu vực này.",
  manager: "Xem số liệu, khóa/mở tài khoản người dùng. Không thấy nội dung y tế chi tiết.",
  admin: "Toàn quyền khu vực này: đổi vai trò, xóa tài khoản, xử lý tài khoản quản lý.",
};

const NOTIFICATION_ERROR_LABEL: Record<string, string> = {
  no_active_device: "Thiết bị hiện không hoạt động",
  token_invalid: "Mã nhận thông báo không còn hiệu lực",
  send_failed: "Gửi thông báo thất bại",
  FIREBASE_NOT_CONFIGURED: "Chưa cấu hình dịch vụ gửi thông báo",
  "messaging/registration-token-not-registered": "Thiết bị đã hủy đăng ký nhận thông báo",
  "messaging/invalid-registration-token": "Mã nhận thông báo không hợp lệ",
  "messaging/invalid-argument": "Thông tin gửi thông báo không hợp lệ",
  "messaging/authentication-error": "Dịch vụ thông báo từ chối xác thực",
  "messaging/third-party-auth-error": "Dịch vụ thông báo gặp lỗi xác thực",
  "messaging/internal-error": "Dịch vụ thông báo gặp lỗi nội bộ",
  "messaging/server-unavailable": "Dịch vụ thông báo tạm thời không khả dụng",
  "messaging/message-rate-exceeded": "Gửi thông báo quá nhanh, vui lòng thử lại",
  "messaging/device-message-rate-exceeded": "Thiết bị nhận quá nhiều thông báo",
};

/** Gợi ý cách xử lý cho từng nguyên nhân phổ biến. */
const NOTIFICATION_ERROR_HINT: Record<string, string> = {
  no_active_device: "Người dùng chưa mở ứng dụng gần đây. Liên hệ để họ đăng nhập lại.",
  token_invalid: "Thiết bị cần mở ứng dụng để cấp lại mã nhận thông báo.",
  FIREBASE_NOT_CONFIGURED: "Kiểm tra khóa dịch vụ Firebase trên máy chủ.",
  "messaging/registration-token-not-registered": "Ứng dụng đã bị gỡ hoặc người dùng đã tắt thông báo.",
  "messaging/invalid-registration-token": "Thiết bị cần mở ứng dụng để đăng ký lại.",
  "messaging/authentication-error": "Kiểm tra khóa dịch vụ Firebase trên máy chủ.",
  "messaging/third-party-auth-error": "Kiểm tra cấu hình APNs/FCM trong Firebase.",
  "messaging/server-unavailable": "Thường tự hết sau vài phút. Theo dõi thêm.",
  "messaging/message-rate-exceeded": "Giãn tần suất gửi hoặc gom thông báo.",
};

/* ------------------------------------------------------------------ */
/* Hàm tiện ích                                                        */
/* ------------------------------------------------------------------ */

function notificationCode(item: Pick<AdminFailedNotification, "error" | "errorCode">): string | null {
  return item.errorCode ?? item.error ?? null;
}

function notificationErrorLabel(item: Pick<AdminFailedNotification, "error" | "errorCode">): string {
  const code = notificationCode(item);
  if (!code) return "Không rõ nguyên nhân";
  if (NOTIFICATION_ERROR_LABEL[code]) return NOTIFICATION_ERROR_LABEL[code];
  if (item.error && (item.error !== code || /\s/.test(item.error))) return item.error;
  if (code.startsWith("messaging/")) return "Dịch vụ thông báo gặp lỗi. Kiểm tra cấu hình.";
  return "Gửi thông báo thất bại. Kiểm tra thiết bị và cấu hình.";
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Không rõ ngày";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(date, today)) return "Hôm nay";
  if (same(date, yesterday)) return "Hôm qua";
  return date.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" });
}

function displayName(user: Pick<AdminUserItem, "displayName" | "phone" | "id">): string {
  return user.displayName?.trim() || user.phone || `Người dùng ${user.id.slice(-6)}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function errorMessage(err: any): string {
  if (err?.status === 403) return "Tài khoản của bạn không có quyền thực hiện thao tác này.";
  return err?.message || "Không tải được dữ liệu. Kiểm tra kết nối mạng rồi thử lại.";
}

function ratio(part: number, total: number): number | null {
  return total > 0 ? Math.min(1, part / total) : null;
}

function percent(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function adherenceTone(rate: number | null): Tone {
  if (rate === null) return "neutral";
  if (rate >= ADHERENCE_GOOD) return "success";
  if (rate >= ADHERENCE_LOW) return "warning";
  return "danger";
}

function isLowAdherence(u: AdminUserItem): boolean {
  const rate = ratio(u.confirmed7d, u.doses7d);
  return rate !== null && u.doses7d >= MIN_DOSES_FOR_FLAG && rate < ADHERENCE_LOW;
}

function toneColors(tone: Tone) {
  switch (tone) {
    case "danger": return { border: "#fecaca", bg: "#fff5f5", value: "#b91c1c", solid: "#dc2626" };
    case "warning": return { border: "#fde68a", bg: "#fffbeb", value: "#92400e", solid: "#d97706" };
    case "success": return { border: "#bbf7d0", bg: "#f0fdf4", value: "#166534", solid: "#16a34a" };
    case "primary": return { border: "#bfdbfe", bg: "#eff6ff", value: colors.primaryDark ?? colors.primary, solid: colors.primary };
    default: return { border: colors.border, bg: colors.surface2, value: colors.text, solid: colors.muted };
  }
}

/* ------------------------------------------------------------------ */
/* Màn hình chính                                                      */
/* ------------------------------------------------------------------ */

export default function AdminScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const isDesktop = screenWidth >= 1100;
  const isTablet = screenWidth >= 700 && screenWidth < 1100;
  const isWide = screenWidth >= 900;
  const groupWidth = isDesktop ? "31.5%" : isTablet ? "48%" : "100%";
  const userCardWidth = isDesktop || isTablet ? "48.5%" : "100%";
  const metricWidth = "47%";

  const { profile } = useAuth();
  const role = (profile as any)?.role as UserRole | undefined;
  const selfId = (profile as any)?.id as string | undefined;
  const isAdmin = role === "admin";
  const canAccess = role === "admin" || role === "manager";

  const [tab, setTab] = useState<TabKey>("overview");

  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [users, setUsers] = useState<AdminUserPage | null>(null);
  const [notifications, setNotifications] = useState<AdminFailedNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [sortLowFirst, setSortLowFirst] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [auditFilter, setAuditFilter] = useState<string>("all");

  const [busy, setBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [lockTarget, setLockTarget] = useState<AdminUserItem | null>(null);
  const [roleTarget, setRoleTarget] = useState<AdminUserItem | null>(null);
  const [nextRole, setNextRole] = useState<UserRole>("user");
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  /* ---------------------------- Tải dữ liệu ---------------------------- */

  const loadOverview = useCallback(async () => {
    const results = await Promise.allSettled([
      getAdminSummary(),
      getAdminNotifications(20),
      getAdminAuditLogs(20),
    ]);
    if (results[0].status === "fulfilled") setSummary(results[0].value);
    if (results[1].status === "fulfilled") setNotifications(results[1].value);
    if (results[2].status === "fulfilled") setAuditLogs(results[2].value);
    if (results.every((r) => r.status === "rejected")) {
      setError(errorMessage((results[0] as PromiseRejectedResult).reason));
    } else {
      setLastUpdated(new Date());
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      setUsers(await getAdminUsers({ q: q || undefined, page, pageSize: PAGE_SIZE }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoadingUsers(false);
    }
  }, [q, page]);

  const reloadAll = useCallback(async () => {
    setError(null);
    await Promise.allSettled([loadOverview(), loadUsers()]);
    setRefreshing(false);
  }, [loadOverview, loadUsers]);

  useEffect(() => {
    if (!canAccess) return;
    setLoading(true);
    void loadOverview().finally(() => setLoading(false));
  }, [canAccess, loadOverview]);

  useEffect(() => {
    if (canAccess) void loadUsers();
  }, [canAccess, loadUsers]);

  /* ----------------------------- Số liệu suy ra ----------------------------- */

  const adherence24 = summary ? ratio(summary.confirmed24h, summary.doses24h) : null;
  const unconfirmed24 = summary ? Math.max(0, summary.doses24h - summary.confirmed24h) : 0;
  const activeUsers = summary ? Math.max(0, summary.users - summary.disabledUsers) : 0;

  const attentionItems = useMemo(() => {
    const items: { key: string; tone: Tone; text: string; tab: TabKey; filter?: UserFilter }[] = [];
    if (!summary) return items;
    if (summary.disabledUsers > 0)
      items.push({ key: "locked", tone: "warning", text: `${summary.disabledUsers} tài khoản đang bị khóa`, tab: "users", filter: "locked" });
    if (unconfirmed24 > 0)
      items.push({ key: "unconfirmed", tone: adherence24 !== null && adherence24 < ADHERENCE_LOW ? "danger" : "warning", text: `${unconfirmed24} liều chưa hoặc không được xác nhận (24 giờ)`, tab: "users", filter: "lowAdherence" });
    if (summary.failedNotifications24h > 0)
      items.push({ key: "notif", tone: "danger", text: `${summary.failedNotifications24h} lần gửi thông báo thất bại (24 giờ)`, tab: "alerts" });
    return items;
  }, [summary, unconfirmed24, adherence24]);

  const filterCounts = useMemo(() => {
    const items = users?.items ?? [];
    return {
      all: items.length,
      active: items.filter((u) => !u.disabled).length,
      locked: items.filter((u) => u.disabled).length,
      staff: items.filter((u) => u.role !== "user").length,
      lowAdherence: items.filter(isLowAdherence).length,
    } as Record<UserFilter, number>;
  }, [users]);

  const visibleUsers = useMemo(() => {
    let items = users?.items ?? [];
    items = items.filter((u) => {
      switch (userFilter) {
        case "active": return !u.disabled;
        case "locked": return u.disabled;
        case "staff": return u.role !== "user";
        case "lowAdherence": return isLowAdherence(u);
        default: return true;
      }
    });
    if (sortLowFirst) {
      items = [...items].sort(
        (a, b) => (ratio(a.confirmed7d, a.doses7d) ?? 2) - (ratio(b.confirmed7d, b.doses7d) ?? 2)
      );
    }
    return items;
  }, [users, userFilter, sortLowFirst]);

  const causeGroups = useMemo(() => {
    const map = new Map<string, { label: string; hint?: string; count: number }>();
    for (const item of notifications) {
      const label = notificationErrorLabel(item);
      const code = notificationCode(item);
      const entry = map.get(label);
      if (entry) entry.count += 1;
      else map.set(label, { label, hint: code ? NOTIFICATION_ERROR_HINT[code] : undefined, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [notifications]);

  const kindGroups = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of notifications) {
      const label = KIND_LABEL[item.kind] ?? "Thông báo";
      map.set(label, (map.get(label) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [notifications]);

  const auditEntities = useMemo(
    () => Array.from(new Set(auditLogs.map((i) => i.entity))),
    [auditLogs]
  );

  const auditGroups = useMemo(() => {
    const filtered = auditFilter === "all" ? auditLogs : auditLogs.filter((i) => i.entity === auditFilter);
    const map = new Map<string, AdminAuditItem[]>();
    for (const item of filtered) {
      const key = dayLabel(item.createdAt);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return Array.from(map.entries());
  }, [auditLogs, auditFilter]);

  /* ------------------------------ Hành động ------------------------------ */

  function refreshNow() {
    setRefreshing(true);
    void reloadAll();
  }

  function submitSearch() {
    setNotice(null);
    setError(null);
    setPage(1);
    setQ(searchInput.trim());
  }

  function clearSearch() {
    setSearchInput("");
    setQ("");
    setPage(1);
  }

  function jumpTo(target: TabKey, filter?: UserFilter) {
    setTab(target);
    if (filter) setUserFilter(filter);
  }

  function openLock(u: AdminUserItem) {
    setModalError(null);
    setLockTarget(u);
  }

  function openRole(u: AdminUserItem) {
    setModalError(null);
    setNextRole(u.role);
    setRoleTarget(u);
  }

  function openDelete(u: AdminUserItem) {
    setModalError(null);
    setDeleteConfirm("");
    setDeleteTarget(u);
  }

  async function confirmLock() {
    if (!lockTarget) return;
    setBusy(true); setModalError(null); setNotice(null);
    try {
      const nextDisabled = !lockTarget.disabled;
      await setAdminUserDisabled(lockTarget.id, nextDisabled);
      setNotice(nextDisabled ? `Đã khóa tài khoản ${displayName(lockTarget)}.` : `Đã mở khóa tài khoản ${displayName(lockTarget)}.`);
      setLockTarget(null);
      await reloadAll();
    } catch (err) { setModalError(errorMessage(err)); } finally { setBusy(false); }
  }

  async function submitRole() {
    if (!roleTarget) return;
    setBusy(true); setModalError(null); setNotice(null);
    try {
      await setAdminUserRole(roleTarget.id, nextRole);
      setNotice(`Đã đổi vai trò của ${displayName(roleTarget)} thành “${ROLE_LABEL[nextRole]}”.`);
      setRoleTarget(null);
      await reloadAll();
    } catch (err) { setModalError(errorMessage(err)); } finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteConfirm.trim() !== "XÓA") { setModalError("Vui lòng nhập XÓA để xác nhận."); return; }
    setBusy(true); setModalError(null); setNotice(null);
    try {
      await deleteAdminUser(deleteTarget.id);
      setNotice(`Đã xóa vĩnh viễn tài khoản ${displayName(deleteTarget)}.`);
      setDeleteTarget(null); setDeleteConfirm("");
      await reloadAll();
    } catch (err) { setModalError(errorMessage(err)); } finally { setBusy(false); }
  }

  /* ------------------------------ Không có quyền ------------------------------ */

  if (!canAccess) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.scroll}>
          <Text style={styles.pageTitle}>Khu vực vận hành</Text>
          <Notice tone="error"><Text style={{ color: "#991b1b" }}>Tài khoản của bạn không có quyền truy cập khu vực này.</Text></Notice>
          <Button variant="secondary" style={{ marginTop: spacing.sm }} onPress={() => router.replace("/(tabs)" as any)}>
            Về trang chủ
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const totalPages = users ? Math.max(1, Math.ceil(users.total / users.pageSize)) : 1;

  const tabs: { key: TabKey; label: string; icon: IconName; count?: number; tone?: Tone }[] = [
    { key: "overview", label: "Tổng quan", icon: "speedometer-outline" },
    { key: "users", label: "Người dùng", icon: "people-outline", count: users?.total },
    { key: "alerts", label: "Lỗi gửi", icon: "notifications-outline", count: summary?.failedNotifications24h, tone: "danger" },
    { key: "audit", label: "Nhật ký", icon: "document-text-outline" },
  ];

  const filterChips: { key: UserFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Đang hoạt động" },
    { key: "locked", label: "Đã khóa" },
    { key: "staff", label: "Quản lý / Quản trị" },
    { key: "lowAdherence", label: "Tuân thủ thấp" },
  ];

  /* ---------------------------------- Giao diện ---------------------------------- */

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, isWide && styles.scrollWide]}
        stickyHeaderIndices={[1]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshNow} tintColor={colors.primary} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* [0] Đầu trang */}
        <View>
          <TouchableOpacity
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as any))}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.backTap}
            accessibilityRole="button"
            accessibilityLabel="Về trang chủ"
          >
            <Ionicons name="chevron-back" size={20} color={colors.primary} />
            <Text style={styles.backText}>Về trang chủ</Text>
          </TouchableOpacity>

          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 240 }}>
              <View style={styles.titleLine}>
                <Text style={styles.pageTitle}>{isAdmin ? "Quản trị hệ thống" : "Quản lý vận hành"}</Text>
                <Badge text={ROLE_LABEL[role as UserRole]} tone={isAdmin ? "primary" : "warning"} />
              </View>
              <Text style={styles.headerDesc}>
                {isAdmin
                  ? "Theo dõi hệ thống, khóa/mở tài khoản và phân quyền. Quản trị không được đổi mật khẩu người dùng."
                  : "Theo dõi và khóa/mở tài khoản người dùng. Không hiển thị nội dung y tế chi tiết."}
              </Text>
              <Text style={styles.updatedText}>
                {lastUpdated ? `Cập nhật lúc ${formatTime(lastUpdated.toISOString())}` : "Đang tải số liệu…"}
              </Text>
            </View>
            <Button variant="secondary" size="md" loading={refreshing} onPress={refreshNow}>Tải lại</Button>
          </View>
        </View>

        {/* [1] Thanh tab (cố định khi cuộn) */}
        <View style={styles.tabBarWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBar}>
            {tabs.map((t) => {
              const active = tab === t.key;
              const tc = toneColors(t.tone ?? "primary");
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setTab(t.key)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.tab, active && styles.tabActive]}
                >
                  <Ionicons name={t.icon} size={18} color={active ? colors.primary : colors.muted} />
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                  {t.count !== undefined && t.count > 0 ? (
                    <View style={[styles.tabCount, t.tone ? { backgroundColor: tc.bg, borderColor: tc.border } : null]}>
                      <Text style={[styles.tabCountText, t.tone ? { color: tc.value } : null]}>{t.count}</Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Thông báo chung */}
        {error ? <Notice tone="error"><Text style={{ color: "#991b1b", fontSize: 16 }}>{error}</Text></Notice> : null}
        {notice ? <Notice tone="success"><Text style={{ color: "#166534", fontWeight: "700", fontSize: 16 }}>{notice}</Text></Notice> : null}
        {loading && !summary ? <StateView state="loading" /> : null}

        {/* ============================ TỔNG QUAN ============================ */}
        {tab === "overview" && summary ? (
          <View style={styles.stack}>
            <View style={[styles.row, !isWide && styles.rowStack]}>
              <Panel title="Tuân thủ uống thuốc · 24 giờ" icon="checkmark-done-outline" style={{ flex: 1.4 }}>
                {summary.doses24h === 0 ? (
                  <EmptyBox title="Chưa có liều nào trong 24 giờ qua." hint="Khi người dùng có lịch uống thuốc, tỷ lệ xác nhận sẽ hiện ở đây." />
                ) : (
                  <>
                    <View style={styles.heroLine}>
                      <Text style={[styles.heroValue, { color: toneColors(adherenceTone(adherence24)).value }]}>{percent(adherence24)}</Text>
                      <Text style={styles.heroLabel}>{summary.confirmed24h}/{summary.doses24h} liều đã xác nhận</Text>
                    </View>
                    <ProgressBar rate={adherence24} height={12} />
                    <View style={styles.legendRow}>
                      <Legend color={toneColors("success").solid} label={`Đã xác nhận ${summary.confirmed24h}`} />
                      <Legend color={toneColors(unconfirmed24 ? "warning" : "neutral").solid} label={`Chưa/không xác nhận ${unconfirmed24}`} />
                    </View>
                    <Text style={styles.sectionHint}>
                      Từ {Math.round(ADHERENCE_GOOD * 100)}% là tốt, dưới {Math.round(ADHERENCE_LOW * 100)}% cần liên hệ người dùng.
                    </Text>
                  </>
                )}
              </Panel>

              <Panel title="Cần xử lý" icon="alert-circle-outline" style={{ flex: 1 }}>
                {attentionItems.length === 0 ? (
                  <View style={styles.okBox}>
                    <Ionicons name="checkmark-circle" size={22} color={toneColors("success").solid} />
                    <Text style={styles.okText}>24 giờ qua không có cảnh báo nổi bật.</Text>
                  </View>
                ) : (
                  attentionItems.map((a) => {
                    const t = toneColors(a.tone);
                    return (
                      <Pressable key={a.key} onPress={() => jumpTo(a.tab, a.filter)} style={[styles.attentionRow, { backgroundColor: t.bg, borderColor: t.border }]} accessibilityRole="button">
                        <View style={[styles.dot, { backgroundColor: t.solid }]} />
                        <Text style={[styles.attentionText, { color: t.value }]}>{a.text}</Text>
                        <Ionicons name="chevron-forward" size={18} color={t.value} />
                      </Pressable>
                    );
                  })
                )}
              </Panel>
            </View>

            <View style={styles.groupWrap}>
              <Panel title="Tài khoản" icon="people-outline" style={{ width: groupWidth }}>
                <KpiLine icon="person-outline" label="Đã đăng ký" value={summary.users} />
                <KpiLine icon="checkmark-circle-outline" label="Đang hoạt động" value={activeUsers} tone="success" />
                <KpiLine icon="lock-closed-outline" label="Bị khóa" value={summary.disabledUsers} tone={summary.disabledUsers ? "warning" : "neutral"} onPress={summary.disabledUsers ? () => jumpTo("users", "locked") : undefined} />
                <View style={{ marginTop: spacing.xs }}>
                  <ProgressBar rate={summary.users ? activeUsers / summary.users : null} height={6} forceTone="primary" />
                  <Text style={styles.miniCaption}>{summary.users ? Math.round((activeUsers / summary.users) * 100) : 0}% tài khoản đang hoạt động</Text>
                </View>
              </Panel>

              <Panel title="Thuốc & kết nối" icon="medkit-outline" style={{ width: groupWidth }}>
                <KpiLine icon="medkit-outline" label="Thuốc đang dùng" value={summary.activeMedications} />
                <KpiLine icon="people-circle-outline" label="Kết nối người thân" value={summary.activeConnections} />
                <KpiLine icon="time-outline" label="Liều trong 24 giờ" value={summary.doses24h} />
                <KpiLine icon="hourglass-outline" label="Chưa xác nhận" value={unconfirmed24} tone={unconfirmed24 ? "warning" : "neutral"} />
              </Panel>

              <Panel title="Gửi thông báo" icon="notifications-outline" style={{ width: groupWidth }}>
                <KpiLine icon="phone-portrait-outline" label="Thiết bị nhận tin" value={summary.activeDevices} tone="success" />
                <KpiLine icon="warning-outline" label="Lỗi gửi (24 giờ)" value={summary.failedNotifications24h} tone={summary.failedNotifications24h ? "danger" : "success"} onPress={summary.failedNotifications24h ? () => jumpTo("alerts") : undefined} />
                {summary.failedNotifications24h === 0 ? <Text style={styles.miniCaption}>Mọi thông báo đều được gửi thành công.</Text> : <Text style={styles.miniCaption}>Chạm vào dòng lỗi để xem nguyên nhân.</Text>}
              </Panel>
            </View>

            <Panel
              title="Hoạt động gần đây"
              icon="pulse-outline"
              right={auditLogs.length > 4 ? <Button variant="ghost" size="md" onPress={() => setTab("audit")}>Xem tất cả</Button> : undefined}
            >
              {auditLogs.length === 0 ? (
                <EmptyBox title="Chưa có thao tác nào." />
              ) : (
                auditLogs.slice(0, 4).map((item, i, arr) => <AuditRow key={item.id} item={item} last={i === arr.length - 1} />)
              )}
            </Panel>
          </View>
        ) : null}

        {/* ============================ NGƯỜI DÙNG ============================ */}
        {tab === "users" ? (
          <View style={styles.stack}>
            <View style={styles.panel}>
              <Text style={styles.inputLabel}>Tìm người dùng</Text>
              <View style={styles.searchRow}>
                <View style={{ flex: 1 }}>
                  <Input value={searchInput} onChangeText={setSearchInput} placeholder="Tên hoặc số điện thoại, ví dụ: Bà Lan, 0912345678" onSubmitEditing={submitSearch} returnKeyType="search" />
                </View>
                <Button variant="primary" size="md" onPress={submitSearch}>Tìm</Button>
                {q ? <Button variant="ghost" size="md" onPress={clearSearch}>Xóa lọc</Button> : null}
              </View>
              {q ? <Text style={styles.miniCaption}>Đang tìm: “{q}”</Text> : null}

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {filterChips.map((c) => (
                  <Chip
                    key={c.key}
                    label={c.label}
                    count={filterCounts[c.key]}
                    active={userFilter === c.key}
                    onPress={() => setUserFilter(c.key)}
                  />
                ))}
                <Chip label="Tuân thủ thấp lên đầu" icon="swap-vertical-outline" active={sortLowFirst} onPress={() => setSortLowFirst((v) => !v)} />
              </ScrollView>
              <Text style={styles.miniCaption}>
                Bộ lọc và sắp xếp áp dụng cho {users?.items.length ?? 0} người dùng ở trang này. Tuân thủ thấp: dưới {Math.round(ADHERENCE_LOW * 100)}% trong 7 ngày (từ {MIN_DOSES_FOR_FLAG} liều).
              </Text>
            </View>

            {!loadingUsers && users && visibleUsers.length === 0 ? (
              <EmptyBox
                title={users.items.length === 0 ? "Không tìm thấy người dùng phù hợp." : "Không có ai khớp bộ lọc ở trang này."}
                hint={users.items.length === 0 ? "Thử tên khác hoặc số điện thoại đầy đủ." : "Chọn “Tất cả” hoặc chuyển sang trang khác."}
              />
            ) : null}

            <View style={[styles.userGrid, loadingUsers && { opacity: 0.5 }]}>
              {visibleUsers.map((u) => (
                <UserCard
                  key={u.id}
                  u={u}
                  width={userCardWidth}
                  metricWidth={metricWidth}
                  isSelf={u.id === selfId}
                  isAdmin={isAdmin}
                  expanded={expandedId === u.id}
                  onToggle={() => setExpandedId((cur) => (cur === u.id ? null : u.id))}
                  onLock={() => openLock(u)}
                  onRole={() => openRole(u)}
                  onDelete={() => openDelete(u)}
                />
              ))}
            </View>
            {loadingUsers && !users ? <Text style={styles.loadingText}>Đang tải danh sách người dùng…</Text> : null}

            {users && users.items.length > 0 ? (
              <View style={styles.pager}>
                <Button variant="secondary" disabled={page <= 1 || loadingUsers} onPress={() => setPage((p) => Math.max(1, p - 1))} style={styles.pagerBtn}>← Trước</Button>
                <View style={styles.pagerMid}>
                  <Text style={styles.pagerInfo}>Trang {users.page}/{totalPages}</Text>
                  <Text style={styles.pagerSub}>{users.total} người dùng</Text>
                </View>
                <Button variant="secondary" disabled={page >= totalPages || loadingUsers} onPress={() => setPage((p) => p + 1)} style={styles.pagerBtn}>Sau →</Button>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ============================ LỖI GỬI THÔNG BÁO ============================ */}
        {tab === "alerts" ? (
          <View style={styles.stack}>
            {notifications.length === 0 ? (
              <EmptyBox title="Không có lỗi gửi thông báo gần đây." hint="Hệ thống đang gửi thông báo đẩy bình thường." />
            ) : (
              <>
                <View style={[styles.row, !isWide && styles.rowStack]}>
                  <Panel title={`Nguyên nhân phổ biến (${notifications.length} lỗi gần nhất)`} icon="analytics-outline" style={{ flex: 1.4 }}>
                    {causeGroups.map((c) => (
                      <View key={c.label} style={styles.causeRow}>
                        <View style={styles.causeHead}>
                          <Text style={styles.causeLabel}>{c.label}</Text>
                          <Text style={styles.causeCount}>{c.count}</Text>
                        </View>
                        <View style={styles.track}>
                          <View style={[styles.fill, { width: `${Math.round((c.count / notifications.length) * 100)}%`, backgroundColor: toneColors("danger").solid }]} />
                        </View>
                        {c.hint ? <Text style={styles.causeHint}>Cách xử lý: {c.hint}</Text> : null}
                      </View>
                    ))}
                  </Panel>
                  <Panel title="Theo loại thông báo" icon="funnel-outline" style={{ flex: 1 }}>
                    {kindGroups.map(([label, count]) => (
                      <KpiLine key={label} icon="notifications-outline" label={label} value={count} tone="danger" />
                    ))}
                  </Panel>
                </View>

                <Panel title="Danh sách chi tiết" icon="list-outline">
                  {notifications.map((item) => (
                    <View key={item.id} style={styles.logRowError}>
                      <View style={styles.logHead}>
                        <Text style={styles.logTitle}>{KIND_LABEL[item.kind] ?? "Thông báo"}</Text>
                        <Text style={styles.logTime}>{formatDateTime(item.sentAt)}</Text>
                      </View>
                      <Text style={styles.logError}>{notificationErrorLabel(item)}</Text>
                    </View>
                  ))}
                </Panel>
              </>
            )}
          </View>
        ) : null}

        {/* ============================ NHẬT KÝ ============================ */}
        {tab === "audit" ? (
          <View style={styles.stack}>
            <View style={styles.panel}>
              <Text style={styles.sectionHint}>20 thao tác gần nhất. Tên hiển thị là tài khoản bị tác động.</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <Chip label="Tất cả" count={auditLogs.length} active={auditFilter === "all"} onPress={() => setAuditFilter("all")} />
                {auditEntities.map((e) => (
                  <Chip
                    key={e}
                    label={ENTITY_LABEL[e] ?? "Khác"}
                    count={auditLogs.filter((i) => i.entity === e).length}
                    active={auditFilter === e}
                    onPress={() => setAuditFilter(e)}
                  />
                ))}
              </ScrollView>
            </View>

            {auditGroups.length === 0 ? (
              <EmptyBox title="Chưa có thao tác nào." hint="Các thao tác khóa, mở khóa và đổi vai trò sẽ được ghi tại đây." />
            ) : (
              auditGroups.map(([day, items]) => (
                <Panel key={day} title={day} icon="calendar-outline">
                  {items.map((item, i) => <AuditRow key={item.id} item={item} last={i === items.length - 1} />)}
                </Panel>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      {/* ------------------------------ Hộp thoại ------------------------------ */}

      <SimpleModal visible={!!lockTarget} title={lockTarget?.disabled ? "Mở khóa tài khoản?" : "Khóa tài khoản?"} onClose={() => !busy && setLockTarget(null)}>
        <Text style={styles.modalText}>
          {lockTarget
            ? lockTarget.disabled
              ? `${displayName(lockTarget)} sẽ đăng nhập và sử dụng ứng dụng lại bình thường.`
              : `${displayName(lockTarget)} sẽ bị đăng xuất và không thể đăng nhập cho đến khi bạn mở khóa.`
            : ""}
        </Text>
        {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}
        <View style={styles.modalActions}>
          <Button variant="ghost" onPress={() => setLockTarget(null)} disabled={busy} style={styles.actBtn}>Hủy</Button>
          <Button variant={lockTarget?.disabled ? "primary" : "danger"} loading={busy} onPress={confirmLock} style={styles.actBtn}>
            {lockTarget?.disabled ? "Mở khóa" : "Khóa tài khoản"}
          </Button>
        </View>
      </SimpleModal>

      <SimpleModal visible={!!roleTarget} title="Đổi vai trò" onClose={() => !busy && setRoleTarget(null)}>
        <Text style={styles.modalText}>Tài khoản: <Text style={{ fontWeight: "800" }}>{roleTarget ? displayName(roleTarget) : ""}</Text></Text>
        <View style={{ gap: spacing.xs, marginBottom: spacing.sm }}>
          {(["user", "manager", "admin"] as UserRole[]).map((r) => {
            const active = nextRole === r;
            return (
              <TouchableOpacity key={r} style={[styles.roleOption, active && styles.roleOptionActive]} onPress={() => setNextRole(r)} accessibilityRole="radio" accessibilityState={{ selected: active }}>
                <Ionicons name={active ? "radio-button-on" : "radio-button-off"} size={22} color={active ? colors.primary : colors.muted} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roleTitle, active && { color: colors.primaryDark ?? colors.primary }]}>{ROLE_LABEL[r]}</Text>
                  <Text style={styles.roleDesc}>{ROLE_DESC[r]}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}
        <View style={styles.modalActions}>
          <Button variant="ghost" onPress={() => setRoleTarget(null)} disabled={busy} style={styles.actBtn}>Hủy</Button>
          <Button loading={busy} disabled={!roleTarget || nextRole === roleTarget.role} onPress={submitRole} style={styles.actBtn}>Lưu vai trò</Button>
        </View>
      </SimpleModal>

      <SimpleModal visible={!!deleteTarget} title="Xóa vĩnh viễn tài khoản" onClose={() => !busy && setDeleteTarget(null)}>
        <Notice tone="error" icon={false}>
          <Text style={{ color: "#991b1b", fontWeight: "700" }}>Hành động này không thể hoàn tác. Dữ liệu liên quan (thuốc, lịch, lịch sử, thiết bị, kết nối) sẽ bị xóa.</Text>
        </Notice>
        <Text style={styles.modalText}>Tài khoản: <Text style={{ fontWeight: "800" }}>{deleteTarget ? displayName(deleteTarget) : ""}</Text></Text>
        <Text style={styles.inputLabel}>Nhập XÓA để xác nhận</Text>
        <Input value={deleteConfirm} onChangeText={setDeleteConfirm} placeholder="XÓA" autoCapitalize="characters" />
        {modalError ? <Text style={styles.errorText}>{modalError}</Text> : null}
        <View style={styles.modalActions}>
          <Button variant="ghost" onPress={() => setDeleteTarget(null)} disabled={busy} style={styles.actBtn}>Hủy</Button>
          <Button variant="danger" loading={busy} disabled={deleteConfirm.trim() !== "XÓA"} onPress={confirmDelete} style={styles.actBtn}>Xác nhận xóa</Button>
        </View>
      </SimpleModal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Thành phần con                                                      */
/* ------------------------------------------------------------------ */

function Panel({ title, icon, right, children, style }: { title: string; icon?: IconName; right?: ReactNode; children: ReactNode; style?: any }) {
  return (
    <View style={[styles.panel, style]}>
      <View style={styles.panelHead}>
        {icon ? <Ionicons name={icon} size={20} color={colors.primary} /> : null}
        <Text style={styles.panelTitle}>{title}</Text>
        {right}
      </View>
      {children}
    </View>
  );
}

function KpiLine({ icon, label, value, tone = "neutral", onPress }: { icon: IconName; label: string; value: number; tone?: Tone; onPress?: () => void }) {
  const t = toneColors(tone);
  const content = (
    <>
      <View style={[styles.kpiIcon, { backgroundColor: t.bg, borderColor: t.border }]}>
        <Ionicons name={icon} size={16} color={t.solid} />
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color: t.value }]}>{value}</Text>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
    </>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={styles.kpiLine} accessibilityRole="button">{content}</Pressable>
  ) : (
    <View style={styles.kpiLine}>{content}</View>
  );
}

function ProgressBar({ rate, height, forceTone }: { rate: number | null; height: number; forceTone?: Tone }) {
  const t = toneColors(forceTone ?? adherenceTone(rate));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fill, { width: `${Math.round((rate ?? 0) * 100)}%`, backgroundColor: t.solid, borderRadius: height / 2 }]} />
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legend}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function Chip({ label, count, active, onPress, icon }: { label: string; count?: number; active: boolean; onPress: () => void; icon?: IconName }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]}>
      {icon ? <Ionicons name={icon} size={16} color={active ? "#fff" : colors.muted} /> : null}
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
      {count !== undefined ? <Text style={[styles.chipCount, active && styles.chipCountActive]}>{count}</Text> : null}
    </Pressable>
  );
}

function Badge({ text, tone }: { text: string; tone: Tone }) {
  const t = toneColors(tone);
  return (
    <View style={[styles.badge, { backgroundColor: t.bg, borderColor: t.border }]}>
      <Text style={[styles.badgeText, { color: t.value }]}>{text}</Text>
    </View>
  );
}

function EmptyBox({ title, hint }: { title: string; hint?: string }) {
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
    </View>
  );
}

function AuditRow({ item, last }: { item: AdminAuditItem; last: boolean }) {
  const t = toneColors(ACTION_TONE[item.action] ?? "primary");
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineRail}>
        <View style={[styles.dot, { backgroundColor: t.solid, marginTop: 6 }]} />
        {!last ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineBody}>
        <View style={styles.logHead}>
          <Text style={styles.logTitle}>{ACTION_LABEL[item.action] ?? "Thao tác khác"}</Text>
          <Text style={styles.logTime}>{formatTime(item.createdAt)}</Text>
        </View>
        <Text style={styles.logActor}>
          <Text style={{ fontWeight: "700", color: colors.text }}>{item.actorName ?? item.actorPhone ?? "Không rõ"}</Text>
          {` · ${ENTITY_LABEL[item.entity] ?? "Không xác định"}`}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function Metric({ label, value, width }: { label: string; value: number; width: string }) {
  return (
    <View style={[styles.metric, { width: width as any }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function UserCard({
  u, width, metricWidth, isSelf, isAdmin, expanded, onToggle, onLock, onRole, onDelete,
}: {
  u: AdminUserItem; width: string; metricWidth: string; isSelf: boolean; isAdmin: boolean; expanded: boolean;
  onToggle: () => void; onLock: () => void; onRole: () => void; onDelete: () => void;
}) {
  const name = displayName(u);
  const canLock = isAdmin ? !isSelf : u.role === "user";
  const rate = ratio(u.confirmed7d, u.doses7d);
  const rateTone = adherenceTone(rate);
  const low = isLowAdherence(u);

  return (
    <View style={[styles.userCard, { width: width as any }, u.disabled && styles.userCardLocked]}>
      <Pressable onPress={onToggle} accessibilityRole="button" accessibilityState={{ expanded }} accessibilityLabel={`Chi tiết ${name}`}>
        <View style={styles.userTop}>
          <View style={[styles.avatar, u.disabled && { backgroundColor: toneColors("danger").bg, borderColor: toneColors("danger").border }]}>
            <Text style={[styles.avatarText, u.disabled && { color: toneColors("danger").value }]}>{initials(name)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.userName}>{name}</Text>
            <Text style={styles.userContact}>{u.phone ?? "Chưa có SĐT"}</Text>
          </View>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color={colors.muted} />
        </View>

        <View style={styles.badgeRow}>
          <Badge text={ROLE_LABEL[u.role]} tone={u.role === "admin" ? "primary" : u.role === "manager" ? "warning" : "neutral"} />
          <Badge text={u.disabled ? "Đã khóa" : "Đang hoạt động"} tone={u.disabled ? "danger" : "success"} />
          {u.email && !u.emailVerified ? <Badge text="Chưa xác minh email" tone="warning" /> : null}
          {low ? <Badge text="Tuân thủ thấp" tone="danger" /> : null}
          {isSelf ? <Badge text="Tài khoản của bạn" tone="primary" /> : null}
        </View>

        <View style={styles.adherenceBox}>
          <View style={styles.adherenceHead}>
            <Text style={styles.adherenceLabel}>Tuân thủ 7 ngày</Text>
            <Text style={[styles.adherenceValue, { color: toneColors(rateTone).value }]}>
              {rate === null ? "Chưa có liều" : `${percent(rate)} · ${u.confirmed7d}/${u.doses7d} liều`}
            </Text>
          </View>
          <ProgressBar rate={rate} height={8} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.detailBox}>
          <View style={styles.metricsGrid}>
            <Metric label="Thuốc đang dùng" value={u.medicationsActive} width={metricWidth} />
            <Metric label="Thiết bị" value={u.devicesActive} width={metricWidth} />
            <Metric label="Liều 7 ngày" value={u.doses7d} width={metricWidth} />
            <Metric label="Đã xác nhận" value={u.confirmed7d} width={metricWidth} />
          </View>
          <DetailRow label="Email" value={u.email ?? "Chưa có email"} />
          <DetailRow label="Xác minh email" value={u.email ? (u.emailVerified ? "Đã xác minh" : "Chưa xác minh") : "—"} />
          <DetailRow label="Múi giờ" value={formatTimezoneLabel(u.timezone)} />
          <DetailRow label="Ngày tạo" value={formatDateTime(u.createdAt)} />
        </View>
      ) : null}

      <View style={styles.actionWrap}>
        {canLock ? (
          <Button variant={u.disabled ? "secondary" : "danger"} size="md" onPress={onLock} style={styles.actBtn}>
            {u.disabled ? "Mở khóa" : "Khóa tài khoản"}
          </Button>
        ) : null}
        {isAdmin && !isSelf ? (
          <Button variant="secondary" size="md" onPress={onRole} style={styles.actBtn}>Đổi vai trò</Button>
        ) : null}
        {isAdmin && !isSelf && u.role === "user" ? (
          <Button variant="ghost" size="md" onPress={onDelete} style={styles.actBtn}>Xóa tài khoản</Button>
        ) : null}
      </View>
      {!isAdmin && u.role !== "user" ? <Text style={styles.limitText}>Chỉ quản trị viên mới thao tác được tài khoản quản lý/quản trị.</Text> : null}
    </View>
  );
}

function SimpleModal({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <ScrollView style={{ maxHeight: 460 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Kiểu dáng                                                           */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { width: "100%", alignSelf: "center", paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xxxl },
  scrollWide: { maxWidth: 1440, paddingHorizontal: 32, paddingTop: 28 },
  stack: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "stretch" },
  rowStack: { flexDirection: "column" },

  /* đầu trang */
  backTap: { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", paddingVertical: 10, paddingRight: 16, minHeight: 44 },
  backText: { ...typography.body, color: colors.primary, fontWeight: "800", fontSize: 17 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap", gap: spacing.sm, marginBottom: spacing.sm },
  titleLine: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 },
  pageTitle: { fontSize: 28, lineHeight: 36, fontWeight: "800", color: colors.text },
  headerDesc: { ...typography.body, color: colors.muted, marginTop: 6, lineHeight: 24, fontSize: 15 },
  updatedText: { fontSize: 13, color: colors.muted, marginTop: 4 },

  /* tab */
  tabBarWrap: { backgroundColor: colors.bg, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: spacing.md, zIndex: 5 },
  tabBar: { gap: 4 },
  tab: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, minHeight: 48, borderBottomWidth: 3, borderBottomColor: "transparent" },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 16, fontWeight: "700", color: colors.muted },
  tabTextActive: { color: colors.primary, fontWeight: "800" },
  tabCount: { minWidth: 24, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2, alignItems: "center" },
  tabCountText: { fontSize: 13, fontWeight: "800", color: colors.text },

  /* panel */
  panel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  panelTitle: { flex: 1, fontSize: 17, fontWeight: "800", color: colors.text },
  groupWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  sectionHint: { ...typography.body, color: colors.muted, marginTop: spacing.xs, fontSize: 14, lineHeight: 21 },
  miniCaption: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 6 },

  /* tuân thủ */
  heroLine: { flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 12, marginBottom: spacing.sm },
  heroValue: { fontSize: 48, lineHeight: 54, fontWeight: "800" },
  heroLabel: { fontSize: 16, fontWeight: "700", color: colors.text },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md, marginTop: spacing.sm },
  legend: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendText: { fontSize: 14, color: colors.text },
  track: { width: "100%", height: 6, borderRadius: 3, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  fill: { height: "100%" },
  dot: { width: 10, height: 10, borderRadius: 5 },

  /* cần xử lý */
  attentionRow: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: radius.md, padding: 12, marginBottom: spacing.xs, minHeight: 48 },
  attentionText: { flex: 1, fontSize: 15, lineHeight: 21, fontWeight: "700" },
  okBox: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", borderRadius: radius.md, padding: 12 },
  okText: { flex: 1, fontSize: 15, fontWeight: "700", color: "#166534" },

  /* KPI */
  kpiLine: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, minHeight: 44 },
  kpiIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  kpiLabel: { flex: 1, fontSize: 15, color: colors.text },
  kpiValue: { fontSize: 22, fontWeight: "800" },

  /* tìm kiếm & chip */
  inputLabel: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: 6 },
  searchRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
  chipRow: { gap: 8, paddingTop: spacing.sm, paddingBottom: 2 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, minHeight: 40, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.text },
  chipTextActive: { color: "#fff" },
  chipCount: { fontSize: 13, fontWeight: "800", color: colors.muted },
  chipCountActive: { color: "#fff" },
  loadingText: { ...typography.body, color: colors.muted, marginVertical: spacing.xs },
  emptyBox: { borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, backgroundColor: colors.surface2 },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  emptyHint: { fontSize: 15, color: colors.muted, marginTop: 2 },

  /* thẻ người dùng */
  userGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  userCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: spacing.md },
  userCardLocked: { borderColor: "#fecaca", backgroundColor: "#fffafa" },
  userTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 16, fontWeight: "800", color: colors.primaryDark ?? colors.primary },
  userName: { fontSize: 19, lineHeight: 25, fontWeight: "800", color: colors.text },
  userContact: { fontSize: 15, lineHeight: 21, color: colors.muted },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: spacing.sm },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: "800" },
  adherenceBox: { marginTop: spacing.sm, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 12 },
  adherenceHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  adherenceLabel: { fontSize: 14, fontWeight: "700", color: colors.muted },
  adherenceValue: { fontSize: 14, fontWeight: "800" },
  detailBox: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm },
  metricsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: spacing.xs },
  metric: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 10 },
  metricLabel: { fontSize: 13, fontWeight: "700", color: colors.muted },
  metricValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 1 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 6 },
  detailLabel: { fontSize: 14, color: colors.muted },
  detailValue: { flexShrink: 1, fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  actionWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, marginTop: spacing.md },
  actBtn: { flexGrow: 1, minWidth: 120 },
  limitText: { fontSize: 14, color: colors.muted, marginTop: spacing.xs, fontStyle: "italic" },

  /* phân trang */
  pager: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  pagerBtn: { flex: 1 },
  pagerMid: { alignItems: "center", minWidth: 90 },
  pagerInfo: { fontSize: 15, fontWeight: "800", color: colors.text },
  pagerSub: { fontSize: 13, color: colors.muted },

  /* lỗi thông báo */
  causeRow: { marginBottom: spacing.sm },
  causeHead: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  causeLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.text },
  causeCount: { fontSize: 15, fontWeight: "800", color: "#b91c1c" },
  causeHint: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 6 },
  logRowError: { borderLeftWidth: 4, borderLeftColor: colors.danger, backgroundColor: "#fff7f7", borderWidth: 1, borderColor: "#fecaca", borderRadius: 14, padding: spacing.md, marginTop: spacing.xs },
  logHead: { flexDirection: "row", justifyContent: "space-between", gap: 8, flexWrap: "wrap" },
  logTitle: { fontSize: 16, fontWeight: "800", color: colors.text, flex: 1 },
  logTime: { fontSize: 13, color: colors.muted },
  logError: { fontSize: 15, lineHeight: 22, color: "#991b1b", marginTop: 4, fontWeight: "600" },
  logActor: { fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: 2 },

  /* dòng thời gian nhật ký */
  timelineRow: { flexDirection: "row", gap: 12 },
  timelineRail: { width: 12, alignItems: "center" },
  timelineLine: { flex: 1, width: 2, backgroundColor: colors.border, marginTop: 4 },
  timelineBody: { flex: 1, paddingBottom: spacing.md },

  /* hộp thoại */
  modalOverlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", padding: spacing.md },
  modalCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg, borderWidth: 1, borderColor: colors.border, maxHeight: "88%", width: "100%", maxWidth: 520, alignSelf: "center" },
  modalTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
  modalText: { fontSize: 17, lineHeight: 25, color: colors.text, marginBottom: spacing.sm },
  modalActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  roleOption: { flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 12, borderRadius: radius.md, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface2 },
  roleOptionActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  roleTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
  roleDesc: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
  errorText: { fontSize: 15, color: "#991b1b", marginTop: 4, fontWeight: "700" },
});
