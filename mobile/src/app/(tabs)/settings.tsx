import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../hooks/useAuth";
import { Card, Button } from "../../components";
import { colors, spacing, typography } from "../../theme";

export default function SettingsScreen() {
  const { logout, user } = useAuth();
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card>
          <Text style={styles.sectionTitle}>Tài khoản</Text>
          <Text style={styles.text}>{(user as any)?.email || (user as any)?.phoneNumber || 'Người dùng'}</Text>
        </Card>
        <Card>
          <Text style={styles.sectionTitle}>Cài đặt</Text>
          <Text style={styles.muted}>Tùy chỉnh font chữ, thông báo, nhắc lại...</Text>
        </Card>
        <Button variant="danger" onPress={() => logout()}>
          Đăng xuất
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  sectionTitle: { ...typography.h2, marginBottom: spacing.sm },
  text: { ...typography.body },
  muted: { ...typography.body, color: colors.muted },
});

