import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Card, Button, Section } from "../../components";
import { colors, spacing, typography } from "../../theme";

export default function MedicationsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Section title="Danh sách thuốc" icon="💊">
          <Text style={styles.muted}>Quản lý thuốc, liều và giờ uống</Text>
        </Section>
        <Card>
          <Text style={styles.empty}>Chưa có thuốc nào</Text>
        </Card>
        <Button>+ Thêm thuốc</Button>
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

