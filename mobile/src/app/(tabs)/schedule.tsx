import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Section } from "../../components";
import { colors, spacing, typography } from "../../theme";

export default function ScheduleScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Lịch uống thuốc" icon="📅">
          <Text style={styles.muted}>Xem lịch theo ngày và theo buổi. Chọn một ngày để xem chi tiết.</Text>
        </Section>
        <Card>
          <Text style={styles.empty}>Chưa có dữ liệu lịch</Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  muted: { ...typography.body, color: colors.muted },
  empty: { ...typography.body, color: colors.muted, textAlign: 'center' },
});

