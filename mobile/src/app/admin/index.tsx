import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Section, Button } from "../../components";
import { colors, spacing, typography } from "../../theme";

export default function AdminScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Quản trị" icon="🛡️">
          <Text style={styles.muted}>Quản lý người dùng, hệ thống</Text>
        </Section>
        <Card>
          <Text style={styles.title}>Người dùng</Text>
          <Text style={styles.muted}>Danh sách người dùng trong hệ thống</Text>
          <Button style={styles.btn}>Xem danh sách</Button>
        </Card>
        <Card>
          <Text style={styles.title}>Thống kê</Text>
          <Text style={styles.muted}>Tổng quan hệ thống</Text>
          <Button variant="secondary" style={styles.btn}>Xem thống kê</Button>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  title: { ...typography.h2, marginBottom: spacing.sm },
  muted: { ...typography.body, color: colors.muted },
  btn: { marginTop: spacing.md },
});
