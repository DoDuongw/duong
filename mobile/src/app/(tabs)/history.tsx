import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Section } from "../../components";
import { colors, spacing, typography } from "../../theme";

export default function HistoryScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Lịch sử uống thuốc" icon="⏱️">
          <Text style={styles.muted}>Tra cứu các lần đã uống, bỏ lỡ, hoãn</Text>
        </Section>
        <Card>
          <Text style={styles.empty}>Chưa có lịch sử</Text>
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
