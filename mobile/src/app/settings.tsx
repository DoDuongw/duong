import { useCallback, useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, Alert, Platform, Pressable, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { Button, Section, Input, Notice, Text } from "../components";
import { colors, spacing, typography } from "../theme";
import { API_BASE } from "../config";
import {
  listFamilyConnections,
  updateFamilyPermissions,
  updateNotificationSettings,
} from "../services/endpoints";
import { enablePushNotifications, getCurrentPushToken } from "../services/notifications";
import { changeOwnPassword, isInternalMedEmail } from "../services/firebase";
import { FONT_SCALE_LABEL } from "../utils/fontScale";
import { useFontScale } from "../store/fontScale";
import type { FamilyConnectionItem } from "../types";

export default function SettingsScreen() {
  const { user, profile, refreshProfile, resendVerification, reloadUser } = useAuth();
  const prefs = (profile as any)?.preferences || {};
  const [snoozeMinutes, setSnoozeMinutes] = useState(String(prefs.snoozeMinutes ?? 10));
  const [snoozeMax, setSnoozeMax] = useState(String(prefs.snoozeMax ?? 3));
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(() => getCurrentPushToken());
  const [pushPlatform, setPushPlatform] = useState<'android' | 'ios' | 'web' | null>(() =>
    getCurrentPushToken() ? 'web' : null,
  );
  const [verifyBusy, setVerifyBusy] = useState(false);
  const { scale: fontScale, setScale: setFontScale } = useFontScale();

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<string | null>(null);

  const [connections, setConnections] = useState<FamilyConnectionItem[]>([]);
  const [connLoading, setConnLoading] = useState(true);
  const [connError, setConnError] = useState<string | null>(null);
  const [connBusyId, setConnBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      const p = (profile as any).preferences || {};
      /* eslint-disable react-hooks/set-state-in-effect */
      if (p.snoozeMinutes != null) setSnoozeMinutes(String(p.snoozeMinutes));
      if (p.snoozeMax != null) setSnoozeMax(String(p.snoozeMax));
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [profile]);

  const loadConnections = useCallback(async () => {
    setConnLoading(true);
    setConnError(null);
    try {
      const all = await listFamilyConnections();
      setConnections((all || []).filter((c) => c.role === 'owner'));
    } catch (e: any) {
      setConnError(e?.message || 'Không tải được danh sách người thân');
    } finally {
      setConnLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConnections();
    }, [loadConnections]),
  );

  async function toggleRelativeAlerts(conn: FamilyConnectionItem, next: boolean) {
    setConnBusyId(conn.id);
    setConnError(null);
    try {
      await updateFamilyPermissions(conn.id, { relativeAlerts: next });
      setConnections((prev) =>
        prev.map((c) => (c.id === conn.id ? { ...c, permissions: { ...c.permissions, relative_alerts: next } } : c)),
      );
    } catch (e: any) {
      setConnError(e?.message || 'Không đổi được quyền — thử lại');
    } finally {
      setConnBusyId(null);
    }
  }

  async function saveNotificationSettings() {
    const sm = parseInt(snoozeMinutes, 10);
    const sx = parseInt(snoozeMax, 10);
    if (!Number.isFinite(sm) || sm < 1 || sm > 120) {
      Alert.alert('Giá trị không hợp lệ', 'Số phút hoãn nên từ 1 đến 120.');
      return;
    }
    if (!Number.isFinite(sx) || sx < 0 || sx > 10) {
      Alert.alert('Giá trị không hợp lệ', 'Số lần hoãn tối đa nên từ 0 đến 10.');
      return;
    }
    try {
      setSaving(true);
      await updateNotificationSettings({ snoozeMinutes: sm, snoozeMax: sx });
      await refreshProfile?.();
      Alert.alert('Đã lưu', 'Đã lưu cài đặt nhắc lại.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể lưu cài đặt');
    } finally {
      setSaving(false);
    }
  }

  async function handleRegisterPush() {
    try {
      setPushBusy(true);
      const result = await enablePushNotifications({ requestPermission: true });
      if (!result.token) {
        Alert.alert(
          Platform.OS === 'web' ? 'Chưa bật được thông báo trên trình duyệt' : 'Chưa đăng ký được',
          result.message ||
            (Platform.OS === 'web'
              ? 'Trình duyệt chưa cấp quyền hoặc chưa cấu hình VAPID key. Kiểm tra quyền thông báo của trang rồi thử lại.'
              : 'Không lấy được token thông báo. Cần: (1) điện thoại thật (không phải trình giả lập), (2) đã cấp quyền thông báo, (3) app kết nối được máy chủ (xem mục chẩn đoán bên dưới), (4) khởi động lại Expo bằng "npx expo start -c" để nhận projectId mới. Nếu vẫn lỗi, kiểm tra đăng nhập Expo và kết nối mạng.'),
        );
        return;
      }
      setPushToken(result.token);
      setPushPlatform(result.platform);
      if (result.platform === 'web') {
        Alert.alert(
          'Đã bật thông báo trên trình duyệt',
          `Đã đăng ký Web Push cho trình duyệt này.\nToken (rút gọn): ${result.token.slice(0, 18)}…\n\nHãy giữ tab hoặc trình duyệt mở để nhận thông báo đúng giờ.`,
        );
      } else {
        Alert.alert('Đã đăng ký', `Đã gửi token thiết bị lên hệ thống.\nNền tảng: ${result.platform}\nToken (rút gọn): ${result.token.slice(0, 18)}…\n\nToken đầy đủ ở mục “Token thiết bị” bên dưới. Bạn có thể sao chép token đó để gửi thử trên expo.dev/notifications.`);
      }
    } catch (e: any) {
      Alert.alert('Lỗi đăng ký thiết bị', e?.message || 'Không thể đăng ký thiết bị. Kiểm tra kết nối máy chủ (API_BASE) và thử lại.');
    } finally {
      setPushBusy(false);
    }
  }

  function resetPasswordForm(close = false) {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPw(false);
    setShowNewPw(false);
    setShowConfirmPw(false);
    setPasswordError(null);
    if (close) {
      setPasswordNotice(null);
      setShowChangePassword(false);
    }
  }

  async function handleChangePassword() {
    setPasswordError(null);
    setPasswordNotice(null);
    if (!currentPassword) {
      setPasswordError('Vui lòng nhập mật khẩu hiện tại để xác nhận.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự.');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Mật khẩu mới và xác nhận mật khẩu không khớp.');
      return;
    }
    if (currentPassword === newPassword) {
      setPasswordError('Mật khẩu mới phải khác mật khẩu hiện tại.');
      return;
    }
    try {
      setPasswordSaving(true);
      await changeOwnPassword(currentPassword, newPassword);
      resetPasswordForm(false);
      setPasswordNotice('Đã đổi mật khẩu thành công. Hãy ghi nhớ mật khẩu mới.');
      Alert.alert('Đã đổi mật khẩu', 'Mật khẩu của bạn đã được cập nhật.');
    } catch (e: any) {
      setPasswordError(e?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleResendVerification() {
    try {
      setVerifyBusy(true);
      await resendVerification?.();
      Alert.alert('Đã gửi', 'Vui lòng kiểm tra email để xác minh tài khoản.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể gửi email xác minh');
    } finally {
      setVerifyBusy(false);
    }
  }

  async function handleReloadUser() {
    try {
      setVerifyBusy(true);
      await reloadUser?.();
      await refreshProfile?.();
      Alert.alert('Đã cập nhật', 'Trạng thái tài khoản đã được làm mới.');
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message || 'Không thể làm mới');
    } finally {
      setVerifyBusy(false);
    }
  }

  const email = (user as any)?.email as string | undefined;
  const needsVerification = !!email && !isInternalMedEmail(email) && !(user as any)?.emailVerified;
  const isWebPush = pushPlatform === 'web';
  const isExpoToken = !!pushToken && /^Expo(nent)?PushToken\[.+\]$/.test(pushToken);

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Button variant="ghost" onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/profile'))}>
            ← Quay lại
          </Button>
        </View>
        <Text style={styles.pageTitle}>Cài đặt</Text>

        {needsVerification ? (
          <Section title="Xác minh email" icon="✉️">
            <Text style={styles.muted}>Tài khoản của bạn chưa xác minh email. Một số tính năng có thể bị hạn chế.</Text>
            <Button onPress={handleResendVerification} loading={verifyBusy} disabled={verifyBusy} style={styles.mt}>
              Gửi lại email xác minh
            </Button>
            <Button variant="secondary" onPress={handleReloadUser} loading={verifyBusy} disabled={verifyBusy} style={styles.mt}>
              Tôi đã xác minh (làm mới)
            </Button>
          </Section>
        ) : null}

        <Section title="Bảo mật" icon="🔐">
          <Text style={styles.muted}>Quản trị viên không thể đổi mật khẩu thay bạn. Bạn phải xác nhận bằng mật khẩu hiện tại.</Text>
          {!showChangePassword ? (
            <>
              {passwordNotice ? <Notice tone="success" icon={false}><Text style={{ color: '#166534', fontWeight: '700' }}>{passwordNotice}</Text></Notice> : null}
              <Button
                variant="secondary"
                block
                style={styles.mt}
                onPress={() => {
                  setPasswordError(null);
                  setShowChangePassword(true);
                }}
                accessibilityLabel="Mở đổi mật khẩu"
              >
                Đổi mật khẩu
              </Button>
            </>
          ) : (
            <View style={styles.pwForm}>
              <PasswordField
                label="Mật khẩu hiện tại"
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Nhập mật khẩu hiện tại"
                visible={showCurrentPw}
                onToggleVisible={() => setShowCurrentPw((v) => !v)}
              />
              <PasswordField
                label="Mật khẩu mới"
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Ít nhất 8 ký tự"
                visible={showNewPw}
                onToggleVisible={() => setShowNewPw((v) => !v)}
              />
              <PasswordField
                label="Nhập lại mật khẩu mới"
                value={confirmNewPassword}
                onChangeText={setConfirmNewPassword}
                placeholder="Nhập lại mật khẩu mới"
                visible={showConfirmPw}
                onToggleVisible={() => setShowConfirmPw((v) => !v)}
              />
              {passwordError ? <Notice tone="error" icon={false}><Text style={{ color: '#991b1b' }}>{passwordError}</Text></Notice> : null}
              {passwordNotice ? <Notice tone="success" icon={false}><Text style={{ color: '#166534', fontWeight: '700' }}>{passwordNotice}</Text></Notice> : null}
              <View style={styles.pwActions}>
                <Button
                  variant="ghost"
                  style={{ flex: 1 }}
                  disabled={passwordSaving}
                  onPress={() => resetPasswordForm(true)}
                >
                  Hủy
                </Button>
                <Button
                  style={{ flex: 1 }}
                  onPress={() => void handleChangePassword()}
                  loading={passwordSaving}
                  disabled={passwordSaving}
                >
                  Xác nhận đổi
                </Button>
              </View>
            </View>
          )}
        </Section>

        <Section title="Cỡ chữ" icon="🔠">
          <Text style={styles.muted}>Chọn cỡ chữ dễ đọc nhất với bạn (lưu trên thiết bị).</Text>
          <View style={styles.scaleRow}>
            {(['sm', 'md', 'lg'] as const).map((value) => (
              <Button
                key={value}
                variant={fontScale === value ? 'primary' : 'secondary'}
                onPress={async () => {
                  await setFontScale(value);
                }}
                style={styles.scaleBtn}
              >
                {FONT_SCALE_LABEL[value]}
              </Button>
            ))}
          </View>
        </Section>

        <Section title="Cài đặt nhắc lại" icon="🔁">
          <Text style={styles.muted}>Áp dụng cho các lần uống tiếp theo. Mặc định: 10 phút × 3 lần.</Text>
          <Text style={styles.label}>Nhắc lại sau (phút)</Text>
          <Input value={snoozeMinutes} onChangeText={setSnoozeMinutes} keyboardType="number-pad" placeholder="10" />
          <Text style={styles.label}>Số lần nhắc lại tối đa</Text>
          <Input value={snoozeMax} onChangeText={setSnoozeMax} keyboardType="number-pad" placeholder="3" />
          <Button onPress={saveNotificationSettings} loading={saving} disabled={saving} style={styles.mt}>
            Lưu cài đặt nhắc lại
          </Button>
        </Section>

        <Section title="Âm thanh và thông báo" icon="🔊">
          <Text style={styles.muted}>
            {Platform.OS === 'web'
              ? 'Trên trình duyệt, âm thanh và kiểu hiển thị do hệ điều hành/trình duyệt quyết định. Hãy bật quyền thông báo cho trang này.'
              : 'Trên ứng dụng di động, âm thanh nhắc được điều khiển bởi hệ thống thông báo đẩy của thiết bị. Hãy bật quyền thông báo và âm thanh trong cài đặt điện thoại.'}
          </Text>
        </Section>

        <Section title="Thông báo đẩy" icon="🔔">
          <Text style={styles.muted}>
            {isWebPush ? 'Nhắc uống thuốc ngay trên trình duyệt này (Web Push).' : 'Nhắc uống thuốc ngay trên thiết bị này.'}
          </Text>
          <Button variant="secondary" onPress={handleRegisterPush} loading={pushBusy} disabled={pushBusy} style={styles.mt}>
            Bật / kiểm tra thông báo đẩy
          </Button>
          <Text style={styles.hint}>
            {Platform.OS === 'web'
              ? 'Web Push chỉ hoạt động trên localhost hoặc HTTPS. Trình duyệt sẽ hỏi quyền thông báo; hãy chọn “Cho phép”. Nếu tab hoặc trình duyệt bị đóng hoàn toàn, thông báo có thể không tới (tùy trình duyệt). Trên iPhone/iPad Safari cần “Thêm vào màn hình chính” (PWA).'
              : 'Với Expo SDK 58, Expo Go không nhận được thông báo đẩy từ xa. Cần cài bản development/preview build (EAS) trên điện thoại thật. Sau khi cấp quyền, token phải bắt đầu bằng ExpoPushToken[...].'}
          </Text>
          {pushToken ? (
            <View style={styles.tokenBox}>
              <Text style={styles.label}>{isWebPush ? 'Token Web Push (đầy đủ)' : 'Token thiết bị (đầy đủ)'}</Text>
              <Text style={styles.tokenText} selectable>
                {pushToken}
              </Text>
              {isWebPush ? (
                <Notice tone="success" icon={false}>
                  <Text style={{ color: '#166534' }}>
                    Đã đăng ký Web Push. Token FCM này được backend dùng để gửi thông báo qua Firebase Cloud Messaging.
                  </Text>
                </Notice>
              ) : !isExpoToken ? (
                <Notice tone="error" icon={false}>
                  <Text style={{ color: '#991b1b' }}>
                    Token này không phải Expo Push Token. Backend có thể không gửi được bằng Expo Push Service;
                    hãy kiểm tra lại projectId và dùng development build.
                  </Text>
                </Notice>
              ) : null}
              <Button
                variant="secondary"
                onPress={() => void Share.share({ message: pushToken })}
                style={styles.mt}
              >
                Chia sẻ token
              </Button>
              <Text style={styles.hint}>
                Nhấn giữ token để chọn và sao chép, hoặc bấm “Chia sẻ token” để gửi sang máy khác.
              </Text>
            </View>
          ) : null}
        </Section>

        <Section title="Kết nối máy chủ (chẩn đoán)" icon="🖧">
          <Text style={styles.muted}>Nếu báo “không kết nối được máy chủ”, kiểm tra backend đang chạy và địa chỉ API bên dưới (thiết bị thật phải dùng IP LAN của máy chạy backend, không dùng localhost).</Text>
          <Text style={styles.code} selectable>{API_BASE}</Text>
        </Section>

        <Section title="Thông báo cho người thân" icon="👨‍👩‍👧">
          <Text style={styles.muted}>Người thân sẽ nhận thông báo khi bạn bỏ lỡ một lần uống thuốc.</Text>
          {connLoading ? <Text style={styles.muted}>Đang tải…</Text> : null}
          {!connLoading && connError ? <Notice tone="error" icon={false}><Text style={{ color: '#991b1b' }}>{connError}</Text></Notice> : null}
          {!connLoading && !connError && connections.length === 0 ? (
            <Text style={styles.muted}>
              Chưa có người thân kết nối. Mở “Người thân” để thêm.
            </Text>
          ) : null}
          {connections.map((conn) => (
            <View key={conn.id} style={styles.connRow}>
              <Text style={styles.connLabel} numberOfLines={2}>
                Cho {conn.user.displayName ?? (conn.user as any).phone ?? 'người thân'} nhận thông báo khi tôi bỏ lỡ
              </Text>
              <Button
                variant={conn.permissions.relative_alerts ? 'primary' : 'secondary'}
                size="md"
                disabled={connBusyId === conn.id}
                onPress={() => void toggleRelativeAlerts(conn, !conn.permissions.relative_alerts)}
                style={{ minWidth: 84 }}
              >
                {conn.permissions.relative_alerts ? 'Bật' : 'Tắt'}
              </Button>
            </View>
          ))}
          <Button variant="secondary" onPress={() => router.push('/family' as any)} style={styles.mt}>
            Quản lý kết nối người thân
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
  pageTitle: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: spacing.lg },
  text: { ...typography.body, marginBottom: 4, color: colors.text },
  muted: { ...typography.body, color: colors.muted, marginBottom: 4 },
  label: { ...typography.bodySm, fontWeight: '700', color: colors.text, marginTop: spacing.sm, marginBottom: 6 },
  hint: { ...typography.caption, color: colors.muted, marginTop: spacing.sm, lineHeight: 18 },
  code: { ...typography.caption, color: colors.text, marginTop: 4, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  tokenBox: { marginTop: spacing.sm, padding: spacing.sm, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  tokenText: { ...typography.caption, color: colors.text, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: 4 },
  mt: { marginTop: spacing.sm },
  scaleRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  scaleBtn: { flex: 1 },
  connRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  connLabel: { ...typography.bodySm, color: colors.text, flex: 1 },
  pwForm: { marginTop: spacing.sm },
  pwField: { marginBottom: spacing.md },
  pwLabel: { ...typography.body, fontWeight: '800', color: colors.text, marginBottom: 8 },
  pwWrap: {
    position: 'relative',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  pwInput: {
    minHeight: 60,
    fontSize: 18,
    lineHeight: 24,
    paddingVertical: 16,
    paddingLeft: spacing.md,
    paddingRight: 70,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: '#fff',
    color: colors.text,
  },
  pwEye: {
    position: 'absolute',
    right: 6,
    top: 6,
    bottom: 6,
    width: 56,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft || colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pwEyeText: { fontSize: 11, fontWeight: '800', color: colors.primary, marginTop: 1 },
  pwActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});

function PasswordField({
  label,
  value,
  onChangeText,
  placeholder,
  visible,
  onToggleVisible,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  visible: boolean;
  onToggleVisible: () => void;
}) {
  return (
    <View style={styles.pwField}>
      <Text style={styles.pwLabel}>{label}</Text>
      <View style={styles.pwWrap}>
        <Input
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!visible}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.pwInput}
        />
        <Pressable
          onPress={onToggleVisible}
          hitSlop={8}
          style={styles.pwEye}
          accessibilityRole="button"
          accessibilityLabel={visible ? `Ẩn ${label}` : `Hiện ${label}`}
        >
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={24} color={colors.primary} />
          <Text style={styles.pwEyeText}>{visible ? 'Ẩn' : 'Hiện'}</Text>
        </Pressable>
      </View>
    </View>
  );
}
