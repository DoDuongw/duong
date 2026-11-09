import { View, StyleSheet, ScrollView, Pressable, Alert, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAuth } from "../../hooks/useAuth";
import { Button, Card, Text } from "../../components";
import { colors, spacing, typography, radius } from "../../theme";
import { isInternalMedEmail } from "../../services/firebase";

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  route: string;
  tone: string;
}

const MENU: MenuItem[] = [
  {
    icon: "person-outline",
    title: "Thông tin cá nhân",
    subtitle: "Họ tên, số điện thoại, địa chỉ, ngày sinh, múi giờ",
    route: "/personal-info",
    tone: colors.primary,
  },
  {
    icon: "pulse-outline",
    title: "Nhật ký sức khỏe",
    subtitle: "Xem lại các lần hỏi thăm sau khi uống thuốc",
    route: "/health-journal",
    tone: colors.accent,
  },
  {
    icon: "settings-outline",
    title: "Cài đặt",
    subtitle: "Bảo mật, cỡ chữ, nhắc lại, thông báo, người thân",
    route: "/settings",
    tone: colors.warning,
  },
];

export default function ProfileScreen() {
  const { user, profile, logout } = useAuth();
  const displayName = (profile as any)?.displayName || (user as any)?.displayName || "Người dùng";
  const rawEmail = (user as any)?.email as string | undefined;
  const login = rawEmail && !isInternalMedEmail(rawEmail) ? rawEmail : (profile as any)?.phone || rawEmail || "—";
  const initial = String(displayName).trim().charAt(0).toUpperCase() || "?";
  const role = (profile as any)?.role;
  const roleLabel = role === "admin" ? "Quản trị viên" : role === "manager" ? "Quản lý" : "Thành viên";

  function handleLogout() {
    const doLogout = async () => {
      try {
        await logout();
      } catch {}
      try {
        router.dismissAll();
      } catch {}
      router.replace("/welcome" as any);
    };
    if (Platform.OS === "web") {
      // Alert.alert buttons are unreliable on react-native-web
      if (typeof window !== "undefined" && window.confirm("Bạn chắc chắn muốn đăng xuất?")) {
        void doLogout();
      }
    } else {
      Alert.alert("Đăng xuất?", "Bạn chắc chắn muốn đăng xuất?", [
        { text: "Hủy", style: "cancel" },
        {
          text: "Đăng xuất",
          style: "destructive",
          onPress: () => {
            void doLogout();
          },
        },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Hồ sơ</Text>
        <Text style={styles.pageSub}>Thông tin của bạn và các thiết lập cá nhân</Text>

        <Card style={styles.identityCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.login} numberOfLines={1}>{login}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.roleText}>{roleLabel}</Text>
            </View>
          </View>
        </Card>

        <View style={styles.menuList}>
          {MENU.map((item) => (
            <Pressable
              key={item.route}
              onPress={() => router.push(item.route as any)}
              style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
              accessibilityRole="button"
              accessibilityLabel={item.title}
            >
              <View style={[styles.menuIcon, { backgroundColor: `${item.tone}18` }]}>
                <Ionicons name={item.icon} size={24} color={item.tone} />
              </View>
              <View style={styles.menuTextWrap}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color={colors.muted} />
            </Pressable>
          ))}
        </View>

        <Card style={styles.logoutCard}>
          <Text style={styles.logoutTitle}>Đăng xuất</Text>
          <Text style={styles.logoutHint}>Bạn sẽ cần đăng nhập lại để tiếp tục sử dụng ứng dụng.</Text>
          <Button variant="danger" block onPress={handleLogout}>
            Đăng xuất
          </Button>
        </Card>

        <Text style={styles.footer}>MedReminder · Nhắc lịch uống thuốc và theo dõi sức khỏe</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  pageTitle: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: 4 },
  pageSub: { ...typography.body, color: colors.muted, marginBottom: spacing.lg },
  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primarySoft,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: colors.primaryDark },
  identityInfo: { flex: 1 },
  name: { ...typography.h2, color: colors.text },
  login: { ...typography.bodySm, color: colors.muted, marginTop: 2 },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleText: { ...typography.caption, fontWeight: "700", color: colors.text },
  menuList: { gap: spacing.sm },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 76,
  },
  menuItemPressed: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTextWrap: { flex: 1 },
  menuTitle: { ...typography.body, fontWeight: "800", color: colors.text },
  menuSubtitle: { ...typography.caption, color: colors.muted, marginTop: 2 },
  logoutCard: { marginTop: spacing.xl, borderColor: colors.danger, gap: spacing.sm },
  logoutTitle: { ...typography.h3, color: colors.danger },
  logoutHint: { ...typography.bodySm, color: colors.muted },
  footer: { ...typography.caption, color: colors.muted, textAlign: "center", marginTop: spacing.xxl },
});
