import { View, StyleSheet } from "react-native";
import { useState } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../hooks/useAuth";
import { DueBanner, Notice, Button, Text } from "../../components";
import { isInternalMedEmail } from "../../services/firebase";
import { colors, spacing } from "../../theme";

function EmailVerificationBanner() {
  const { user, resendVerification, reloadUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || user.emailVerified || !user.email || isInternalMedEmail(user.email)) return null;

  async function handleResend() {
    setSending(true);
    setSent(false);
    setError(null);
    try {
      await resendVerification?.();
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? "Không gửi được email xác minh");
    } finally {
      setSending(false);
    }
  }

  async function handleCheck() {
    setChecking(true);
    setError(null);
    try {
      await reloadUser?.();
    } catch (e: any) {
      setError(e?.message ?? "Không kiểm tra được");
    } finally {
      setChecking(false);
    }
  }

  return (
    <View style={styles.verifyWrap}>
      <Notice tone="info" icon={false}>
        <Text style={styles.verifyTitle}>Xác minh email</Text>
        <Text style={styles.verifyText}>Mở email và bấm link xác minh để bảo vệ tài khoản. Sau đó bấm “Tôi đã xác minh”.</Text>
        {error ? <Text style={styles.verifyError}>{error}</Text> : null}
        {sent ? <Text style={styles.verifyOk}>Đã gửi email xác minh.</Text> : null}
        <View style={styles.verifyActions}>
          <Button size="md" variant="secondary" onPress={handleResend} loading={sending} disabled={sending || checking}>
            Gửi lại email
          </Button>
          <Button size="md" onPress={handleCheck} loading={checking} disabled={sending || checking}>
            Tôi đã xác minh
          </Button>
        </View>
      </Notice>
    </View>
  );
}

export default function TabsLayout() {
  const { user, profile } = useAuth();
  const role = (profile as any)?.role;
  const canAccessOps = role === "admin" || role === "manager";
  return (
    <View style={{ flex: 1 }}>
      <EmailVerificationBanner />
      <DueBanner enabled={!!user} />
      <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#12659c",
        tabBarInactiveTintColor: "#53646f",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#d5dfe8",
          height: 68,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
        headerStyle: {
          backgroundColor: "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: "#d5dfe8",
        },
        headerTitleStyle: {
          fontWeight: "700",
          color: "#16232e",
        } as any,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Trang chủ",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: "Lịch",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="medications"
        options={{
          title: "Thuốc",
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Thông báo",
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color as any} />,
        }}
      />
      <Tabs.Screen
        name="operations"
        options={{
          title: role === "admin" ? "Quản trị" : "Vận hành",
          tabBarIcon: ({ color, size }) => <Ionicons name="shield-checkmark" size={size} color={color as any} />,
          href: canAccessOps ? undefined : null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Hồ sơ",
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color as any} />,
        }}
      />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  verifyWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, backgroundColor: colors.bg },
  verifyTitle: { fontWeight: "800", color: colors.text, marginBottom: 2 },
  verifyText: { color: colors.text, marginBottom: 6 },
  verifyError: { color: colors.danger, marginBottom: 4 },
  verifyOk: { color: colors.success, marginBottom: 4, fontWeight: "700" },
  verifyActions: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap", marginTop: 4 },
});
