import { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { Button, Input, Section, Text, DateField, TimezoneField } from "../components";
import { colors, spacing, typography } from "../theme";
import { updateProfile } from "../services/endpoints";
import { isValidYmd } from "../components/DateField";
import { isInternalMedEmail } from "../services/firebase";

export default function PersonalInfoScreen() {
  const { user, profile, refreshProfile, timezone: ctxTimezone } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh");
  const [profileSaving, setProfileSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setDisplayName((profile as any).displayName || "");
    setPhone((profile as any).phone || "");
    setAddress((profile as any).address || "");
    const dob = (profile as any).dateOfBirth || "";
    setDateOfBirth(typeof dob === "string" && dob.length >= 10 ? dob.slice(0, 10) : dob);
    setTimezone((profile as any).timezone || ctxTimezone || "Asia/Ho_Chi_Minh");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile, ctxTimezone]);

  async function saveProfile() {
    if (!displayName.trim()) {
      Alert.alert("Lỗi", "Tên hiển thị không được để trống");
      return;
    }
    const dob = (dateOfBirth || "").trim().slice(0, 10);
    if (!dob) {
      Alert.alert("Thiếu thông tin", "Vui lòng chọn ngày sinh.");
      return;
    }
    if (!isValidYmd(dob)) {
      Alert.alert("Lỗi", "Ngày sinh không hợp lệ. Vui lòng chọn lại.");
      return;
    }
    const today = new Date();
    const todayY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    if (dob > todayY) {
      Alert.alert("Lỗi", "Ngày sinh không được lớn hơn ngày hiện tại.");
      return;
    }
    try {
      setProfileSaving(true);
      await updateProfile({
        displayName: displayName.trim(),
        phone: phone.trim() || null,
        address: address.trim() || null,
        dateOfBirth: dob,
        timezone: timezone.trim() || "Asia/Ho_Chi_Minh",
      });
      await refreshProfile?.();
      Alert.alert("Đã lưu", "Đã lưu thông tin cá nhân và múi giờ.");
    } catch (e: any) {
      Alert.alert("Lỗi", e?.message || "Không thể cập nhật hồ sơ");
    } finally {
      setProfileSaving(false);
    }
  }

  const rawEmail = (user as any)?.email as string | undefined;
  const loginDisplay = rawEmail && !isInternalMedEmail(rawEmail) ? rawEmail : (profile as any)?.phone || rawEmail || "—";

  return (
    <SafeAreaView style={styles.safe} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Button
            variant="ghost"
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/profile"))}
          >
            ← Quay lại
          </Button>
        </View>
        <Text style={styles.pageTitle}>Thông tin cá nhân</Text>

        <Section title="Thông tin cá nhân" icon="👤">
          <Text style={styles.muted}>Email/SĐT đăng nhập: {loginDisplay}</Text>
          <Text style={styles.label}>Tên hiển thị</Text>
          <Input value={displayName} onChangeText={setDisplayName} placeholder="Họ và tên" />
          <Text style={styles.label}>Số điện thoại</Text>
          <Input value={phone} onChangeText={setPhone} placeholder="0912345678" keyboardType="phone-pad" />
          <Text style={styles.muted}>Dùng để người thân liên hệ; để trống nếu không muốn khai.</Text>
          <Text style={styles.label}>Địa chỉ</Text>
          <Input value={address} onChangeText={setAddress} placeholder="12 Lê Lợi, Q.1, TP.HCM" />
          <DateField label="Ngày sinh" value={dateOfBirth} onChange={setDateOfBirth} />
          <Text style={styles.muted}>Bắt buộc. Không được lớn hơn ngày hiện tại.</Text>
          <TimezoneField label="Múi giờ" value={timezone} onChange={setTimezone} />
          <Button onPress={saveProfile} loading={profileSaving} disabled={profileSaving} style={styles.mt}>
            Lưu thông tin
          </Button>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { marginBottom: 4 },
  pageTitle: { fontSize: 26, fontWeight: "800", color: colors.text, marginBottom: spacing.lg },
  muted: { ...typography.body, color: colors.muted, marginBottom: 4 },
  label: { ...typography.bodySm, fontWeight: "700", color: colors.text, marginTop: spacing.sm, marginBottom: 6 },
  mt: { marginTop: spacing.sm },
});
