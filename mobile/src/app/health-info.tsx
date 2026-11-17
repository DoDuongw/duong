import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { StyleProp, TextInputProps, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useAuth } from "../hooks/useAuth";
import { Button, Card, Input, Text } from "../components";
import { colors, radius, spacing, typography } from "../theme";
import { updateProfile } from "../services/endpoints";

type IconName = keyof typeof Ionicons.glyphMap;

function parseOptionalNumber(raw: string): number | null {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) return null;

  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

function formatUpdatedAt(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("vi-VN");
}

function getBmiHint(bmi: number): string {
  if (bmi < 18.5) return "Thiếu cân";
  if (bmi < 25) return "Bình thường";
  if (bmi < 30) return "Thừa cân";
  return "Béo phì";
}

function SectionHeader({
  icon,
  title,
  subtitle,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIcon}>
        <Ionicons name={icon} size={20} color={colors.primary} />
      </View>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

function Metric({
  label,
  value,
  unit,
  emptyHint,
  hint,
}: {
  label: string;
  value: string;
  unit: string;
  emptyHint: string;
  hint?: string;
}) {
  const hasValue = value.trim().length > 0;

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[styles.metricValue, !hasValue && styles.metricValueEmpty]}
        numberOfLines={1}
      >
        {hasValue ? value : "—"}
      </Text>
      <Text style={styles.metricHint} numberOfLines={2}>
        {hasValue ? hint || unit : emptyHint}
      </Text>
    </View>
  );
}

function HealthField({
  icon,
  label,
  unit,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  style,
}: {
  icon: IconName;
  label: string;
  unit: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: TextInputProps["keyboardType"];
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={style}>
      <View style={styles.fieldHeader}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name={icon} size={16} color={colors.primary} />
          <Text style={styles.fieldLabel}>{label}</Text>
        </View>
        <Text style={styles.fieldUnit}>{unit}</Text>
      </View>

      <Input
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
      />
    </View>
  );
}

export default function HealthInfoScreen() {
  const { profile, refreshProfile } = useAuth();

  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const info = profile?.healthInfo;

    /* eslint-disable react-hooks/set-state-in-effect */
    setWeight(info?.weightKg != null ? String(info.weightKg) : "");
    setHeight(info?.heightCm != null ? String(info.heightCm) : "");
    setBloodPressure(info?.bloodPressure || "");
    setHeartRate(info?.heartRate != null ? String(info.heartRate) : "");
    setBloodSugar(info?.bloodSugar != null ? String(info.bloodSugar) : "");
    setNotes(info?.notes || "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile]);

  const bmi = useMemo(() => {
    const weightKg = parseOptionalNumber(weight);
    const heightCm = parseOptionalNumber(height);

    if (
      weightKg == null ||
      heightCm == null ||
      Number.isNaN(weightKg) ||
      Number.isNaN(heightCm) ||
      weightKg < 1 ||
      weightKg > 500 ||
      heightCm < 30 ||
      heightCm > 250
    ) {
      return null;
    }

    const heightM = heightCm / 100;
    return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  }, [weight, height]);

  const filledCount = useMemo(
    () =>
      [weight, height, bloodPressure, heartRate, bloodSugar].filter(
        (value) => value.trim().length > 0,
      ).length,
    [weight, height, bloodPressure, heartRate, bloodSugar],
  );

  const progressPercent = Math.round((filledCount / 5) * 100);
  const progressLabel =
    filledCount === 0
      ? "Chưa cập nhật chỉ số nào"
      : filledCount === 5
        ? "Đã cập nhật đầy đủ 5/5 chỉ số"
        : `${filledCount}/5 chỉ số đã cập nhật`;

  const updatedAt = formatUpdatedAt(profile?.healthInfo?.updatedAt);

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(tabs)/profile");
  }

  function validateNumber(
    label: string,
    raw: string,
    min: number,
    max: number,
    integer = false,
  ): number | null | undefined {
    const value = parseOptionalNumber(raw);

    if (value === null) return null;

    if (
      Number.isNaN(value) ||
      value < min ||
      value > max ||
      (integer && !Number.isInteger(value))
    ) {
      Alert.alert(
        "Giá trị không hợp lệ",
        `${label} nên nằm trong khoảng ${min}–${max}.`,
      );
      return undefined;
    }

    return value;
  }

  async function saveHealthInfo() {
    const weightKg = validateNumber("Cân nặng", weight, 1, 500);
    if (weightKg === undefined) return;

    const heightCm = validateNumber("Chiều cao", height, 30, 250);
    if (heightCm === undefined) return;

    const heartRateValue = validateNumber("Nhịp tim", heartRate, 20, 250, true);
    if (heartRateValue === undefined) return;

    const bloodSugarValue = validateNumber("Đường huyết", bloodSugar, 0.5, 50);
    if (bloodSugarValue === undefined) return;

    const pressure = bloodPressure.trim();
    if (pressure && !/^\d{2,3}\s*\/\s*\d{2,3}$/.test(pressure)) {
      Alert.alert(
        "Huyết áp không hợp lệ",
        "Vui lòng nhập theo dạng tâm thu/tâm trương, ví dụ 120/80.",
      );
      return;
    }

    try {
      setSaving(true);

      await updateProfile({
        healthInfo: {
          weightKg,
          heightCm,
          bloodPressure: pressure ? pressure.replace(/\s+/g, "") : null,
          heartRate: heartRateValue,
          bloodSugar: bloodSugarValue,
          notes: notes.trim() || null,
        },
      });

      await refreshProfile?.();

      Alert.alert(
        "Đã lưu thành công",
        "Thông tin sức khỏe của bạn đã được cập nhật.",
      );
    } catch (e: any) {
      Alert.alert("Không thể lưu", e?.message || "Vui lòng thử lại sau.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Quay lại hồ sơ"
              hitSlop={8}
            >
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
              <Text style={styles.backText}>Hồ sơ</Text>
            </Pressable>

            <View style={styles.optionalPill}>
              <Text style={styles.optionalText}>Không bắt buộc</Text>
            </View>
          </View>

          <Text style={styles.pageTitle}>Tình trạng sức khỏe hiện tại</Text>
          <Text style={styles.pageSub}>
            Theo dõi các chỉ số cơ bản và ghi chú sức khỏe của bạn. Bạn có thể
            để trống bất kỳ mục nào.
          </Text>

          <Card style={styles.overviewCard}>
            <View style={styles.overviewHeader}>
              <View style={styles.overviewIcon}>
                <Ionicons
                  name="heart-outline"
                  size={22}
                  color={colors.primary}
                />
              </View>
              <View style={styles.overviewHeading}>
                <Text style={styles.overviewTitle}>Tổng quan sức khỏe</Text>
                <Text style={styles.overviewSub}>{progressLabel}</Text>
              </View>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[styles.progressFill, { width: `${progressPercent}%` }]}
              />
            </View>

            <View style={styles.metricsGrid}>
              <Metric
                label="BMI"
                value={bmi != null ? bmi.toFixed(1) : ""}
                unit="kg/m²"
                hint={bmi != null ? getBmiHint(bmi) : undefined}
                emptyHint="Cần cân nặng & chiều cao"
              />
              <Metric
                label="Huyết áp"
                value={bloodPressure}
                unit="mmHg"
                emptyHint="Chưa cập nhật"
              />
              <Metric
                label="Nhịp tim"
                value={heartRate}
                unit="lần/phút"
                emptyHint="Chưa cập nhật"
              />
              <Metric
                label="Đường huyết"
                value={bloodSugar}
                unit="mmol/L"
                emptyHint="Chưa cập nhật"
              />
            </View>

            <View style={styles.updatedRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={colors.muted}
              />
              <Text style={styles.updatedText}>
                {updatedAt
                  ? `Cập nhật lần cuối: ${updatedAt}`
                  : "Chưa lưu thông tin sức khỏe"}
              </Text>
            </View>
          </Card>

          <View style={styles.section}>
            <SectionHeader
              icon="body-outline"
              title="Chỉ số cơ thể"
              subtitle="Các thông tin cơ bản về cơ thể"
            />

            <Card style={styles.formCard}>
              <View style={styles.fieldRow}>
                <HealthField
                  icon="barbell-outline"
                  label="Cân nặng"
                  unit="kg"
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="Ví dụ: 65"
                  keyboardType="decimal-pad"
                  style={styles.halfField}
                />
                <HealthField
                  icon="resize-outline"
                  label="Chiều cao"
                  unit="cm"
                  value={height}
                  onChangeText={setHeight}
                  placeholder="Ví dụ: 170"
                  keyboardType="decimal-pad"
                  style={styles.halfField}
                />
              </View>

              <HealthField
                icon="heart-outline"
                label="Huyết áp"
                unit="mmHg"
                value={bloodPressure}
                onChangeText={setBloodPressure}
                placeholder="Ví dụ: 120/80"
                keyboardType={
                  Platform.OS === "ios" ? "numbers-and-punctuation" : "default"
                }
              />

              <HealthField
                icon="pulse-outline"
                label="Nhịp tim"
                unit="lần/phút"
                value={heartRate}
                onChangeText={setHeartRate}
                placeholder="Ví dụ: 75"
                keyboardType="number-pad"
              />

              <HealthField
                icon="water-outline"
                label="Đường huyết"
                unit="mmol/L"
                value={bloodSugar}
                onChangeText={setBloodSugar}
                placeholder="Ví dụ: 5.4"
                keyboardType="decimal-pad"
              />

              <View style={styles.infoRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={colors.muted}
                />
                <Text style={styles.infoText}>
                  Không bắt buộc. Bạn có thể cập nhật hoặc bỏ trống bất kỳ chỉ
                  số nào.
                </Text>
              </View>
            </Card>
          </View>

          <View style={styles.section}>
            <SectionHeader
              icon="document-text-outline"
              title="Ghi chú sức khỏe"
              subtitle="Dị ứng, bệnh nền, thuốc đang dùng..."
            />

            <Card style={styles.notesCard}>
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder={
                  "Ví dụ: Dị ứng penicillin\nTiền sử cao huyết áp\nĐang dùng thuốc huyết áp..."
                }
                multiline
                numberOfLines={5}
                maxLength={500}
                textAlignVertical="top"
                style={styles.notesInput}
              />

              <View style={styles.notesFooter}>
                <Text style={styles.notesHint}>Tối đa 500 ký tự</Text>
                <Text style={styles.notesCount}>{notes.length}/500</Text>
              </View>
            </Card>
          </View>

          <Button
            onPress={saveHealthInfo}
            loading={saving}
            disabled={saving}
            block
            style={styles.saveBtn}
          >
            Lưu thông tin sức khỏe
          </Button>

          <Text style={styles.saveHint}>
            Thông tin được lưu trong hồ sơ của bạn và có thể cập nhật lại bất cứ
            lúc nào.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  flex: {
    flex: 1,
  },

  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingRight: 8,
  },

  pressed: {
    opacity: 0.6,
  },

  backText: {
    ...typography.bodySm,
    fontWeight: "700",
    color: colors.primary,
  },

  optionalPill: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  optionalText: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.muted,
  },

  pageTitle: {
    ...typography.h1,
    fontWeight: "800",
    color: colors.text,
    marginBottom: spacing.xs,
  },

  pageSub: {
    ...typography.bodySm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },

  overviewCard: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },

  overviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },

  overviewIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },

  overviewHeading: {
    flex: 1,
  },

  overviewTitle: {
    ...typography.h3,
    color: colors.primaryDark,
  },

  overviewSub: {
    ...typography.small,
    color: colors.muted,
    marginTop: 2,
  },

  progressTrack: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: "hidden",
    marginTop: spacing.md,
  },

  progressFill: {
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },

  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.md,
  },

  metricCard: {
    flexBasis: "45%",
    flexGrow: 1,
    minWidth: 130,
    minHeight: 94,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },

  metricLabel: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.muted,
  },

  metricValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
    color: colors.text,
    marginTop: 4,
  },

  metricValueEmpty: {
    color: colors.muted,
  },

  metricHint: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.muted,
    marginTop: 2,
  },

  updatedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },

  updatedText: {
    ...typography.small,
    color: colors.muted,
    flex: 1,
  },

  section: {
    marginBottom: spacing.xl,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },

  sectionIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },

  sectionHeading: {
    flex: 1,
  },

  sectionTitle: {
    ...typography.h3,
    color: colors.text,
  },

  sectionSubtitle: {
    ...typography.small,
    color: colors.muted,
    marginTop: 2,
  },

  formCard: {
    padding: spacing.lg,
    gap: spacing.md,
    marginBottom: 0,
  },

  fieldRow: {
    flexDirection: "row",
    gap: spacing.md,
  },

  halfField: {
    flex: 1,
  },

  fieldHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginBottom: 6,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },

  fieldLabel: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: "700",
    color: colors.text,
    flexShrink: 1,
  },

  fieldUnit: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "700",
    color: colors.muted,
  },

  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: spacing.xs,
  },

  infoText: {
    ...typography.small,
    color: colors.muted,
    flex: 1,
    lineHeight: 18,
  },

  notesCard: {
    padding: spacing.lg,
    marginBottom: 0,
  },

  notesInput: {
    minHeight: 120,
    paddingTop: spacing.md,
  },

  notesFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },

  notesHint: {
    ...typography.small,
    color: colors.muted,
  },

  notesCount: {
    ...typography.small,
    fontWeight: "700",
    color: colors.muted,
  },

  saveBtn: {
    marginTop: spacing.sm,
  },

  saveHint: {
    ...typography.small,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
  },
});
