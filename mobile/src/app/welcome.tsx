import { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors } from '../theme';
import { useAuth } from '../hooks/useAuth';
import { isValidAddress, isValidPhone, looksLikePhone } from '../utils/phone';
import { Text, DateField, isValidYmd } from '../components';

type IconName = keyof typeof Ionicons.glyphMap;
type Audience = 'elder' | 'family';

const NAVY = '#0C4A6E';
const PRIMARY = colors.primary || '#0284C7';
const INK = colors.text || '#0F172A';
const MUTED = colors.muted || '#475569';
const BORDER = colors.border || '#E2E8F0';
const BG = colors.bg || '#F8FAFC';
const TINT = '#E8F3FB';
const SUCCESS = '#16A34A';
const WHITE = '#FFFFFF';

const AUDIENCES: Record<
  Audience,
  { tab: string; intro: string; items: { icon: IconName; title: string; text: string }[] }
> = {
  elder: {
    tab: 'Dành cho ông bà',
    intro: 'Mọi thao tác được thiết kế đơn giản, dễ nhìn và dễ thực hiện mỗi ngày.',
    items: [
      {
        icon: 'volume-high-outline',
        title: 'Nhắc nhở rõ ràng',
        text: 'Nhận thông báo khi đến thời gian uống thuốc theo lịch đã thiết lập.',
      },
      {
        icon: 'text-outline',
        title: 'Thông tin dễ quan sát',
        text: 'Tên thuốc, thời gian và hướng dẫn được trình bày rõ ràng để dễ theo dõi.',
      },
      {
        icon: 'checkmark-circle-outline',
        title: 'Xác nhận chỉ với một thao tác',
        text: 'Sau khi uống thuốc, chỉ cần chọn “Đã uống” để cập nhật tình trạng.',
      },
      {
        icon: 'heart-outline',
        title: 'Theo dõi sức khỏe',
        text: 'Ghi nhận thông tin sức khỏe để tiện xem lại trong quá trình chăm sóc.',
      },
    ],
  },
  family: {
    tab: 'Dành cho con cháu',
    intro: 'Dễ dàng đồng hành và quan tâm đến người thân ngay cả khi không ở cạnh.',
    items: [
      {
        icon: 'people-outline',
        title: 'Kết nối người thân',
        text: 'Thiết lập kết nối để cùng hỗ trợ quản lý lịch uống thuốc.',
      },
      {
        icon: 'notifications-outline',
        title: 'Theo dõi thông báo',
        text: 'Nhận thông tin khi người thân xác nhận tình trạng uống thuốc, theo cấu hình ứng dụng.',
      },
      {
        icon: 'alert-circle-outline',
        title: 'Chủ động khi bỏ lỡ lịch',
        text: 'Nắm được những liều chưa được xác nhận để chủ động liên hệ nhắc nhở.',
      },
      {
        icon: 'document-text-outline',
        title: 'Xem lại lịch sử',
        text: 'Theo dõi lịch sử uống thuốc và thông tin sức khỏe được chia sẻ.',
      },
    ],
  },
};

const HIGHLIGHTS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'calendar-clear-outline', title: 'Quản lý lịch thuốc', text: 'Tạo lịch uống theo giờ, liều lượng và hướng dẫn.' },
  { icon: 'notifications-outline', title: 'Nhắc đúng giờ', text: 'Nhận thông báo và xác nhận “Đã uống” nhanh chóng.' },
  { icon: 'people-outline', title: 'Kết nối người thân', text: 'Chia sẻ thông tin phù hợp để gia đình cùng theo dõi.' },
  { icon: 'stats-chart-outline', title: 'Lịch sử rõ ràng', text: 'Xem lại các lần xác nhận và liều chưa xác nhận.' },
];

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'person-add-outline', title: 'Tạo tài khoản', text: 'Đăng ký hoặc đăng nhập để bắt đầu.' },
  { icon: 'add-circle-outline', title: 'Thiết lập lịch thuốc', text: 'Nhập thuốc, giờ uống, liều lượng theo hướng dẫn.' },
  { icon: 'checkmark-done-circle-outline', title: 'Theo dõi mỗi ngày', text: 'Nhận nhắc, xác nhận và xem lịch sử.' },
];

function SectionHeading({
  eyebrow,
  title,
  description,
  light = false,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  light?: boolean;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.eyebrow, light && styles.eyebrowLight]}>{eyebrow}</Text>
      <Text style={[styles.sectionTitle, light && styles.sectionTitleLight]}>{title}</Text>
      {!!description && (
        <Text style={[styles.sectionDescription, light && styles.sectionDescriptionLight]}>
          {description}
        </Text>
      )}
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  light = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  light?: boolean;
  icon?: IconName;
}) {
  return (
    <TouchableOpacity
      style={[styles.primaryButton, light && styles.primaryButtonLight]}
      onPress={onPress}
      activeOpacity={0.86}
      accessibilityRole="button"
    >
      {!!icon && <Ionicons name={icon} size={18} color={light ? NAVY : WHITE} />}
      <Text style={[styles.primaryButtonText, light && styles.primaryButtonTextLight]}>
        {label}
      </Text>
      <Ionicons name="arrow-forward" size={17} color={light ? NAVY : WHITE} />
    </TouchableOpacity>
  );
}

export default function WelcomeScreen() {
  const { login, register, sendPasswordReset } = useAuth();
  const [audience, setAudience] = useState<Audience>('elder');
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function resetForm() {
    setError('');
    setPassword('');
  }

  function openAuth(mode: 'login' | 'register') {
    resetForm();
    setAuthMode(mode);
  }

  async function handleForgotPassword() {
    const id = identifier.trim();
    if (!id) {
      Alert.alert('Cần thông tin', 'Vui lòng nhập email hoặc số điện thoại ở ô đăng nhập trước.');
      return;
    }
    try {
      await sendPasswordReset(id);
      Alert.alert('Đã gửi', 'Nếu tài khoản dùng email, hãy kiểm tra hộp thư để đặt lại mật khẩu.');
    } catch (e: any) {
      Alert.alert('Không thể gửi', e?.message || 'Vui lòng kiểm tra thông tin đăng nhập.');
    }
  }

  function validate(): string | null {
    const value = identifier.trim();
    if (!value) return 'Vui lòng nhập email hoặc số điện thoại';
    if (looksLikePhone(value)) {
      if (!isValidPhone(value)) return 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)';
    } else if (!/^\S+@\S+\.\S+$/.test(value)) {
      return 'Email không hợp lệ';
    }
    if (password.length < 6) return 'Mật khẩu phải có ít nhất 6 ký tự';

    if (authMode === 'register') {
      if (!displayName.trim()) return 'Vui lòng nhập họ tên';
      const dob = dateOfBirth.trim().slice(0, 10);
      if (!dob) return 'Vui lòng chọn ngày sinh';
      if (!isValidYmd(dob)) return 'Ngày sinh không hợp lệ. Vui lòng chọn lại';
      const today = new Date();
      const todayY = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      if (dob > todayY) return 'Ngày sinh không được lớn hơn ngày hiện tại';
      const [y] = dob.split('-').map(Number);
      const age = today.getFullYear() - y;
      if (age < 0 || age > 120) return 'Ngày sinh không hợp lệ';
      if (phone.trim() && !isValidPhone(phone)) {
        return 'Số điện thoại không hợp lệ (10 chữ số, ví dụ 0912345678)';
      }
      if (address.trim() && !isValidAddress(address)) {
        return 'Địa chỉ tối đa 200 ký tự';
      }
    }
    return null;
  }

  async function handleSubmit() {
    setError('');
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setLoading(true);
    try {
      if (authMode === 'login') {
        await login(identifier.trim(), password);
      } else {
        await register(identifier.trim(), password, {
          displayName: displayName.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          dateOfBirth: dateOfBirth.trim().slice(0, 10),
        });
      }
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message || (authMode === 'login' ? 'Đăng nhập thất bại' : 'Đăng ký thất bại'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
        {/* HERO */}
        <View style={styles.hero}>
          <View style={styles.heroOrbOne} />
          <View style={styles.heroOrbTwo} />
          <View style={styles.heroInner}>
            <View style={styles.topBar}>
              <View style={styles.brandRow}>
                <View style={styles.brandMark}>
                  <Ionicons name="medkit" size={23} color={WHITE} />
                </View>
                <View>
                  <Text style={styles.brandText}>MedReminder</Text>
                  <Text style={styles.brandCaption}>CHĂM SÓC SỨC KHỎE MỖI NGÀY</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => openAuth('login')} style={styles.topLogin} accessibilityRole="button">
                <Text style={styles.topLoginText}>Đăng nhập</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.heroPill}>
              <Ionicons name="heart" size={13} color="#BAE6FD" />
              <Text style={styles.heroPillText}>ĐỒNG HÀNH CÙNG GIA ĐÌNH</Text>
            </View>

            <Text style={styles.heroTitle}>
              Nhắc thuốc đúng giờ,{'\n'}
              <Text style={styles.heroTitleAccent}>an tâm mỗi ngày.</Text>
            </Text>
            <Text style={styles.heroDescription}>
              Hỗ trợ người cao tuổi uống thuốc đúng lịch và theo dõi sức khỏe. Giúp con cháu yên tâm khi ở xa.
            </Text>

            <View style={styles.heroActions}>
              <PrimaryButton label="Tạo tài khoản miễn phí" onPress={() => openAuth('register')} light icon="person-add-outline" />
              <TouchableOpacity onPress={() => openAuth('login')} style={styles.secondaryLink} activeOpacity={0.8}>
                <Text style={styles.secondaryLinkText}>Tôi đã có tài khoản — Đăng nhập</Text>
              </TouchableOpacity>
              <View style={styles.heroTrustRow}>
                <View style={styles.heroTrustItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#86EFAC" />
                  <Text style={styles.heroTrustText}>Dễ sử dụng</Text>
                </View>
                <View style={styles.heroTrustItem}>
                  <Ionicons name="checkmark-circle" size={16} color="#86EFAC" />
                  <Text style={styles.heroTrustText}>Có người thân đồng hành</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* PREVIEW */}
        <View style={styles.previewOuter}>
          <View style={styles.previewCard}>
            <View style={styles.previewTop}>
              <View>
                <Text style={styles.previewOverline}>TỔNG QUAN HÔM NAY</Text>
                <Text style={styles.previewTitle}>Lịch uống thuốc</Text>
              </View>
              <View style={styles.todayBadge}>
                <View style={styles.todayDot} />
                <Text style={styles.todayBadgeText}>Hôm nay</Text>
              </View>
            </View>
            <View style={styles.progressRow}>
              <View style={styles.progressTrack}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.progressText}>1/3</Text>
            </View>
            <Text style={styles.progressCaption}>Minh họa lịch nhắc và xác nhận đã uống</Text>

            {[
              { time: '07:30', name: 'Thuốc buổi sáng', state: 'done' },
              { time: '12:00', name: 'Thuốc buổi trưa', state: 'now' },
              { time: '19:00', name: 'Thuốc buổi tối', state: 'next' },
            ].map((dose) => (
              <View key={dose.time} style={[styles.doseRow, dose.state === 'now' && styles.doseRowNow]}>
                <View style={styles.doseTimeBox}>
                  <Text style={styles.doseTime}>{dose.time}</Text>
                </View>
                <View style={styles.doseCopy}>
                  <Text style={styles.doseName}>{dose.name}</Text>
                </View>
                <View
                  style={[
                    styles.doseState,
                    dose.state === 'done' && styles.doseStateDone,
                    dose.state === 'now' && styles.doseStateNow,
                  ]}
                >
                  <Ionicons
                    name={dose.state === 'done' ? 'checkmark-circle' : dose.state === 'now' ? 'alarm-outline' : 'time-outline'}
                    size={15}
                    color={dose.state === 'done' ? SUCCESS : dose.state === 'now' ? '#B45309' : MUTED}
                  />
                  <Text
                    style={[
                      styles.doseStateText,
                      dose.state === 'done' && { color: SUCCESS },
                      dose.state === 'now' && { color: '#B45309' },
                    ]}
                  >
                    {dose.state === 'done' ? 'Đã uống' : dose.state === 'now' ? 'Đến giờ' : 'Sắp tới'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* HIGHLIGHTS */}
        <View style={styles.section}>
          <SectionHeading
            eyebrow="TÍNH NĂNG CHÍNH"
            title="Đủ những gì cần thiết để theo dõi thuốc mỗi ngày"
          />
          <View style={styles.featureStack}>
            {HIGHLIGHTS.map((item, index) => (
              <View key={item.title} style={styles.featureCard}>
                <View style={styles.featureCardTop}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={item.icon} size={22} color={PRIMARY} />
                  </View>
                  <Text style={styles.featureNumber}>0{index + 1}</Text>
                </View>
                <Text style={styles.featureTitle}>{item.title}</Text>
                <Text style={styles.featureText}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* AUDIENCE */}
        <View style={[styles.section, styles.benefitSection]}>
          <SectionHeading
            eyebrow="DÀNH CHO AI"
            title="Cho người dùng và người thân"
          />
          <View style={styles.audienceTabs}>
            {(Object.keys(AUDIENCES) as Audience[]).map((key) => {
              const active = audience === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.audienceTab, active && styles.audienceTabActive]}
                  onPress={() => setAudience(key)}
                  activeOpacity={0.85}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={key === 'elder' ? 'person-outline' : 'people-outline'}
                    size={16}
                    color={active ? WHITE : MUTED}
                  />
                  <Text style={[styles.audienceTabText, active && styles.audienceTabTextActive]}>
                    {AUDIENCES[key].tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.benefitList}>
            {AUDIENCES[audience].items.slice(0, 2).map((item, index) => (
              <View key={item.title} style={[styles.benefitItem, index === 1 && { borderBottomWidth: 0 }]}>
                <View style={styles.benefitIcon}>
                  <Ionicons name={item.icon} size={20} color={PRIMARY} />
                </View>
                <View style={styles.benefitCopy}>
                  <Text style={styles.benefitTitle}>{item.title}</Text>
                  <Text style={styles.benefitText} numberOfLines={2}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* STEPS */}
        <View style={[styles.section, { marginBottom: 18 }]}>
          <SectionHeading
            eyebrow="BẮT ĐẦU NHANH"
            title="3 bước sử dụng"
          />
          <View style={styles.stepsList}>
            {STEPS.map((step, index) => (
              <View key={step.title} style={styles.stepItem}>
                <View style={styles.stepRail}>
                  <View style={styles.stepIcon}>
                    <Ionicons name={step.icon} size={20} color={WHITE} />
                  </View>
                  {index !== STEPS.length - 1 && <View style={styles.stepConnector} />}
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepText}>{step.text}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!authMode} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKav}>
            <View style={styles.modalCard}>
              <View style={styles.authHeader}>
                <View style={styles.authTitleRow}>
                  <View style={styles.authIconWrap}>
                    <Ionicons name={authMode === 'login' ? 'log-in-outline' : 'person-add-outline'} size={18} color={PRIMARY} />
                  </View>
                  <View>
                    <Text style={styles.authTitle}>{authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}</Text>
                    <Text style={styles.authSub}>{authMode === 'login' ? 'Chào mừng bạn quay lại' : 'Điền thông tin để bắt đầu'}</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => { setAuthMode(null); setError(''); }} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={MUTED} />
                </TouchableOpacity>
              </View>

              <View style={styles.authTabs}>
                <TouchableOpacity
                  style={[styles.authTab, authMode === 'login' && styles.authTabActive]}
                  onPress={() => { setAuthMode('login'); setError(''); }}
                >
                  <Text style={[styles.authTabText, authMode === 'login' && styles.authTabTextActive]}>Đăng nhập</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.authTab, authMode === 'register' && styles.authTabActive]}
                  onPress={() => { setAuthMode('register'); setError(''); }}
                >
                  <Text style={[styles.authTabText, authMode === 'register' && styles.authTabTextActive]}>Đăng ký</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
                {authMode === 'register' ? (
                  <>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Họ và tên <Text style={styles.req}>*</Text></Text>
                      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Nguyễn Văn A" placeholderTextColor="#94A3B8" />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Số điện thoại</Text>
                      <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="0912345678" placeholderTextColor="#94A3B8" keyboardType="phone-pad" />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Ngày sinh <Text style={styles.req}>*</Text></Text>
                      <DateField
                        label=""
                        value={dateOfBirth}
                        onChange={setDateOfBirth}
                        containerStyle={{ marginBottom: 0 }}
                        placeholder="Chọn ngày sinh"
                      />
                    </View>
                    <View style={styles.fieldGroup}>
                      <Text style={styles.fieldLabel}>Địa chỉ</Text>
                      <TextInput style={styles.input} value={address} onChangeText={setAddress} placeholder="Số nhà, đường, quận/huyện..." placeholderTextColor="#94A3B8" />
                    </View>
                  </>
                ) : null}

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>{authMode === 'register' ? 'Email/SĐT đăng nhập' : 'Email hoặc SĐT'} <Text style={styles.req}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="ten@vi-du.com hoặc 0912345678"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Mật khẩu <Text style={styles.req}>*</Text></Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Tối thiểu 6 ký tự"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry
                  />
                  {authMode === 'login' ? (
                    <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotBtn}>
                      <Text style={styles.forgotText}>Quên mật khẩu?</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                {error ? (
                  <View style={styles.authErrorBox}>
                    <Ionicons name="alert-circle" size={16} color="#DC2626" />
                    <Text style={styles.authError}>{error}</Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitBtnText}>
                    {loading ? 'Đang xử lý...' : (authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản')}
                  </Text>
                  {!loading && <Ionicons name="arrow-forward" size={18} color={WHITE} />}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: NAVY },
  scrollView: { flex: 1, backgroundColor: BG },
  scroll: { flexGrow: 1, paddingBottom: 10 },
  section: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 16,
    marginTop: 20,
  },

  hero: {
    backgroundColor: NAVY,
    paddingTop: 8,
    paddingBottom: 72,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
  },
  heroInner: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 22 },
  heroOrbOne: {
    position: 'absolute',
    width: 290,
    height: 290,
    borderRadius: 145,
    top: -130,
    right: -90,
    backgroundColor: 'rgba(56,189,248,0.13)',
  },
  heroOrbTwo: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    bottom: 20,
    left: -120,
    backgroundColor: 'rgba(125,211,252,0.08)',
  },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandMark: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: { color: WHITE, fontSize: 19, fontWeight: '800', letterSpacing: -0.4 },
  brandCaption: { color: '#BAE6FD', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
  topLogin: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  topLoginText: { color: WHITE, fontSize: 13, fontWeight: '700' },
  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.11)',
    marginBottom: 10,
  },
  heroPillText: { color: '#BAE6FD', fontSize: 10, fontWeight: '800', letterSpacing: 0.8 },
  heroTitle: { color: WHITE, fontSize: 30, lineHeight: 37, fontWeight: '900', letterSpacing: -0.8, marginBottom: 8 },
  heroTitleAccent: { color: '#7DD3FC' },
  heroDescription: { color: '#D5EAF5', fontSize: 14, lineHeight: 21, marginBottom: 14 },
  heroActions: { gap: 10 },
  primaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 17,
  },
  primaryButtonLight: {
    backgroundColor: WHITE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryButtonText: { color: WHITE, fontSize: 15, fontWeight: '800' },
  primaryButtonTextLight: { color: NAVY },
  outlineButton: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: BORDER,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 17,
  },
  outlineButtonText: { color: NAVY, fontSize: 15, fontWeight: '700' },
  heroExplore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 7 },
  heroExploreText: { color: '#E0F2FE', fontSize: 13, fontWeight: '600' },
  heroTrustRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  heroTrustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroTrustText: { color: '#D5EAF5', fontSize: 12, fontWeight: '600' },
  secondaryLink: { alignItems: 'center', paddingVertical: 8 },
  secondaryLinkText: { color: '#E0F2FE', fontSize: 14, fontWeight: '700', textDecorationLine: 'underline' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 14,
  },
  modalKav: { width: '100%', maxHeight: '90%', alignSelf: 'center', maxWidth: 460 },
  modalCard: {
    backgroundColor: WHITE,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    maxHeight: '100%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalScroll: { flexGrow: 0 },
  modalScrollContent: { paddingBottom: 2 },
  authHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  authTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 8 },
  authIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: TINT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTitle: { color: INK, fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  authSub: { color: MUTED, fontSize: 12, marginTop: 1 },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authTabs: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 3, marginBottom: 10, gap: 3 },
  authTab: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: 'center' },
  authTabActive: {
    backgroundColor: WHITE,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  authTabText: { color: MUTED, fontSize: 13, fontWeight: '700' },
  authTabTextActive: { color: NAVY },
  fieldGroup: { marginBottom: 10 },
  row2: { flexDirection: 'row', gap: 10 },
  fieldLabel: { color: INK, fontSize: 12, fontWeight: '700', marginBottom: 5 },
  req: { color: '#DC2626' },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 11 : 9,
    fontSize: 15,
    color: INK,
  },
  authErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginTop: 2,
    marginBottom: 2,
  },
  authError: { color: '#DC2626', fontSize: 12, fontWeight: '600', flex: 1 },
  submitBtn: {
    backgroundColor: PRIMARY,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { color: WHITE, fontSize: 15, fontWeight: '800' },
  forgotBtn: { alignSelf: 'flex-end', marginTop: 8, paddingVertical: 2 },
  forgotText: { color: PRIMARY, fontSize: 13, fontWeight: '700' },

  previewOuter: { width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 16, marginTop: -44 },
  previewCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  previewTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  previewOverline: { color: MUTED, fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  previewTitle: { color: INK, fontSize: 20, fontWeight: '800', marginTop: 4 },
  todayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EAF7EF', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20 },
  todayDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: SUCCESS },
  todayBadgeText: { color: '#166534', fontSize: 11, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#E8EEF3', flex: 1, overflow: 'hidden' },
  progressFill: { width: '33.33%', height: '100%', borderRadius: 5, backgroundColor: SUCCESS },
  progressText: { color: SUCCESS, fontSize: 13, fontWeight: '800' },
  progressCaption: { color: MUTED, fontSize: 11, marginTop: 7, marginBottom: 12 },
  doseRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, paddingHorizontal: 9, borderRadius: 13, gap: 9 },
  doseRowNow: { backgroundColor: TINT },
  doseTimeBox: { width: 49 },
  doseTime: { color: INK, fontSize: 13, fontWeight: '800' },
  doseCopy: { flex: 1 },
  doseName: { color: INK, fontSize: 13, fontWeight: '700' },
  doseNote: { color: MUTED, fontSize: 10, marginTop: 3 },
  doseState: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  doseStateDone: { backgroundColor: '#EAF7EF', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 20 },
  doseStateNow: { backgroundColor: '#FFF4DF', paddingHorizontal: 7, paddingVertical: 5, borderRadius: 20 },
  doseStateText: { color: MUTED, fontSize: 10, fontWeight: '700' },
  previewFamilyNote: { flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: BORDER, marginTop: 9, paddingTop: 13 },
  previewFamilyIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: '#EAF7EF', alignItems: 'center', justifyContent: 'center' },
  previewFamilyText: { flex: 1, color: MUTED, fontSize: 11, lineHeight: 17 },
  previewDisclaimer: { color: MUTED, fontSize: 10, textAlign: 'center', marginTop: 10 },

  sectionHeading: { marginBottom: 14 },
  eyebrow: { color: PRIMARY, fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginBottom: 6 },
  eyebrowLight: { color: '#BAE6FD' },
  sectionTitle: { color: INK, fontSize: 24, lineHeight: 31, fontWeight: '900', letterSpacing: -0.5 },
  sectionTitleLight: { color: WHITE },
  sectionDescription: { color: MUTED, fontSize: 14, lineHeight: 22, marginTop: 8 },
  sectionDescriptionLight: { color: '#D5EAF5' },

  problemGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  problemCard: {
    width: '48%',
    flexGrow: 1,
    minHeight: 174,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 17,
    padding: 14,
  },
  problemIcon: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  problemTitle: { color: INK, fontSize: 14, lineHeight: 20, fontWeight: '800', marginBottom: 6 },
  problemText: { color: MUTED, fontSize: 12, lineHeight: 19 },
  warmCallout: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#FFF8E9', borderRadius: 15, padding: 15, marginTop: 15 },
  warmCalloutText: { flex: 1, color: '#78551D', fontSize: 13, lineHeight: 21, fontWeight: '600' },

  benefitSection: {
    backgroundColor: '#EEF6FB',
    borderRadius: 16,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 10,
    marginTop: 18,
    maxWidth: 568,
    alignSelf: 'center',
    width: 'auto',
  },
  audienceTabs: { flexDirection: 'row', backgroundColor: '#DCE8F0', borderRadius: 12, padding: 3, gap: 4, marginTop: 10 },
  audienceTab: { flex: 1, minHeight: 42, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 5 },
  audienceTabActive: { backgroundColor: NAVY },
  audienceTabText: { color: MUTED, fontSize: 12, fontWeight: '700' },
  audienceTabTextActive: { color: WHITE },
  audienceIntro: { color: MUTED, fontSize: 13, lineHeight: 21, marginTop: 14, marginBottom: 17 },
  benefitList: { backgroundColor: WHITE, borderRadius: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: '#DCE8F0', marginTop: 10 },
  benefitItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#EDF2F6' },
  benefitIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  benefitCopy: { flex: 1 },
  benefitTitle: { color: INK, fontSize: 14, fontWeight: '800', marginBottom: 2 },
  benefitText: { color: MUTED, fontSize: 12, lineHeight: 18 },
  benefitIndex: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },

  featureStack: { gap: 10 },
  featureCard: { backgroundColor: WHITE, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: BORDER },
  featureCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  featureIcon: { width: 42, height: 42, borderRadius: 12, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  featureNumber: { color: '#CBD5E1', fontSize: 20, fontWeight: '900' },
  featureTitle: { color: INK, fontSize: 16, fontWeight: '800', marginBottom: 3 },
  featureText: { color: MUTED, fontSize: 13, lineHeight: 19 },
  featureDetail: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: 1, borderTopColor: '#EDF2F6', paddingTop: 12, marginTop: 13 },
  featureDetailText: { flex: 1, color: '#526477', fontSize: 12, lineHeight: 19 },

  stepsSection: { backgroundColor: '#F0F7FB', maxWidth: '100%', paddingHorizontal: 22, paddingTop: 34, paddingBottom: 28 },
  stepsList: { gap: 0 },
  stepItem: { flexDirection: 'row', gap: 12, minHeight: 72 },
  stepRail: { width: 40, alignItems: 'center' },
  stepIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  stepConnector: { flex: 1, width: 2, backgroundColor: '#C6DCE9', marginVertical: 2 },
  stepContent: { flex: 1, paddingTop: 1, paddingBottom: 12 },
  stepKicker: { color: PRIMARY, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
  stepTitle: { color: INK, fontSize: 15, fontWeight: '800', marginBottom: 2 },
  stepText: { color: MUTED, fontSize: 13, lineHeight: 19 },
  stepNote: { color: '#64748B', fontSize: 11, lineHeight: 17, marginTop: 6, fontStyle: 'italic' },

  daySection: { backgroundColor: WHITE, paddingVertical: 3 },
  dayCard: { backgroundColor: '#F8FBFD', borderRadius: 20, borderWidth: 1, borderColor: BORDER, padding: 17 },
  dayCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  dayCardEyebrow: { color: PRIMARY, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  dayCardTitle: { color: INK, fontSize: 18, fontWeight: '800', marginTop: 4 },
  dayCalendarIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  dayTimelineItem: { flexDirection: 'row', gap: 12, minHeight: 83 },
  dayTimelineRail: { width: 38, alignItems: 'center' },
  dayTimelineDot: { width: 36, height: 36, borderRadius: 12, backgroundColor: WHITE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
  dayTimelineLine: { flex: 1, width: 2, backgroundColor: '#D9E6EE', marginVertical: 3 },
  dayTimelineContent: { flex: 1, paddingTop: 2, paddingBottom: 15 },
  dayTimeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayLabel: { color: INK, fontSize: 14, fontWeight: '800' },
  dayTime: { color: PRIMARY, fontSize: 13, fontWeight: '900' },
  dayText: { color: MUTED, fontSize: 12, lineHeight: 19, marginTop: 5 },
  dayFamilyBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#EAF7EF', borderRadius: 14, padding: 13, marginTop: 4 },
  dayFamilyTitle: { color: '#166534', fontSize: 13, fontWeight: '800', marginBottom: 3 },
  dayFamilyText: { color: '#3F6650', fontSize: 11, lineHeight: 17 },

  whyCard: { backgroundColor: WHITE, borderRadius: 19, paddingHorizontal: 16, borderWidth: 1, borderColor: BORDER },
  whyItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 16 },
  whyItemBorder: { borderBottomWidth: 1, borderBottomColor: '#EDF2F6' },
  whyIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  whyCopy: { flex: 1 },
  whyTitle: { color: INK, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  whyText: { color: MUTED, fontSize: 12, lineHeight: 19 },
  missionCard: { backgroundColor: NAVY, borderRadius: 19, padding: 20, marginTop: 15 },
  missionTitle: { color: WHITE, fontSize: 19, lineHeight: 26, fontWeight: '900', marginTop: 12 },
  missionText: { color: '#D5EAF5', fontSize: 13, lineHeight: 21, marginTop: 7 },

  faqList: { backgroundColor: WHITE, borderRadius: 17, borderWidth: 1, borderColor: BORDER, paddingHorizontal: 15 },
  faqItem: { borderBottomWidth: 1, borderBottomColor: '#EDF2F6', paddingVertical: 14 },
  faqQuestion: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  faqQuestionText: { flex: 1, color: INK, fontSize: 13, lineHeight: 20, fontWeight: '800' },
  faqToggle: { width: 29, height: 29, borderRadius: 10, backgroundColor: TINT, alignItems: 'center', justifyContent: 'center' },
  faqToggleActive: { backgroundColor: NAVY },
  faqAnswer: { color: MUTED, fontSize: 12, lineHeight: 20, paddingTop: 11, paddingRight: 35 },
  medicalNotice: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, backgroundColor: '#FFF8E9', borderRadius: 13, padding: 13, marginTop: 14 },
  medicalNoticeText: { flex: 1, color: '#78551D', fontSize: 11, lineHeight: 18 },

  finalCtaCompact: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 18,
    alignItems: 'center',
    gap: 10,
  },
  finalCtaTitle: { color: INK, fontSize: 22, lineHeight: 28, fontWeight: '900', textAlign: 'center', letterSpacing: -0.4 },
  finalCtaText: { color: MUTED, fontSize: 14, lineHeight: 23, marginTop: 12, marginBottom: 22 },
  finalLogin: { alignItems: 'center', paddingVertical: 6 },
  finalLoginText: { color: WHITE, fontSize: 13, fontWeight: '700' },
  finalLoginLink: { color: PRIMARY, fontSize: 13, fontWeight: '700' },
});
