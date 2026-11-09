import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Card, Button, Input, Text } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { login, register, sendPasswordReset } = useAuth();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (params?.mode === 'register') setMode('register');
    else if (params?.mode === 'login') setMode('login');
  }, [params?.mode]);

  async function handleSubmit() {
    setError('');
    if (!identifier.trim() || password.length < 6) {
      setError('Vui lòng nhập đầy đủ thông tin (mật khẩu tối thiểu 6 ký tự)');
      return;
    }
    if (mode === 'register' && !displayName.trim()) {
      setError('Vui lòng nhập họ tên');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(identifier.trim(), password);
      } else {
        await register(identifier.trim(), password, {
          displayName: displayName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          dateOfBirth: dateOfBirth.trim() || undefined,
        });
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || (mode === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>💊</Text>
              </View>
              <View>
                <Text style={styles.brandText}>MedReminder</Text>
                <Text style={styles.brandSub}>Nhắc uống thuốc</Text>
              </View>
            </View>
            <Text style={styles.title}>{mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản mới'}</Text>
            <Text style={styles.subtitle}>
              {mode === 'login'
                ? 'Nhập thông tin để tiếp tục sử dụng ứng dụng.'
                : 'Điền thông tin bên dưới. Các mục có dấu * là bắt buộc.'}
            </Text>
          </View>

          <Card style={styles.card}>
            <View style={styles.segmented}>
              <Button
                variant={mode === 'login' ? 'primary' : 'secondary'}
                size="md"
                style={styles.segBtn}
                onPress={() => setMode('login')}
              >
                Đăng nhập
              </Button>
              <Button
                variant={mode === 'register' ? 'primary' : 'secondary'}
                size="md"
                style={styles.segBtn}
                onPress={() => setMode('register')}
              >
                Đăng ký
              </Button>
            </View>

            {mode === 'register' ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
                <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
                <Input
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  autoCapitalize="words"
                />

                <Text style={[styles.label, styles.labelTop]}>Số điện thoại</Text>
                <Input
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Ví dụ: 0912345678"
                  keyboardType="phone-pad"
                />

                <Text style={[styles.label, styles.labelTop]}>Địa chỉ</Text>
                <Input
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Số nhà, đường, quận/huyện, tỉnh/thành"
                />

                <Text style={[styles.label, styles.labelTop]}>Ngày sinh</Text>
                <Input
                  value={dateOfBirth}
                  onChangeText={setDateOfBirth}
                  placeholder="Năm-Tháng-Ngày (vd: 1950-05-20)"
                />
                <Text style={styles.hint}>Định dạng: YYYY-MM-DD</Text>
              </View>
            ) : null}

            <View style={styles.sectionBlock}>
              {mode === 'register' ? <Text style={styles.sectionTitle}>Thông tin đăng nhập</Text> : null}
              <Text style={[styles.label, mode === 'login' ? null : styles.labelTopSm]}>Email hoặc số điện thoại <Text style={styles.required}>*</Text></Text>
              <Input
                value={identifier}
                onChangeText={setIdentifier}
                placeholder="ten@vi-du.com hoặc 0912345678"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="username"
              />

              <Text style={[styles.label, styles.labelTop]}>Mật khẩu <Text style={styles.required}>*</Text></Text>
              <Input
                value={password}
                onChangeText={setPassword}
                placeholder="Tối thiểu 6 ký tự"
                secureTextEntry
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <Text style={styles.hint}>Mật khẩu cần ít nhất 6 ký tự.</Text>
              {mode === 'login' ? (
                <Text
                  style={styles.forgotLink}
                  onPress={async () => {
                    const id = identifier.trim();
                    if (!id) {
                      Alert.alert('Cần thông tin', 'Vui lòng nhập email hoặc số điện thoại trước.');
                      return;
                    }
                    try {
                      await sendPasswordReset(id);
                      Alert.alert('Đã gửi', 'Nếu tài khoản dùng email, hãy kiểm tra hộp thư để đặt lại mật khẩu.');
                    } catch (e: any) {
                      Alert.alert('Không thể gửi', e?.message || 'Vui lòng kiểm tra thông tin.');
                    }
                  }}
                >
                  Quên mật khẩu?
                </Text>
              ) : null}
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <Button loading={loading} onPress={handleSubmit} style={styles.submitBtn}>
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>

            <Text style={styles.switchText}>
              {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <Text style={styles.switchLink} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Đăng ký ngay' : 'Đăng nhập'}
              </Text>
            </Text>

            <Button variant="ghost" onPress={() => router.replace('/welcome')} style={styles.backBtn}>
              ← Quay lại trang giới thiệu
            </Button>
          </Card>
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
    flexGrow: 1,
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  header: {
    marginBottom: spacing.xl,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    fontSize: 24,
  },
  brandText: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  brandSub: {
    ...typography.caption,
    color: colors.muted,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
    lineHeight: 24,
  },
  card: {
    marginBottom: spacing.xl,
  },
  segmented: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.surface2,
    borderRadius: radius.md,
    padding: spacing.xs,
    marginBottom: spacing.lg,
  },
  segBtn: {
    flex: 1,
  },
  sectionBlock: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.primaryDark,
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  labelTop: {
    marginTop: spacing.lg,
  },
  labelTopSm: {
    marginTop: spacing.sm,
  },
  required: {
    color: colors.danger,
  },
  hint: {
    ...typography.caption,
    color: colors.muted,
    marginTop: 6,
  },
  errorBox: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: '#f0c3bf',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  error: {
    ...typography.bodySm,
    color: '#7a1a15',
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
  switchText: {
    ...typography.bodySm,
    color: colors.muted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  switchLink: {
    color: colors.primary,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  backBtn: {
    marginTop: spacing.sm,
  },
  forgotLink: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
    textAlign: 'right',
    marginTop: spacing.sm,
  },
});

