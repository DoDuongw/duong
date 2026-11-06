import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Card, Button, Input } from '../components';
import { colors, spacing, typography, radius } from '../theme';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (!identifier.trim() || password.length < 6) {
      setError('Vui lòng nhập đầy đủ thông tin (mật khẩu tối thiểu 6 ký tự)');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(identifier.trim(), password);
      } else {
        await register(identifier.trim(), password, {});
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || 'Đăng nhập thất bại');
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
              <Text style={styles.brandText}>Nhắc lịch uống thuốc</Text>
            </View>
            <Text style={styles.title}>Nhắc lịch uống thuốc cho người cao tuổi</Text>
            <Text style={styles.subtitle}>
              Giúp uống thuốc đúng giờ, đúng liều; người thân theo dõi từ xa và nhận thông báo khi bỏ lỡ
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
                Tạo tài khoản
              </Button>
            </View>

            <Text style={styles.label}>Email hoặc số điện thoại</Text>
            <Input
              value={identifier}
              onChangeText={setIdentifier}
              placeholder="ten@vi-du.com hoặc 0912345678"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="username"
            />

            <Text style={[styles.label, styles.labelTop]}>Mật khẩu</Text>
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Tối thiểu 6 ký tự"
              secureTextEntry
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button loading={loading} onPress={handleSubmit} style={styles.submitBtn}>
              {mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
            </Button>

            <Text style={styles.switchText}>
              {mode === 'login' ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <Text style={styles.switchLink} onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Tạo tài khoản ngay' : 'Đăng nhập'}
              </Text>
            </Text>
          </Card>

          <Text style={styles.footer}>Ứng dụng nhắc lịch uống thuốc và theo dõi sức khỏe người cao tuổi</Text>
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
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMarkText: {
    fontSize: 20,
  },
  brandText: {
    ...typography.h2,
    color: colors.primaryDark,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.muted,
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
  label: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: colors.text,
  },
  labelTop: {
    marginTop: spacing.lg,
  },
  error: {
    ...typography.bodySm,
    color: colors.danger,
    marginTop: spacing.md,
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
  footer: {
    ...typography.caption,
    color: colors.muted,
    textAlign: 'center',
    marginTop: 'auto',
    paddingTop: spacing.xl,
  },
});

