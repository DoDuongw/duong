import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, DateField, Input, StateView, Text, TimeField } from '../../components';
import { colors, spacing, typography } from '../../theme';
import {
  addSchedule,
  getMedication,
  removeSchedule,
  updateMedication,
  updateSchedule,
  uploadMedicationImage,
} from '../../services/endpoints';
import type { Medication } from '../../types';
import { validateMedicationForm } from '../../utils/validation';

interface TimeEntry {
  key: string;
  id?: string;
  time: string;
}

export default function MedicationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const medId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';

  const [med, setMed] = useState<Medication | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [serverError, setServerError] = useState('');

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dosageText, setDosageText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [times, setTimes] = useState<TimeEntry[]>([]);
  const [originalTimes, setOriginalTimes] = useState<{ id: string; time: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  const loadedRef = useRef(false);
  const newKeyRef = useRef(0);

  async function pickAndUploadImage() {
    if (med?.status !== 'active') return;
    setImageError('');
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        setImageError('Cần quyền truy cập thư viện ảnh để chọn ảnh thuốc.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
        aspect: [4, 3],
      });
      if (result.canceled || !result.assets?.[0]?.uri) return;
      setImageUploading(true);
      const uri = result.assets[0].uri;
      const downloadUrl = await uploadMedicationImage(uri);
      setImageUrl(downloadUrl);
    } catch (e: any) {
      setImageError(e?.message || 'Không tải ảnh lên được. Vui lòng thử lại.');
    } finally {
      setImageUploading(false);
    }
  }

  const load = useCallback(async () => {
    if (!medId) return;
    try {
      setError('');
      const data = await getMedication(medId);
      setMed(data);
      setName(data.name || '');
      setImageUrl(data.imageUrl || '');
      setDosageText(data.dosageText || '');
      setInstructions(data.instructions || '');
      setStartDate(data.startDate || '');
      setEndDate(data.endDate || '');
      const active = (data.schedules ?? [])
        .filter((s) => s.status === 'active')
        .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
      setOriginalTimes(active.map((s) => ({ id: s.id, time: s.timeOfDay.slice(0, 5) })));
      setTimes(active.map((s) => ({ key: s.id, id: s.id, time: s.timeOfDay.slice(0, 5) })));
      loadedRef.current = true;
    } catch (e: any) {
      setError(e?.message || 'Không thể tải thông tin thuốc');
    } finally {
      setLoading(false);
    }
  }, [medId]);

  useEffect(() => {
    // Tải dữ liệu ban đầu; setState diễn ra sau khi gọi API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => (i === index ? { ...t, time: value } : t)));
  }

  function addTime() {
    newKeyRef.current += 1;
    setTimes((prev) => [...prev, { key: `new-${newKeyRef.current}`, time: '' }]);
  }

  function removeTime(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function scheduleChanged(): boolean {
    const current = times.map((t) => ({ id: t.id, time: t.time.trim() }));
    if (current.length !== originalTimes.length) return true;
    return current.some((c) => {
      if (!c.id) return true;
      const orig = originalTimes.find((o) => o.id === c.id);
      return !orig || orig.time !== c.time;
    });
  }

  async function save() {
    if (!medId) return;
    setSaving(true);
    setServerError('');
    try {
      await updateMedication(medId, {
        name: name.trim(),
        imageUrl: imageUrl.trim() || undefined,
        dosageText: dosageText.trim(),
        instructions: instructions.trim(),
        startDate: startDate.trim(),
        endDate: endDate.trim() ? endDate.trim() : null,
      });

      for (const entry of times) {
        const t = entry.time.trim();
        const hhmm = /^\d{1}:\d{2}$/.test(t) ? `0${t}` : t;
        if (entry.id) {
          const orig = originalTimes.find((o) => o.id === entry.id);
          if (orig && orig.time !== hhmm) {
            await updateSchedule(entry.id, {
              timeOfDay: hhmm,
              recurrenceRule: 'daily',
              effectiveFrom: startDate.trim(),
              effectiveTo: endDate.trim() || null,
            });
          }
        } else {
          await addSchedule(medId, {
            timeOfDay: hhmm,
            recurrenceRule: 'daily',
            effectiveFrom: startDate.trim(),
            effectiveTo: endDate.trim() || null,
          });
        }
      }

      const keptIds = new Set(times.filter((t) => t.id).map((t) => t.id));
      for (const orig of originalTimes) {
        if (!keptIds.has(orig.id)) await removeSchedule(orig.id);
      }

      // Tự động quay lại sau khi lưu thành công
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Đã lưu thay đổi thuốc.');
        router.back();
      } else {
        router.back();
      }
    } catch (e: any) {
      setServerError(e?.message || 'Không lưu được — kiểm tra kết nối và thử lại');
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit() {
    const normalizedTimes = times.map((t) => {
      const v = t.time.trim();
      return /^\d{1}:\d{2}$/.test(v) ? `0${v}` : v;
    });
    const found = validateMedicationForm({
      name,
      times: normalizedTimes,
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
    });
    setErrors(found);
    setServerError('');
    if (Object.keys(found).length > 0) return;

    if (scheduleChanged()) {
      const msg = 'Đổi lịch uống: thay đổi sẽ áp dụng cho các lần uống sắp tới; lịch sử đã uống giữ nguyên. Lưu thay đổi?';
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.confirm(msg)) void save();
        return;
      }
      Alert.alert('Đổi lịch uống', 'Thay đổi sẽ áp dụng cho các lần uống sắp tới; lịch sử đã uống giữ nguyên.', [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Lưu thay đổi', onPress: () => void save() },
      ]);
      return;
    }
    void save();
  }

  if (loading) return <StateView state="loading" />;
  if (error || !med) return <StateView state="error" message={error || 'Không tìm thấy thuốc'} onRetry={load} />;

  const isActive = med.status === 'active';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Sửa thuốc</Text>
            <View style={{ width: 40 }} />
          </View>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Thông tin thuốc</Text>
            <Text style={styles.label}>Tên thuốc <Text style={styles.req}>*</Text></Text>
            <Input value={name} onChangeText={setName} placeholder="Ví dụ: Thuốc huyết áp" />
            {errors.name ? <Text style={styles.errText}>{errors.name}</Text> : null}

            <Text style={styles.label}>Liều dùng</Text>
            <Input value={dosageText} onChangeText={setDosageText} placeholder="Ví dụ: 1 viên/lần" />

            <Text style={styles.label}>Hướng dẫn</Text>
            <Input value={instructions} onChangeText={setInstructions} placeholder="Ví dụ: Uống sau ăn sáng" />

            <Text style={styles.label}>Ảnh thuốc (không bắt buộc)</Text>
            {imageUrl ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                {isActive ? (
                  <TouchableOpacity
                    onPress={() => setImageUrl('')}
                    style={styles.imageRemoveBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Xóa ảnh"
                  >
                    <Ionicons name="close-circle" size={26} color={colors.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
            {isActive ? (
              <>
                <View style={styles.imageActions}>
                  <Button
                    variant="secondary"
                    onPress={() => void pickAndUploadImage()}
                    loading={imageUploading}
                    disabled={imageUploading || saving}
                    style={{ flex: 1 }}
                  >
                    {imageUrl ? 'Đổi ảnh' : 'Chọn ảnh'}
                  </Button>
                </View>
                {imageError ? <Text style={styles.errText}>{imageError}</Text> : null}
                <Text style={[styles.label, { marginTop: spacing.xs }]}>Hoặc dán đường dẫn ảnh</Text>
                <Input value={imageUrl} onChangeText={setImageUrl} placeholder="https://…" autoCapitalize="none" />
              </>
            ) : (
              !imageUrl ? <Text style={styles.muted}>Không có ảnh.</Text> : null
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.timesHeader}>
              <Text style={styles.sectionTitle}>Giờ uống trong ngày</Text>
            </View>
            <Text style={styles.muted}>Bấm vào ô giờ để chọn nhanh (giờ/phút có sẵn) hoặc nhập trực tiếp HH:mm. Bấm “Lưu thay đổi” để áp dụng — nếu đổi lịch, hệ thống sẽ hỏi xác nhận (lịch mới áp dụng cho các lần sắp tới, lịch sử giữ nguyên).</Text>
            {times.map((entry, index) => (
              <View key={entry.key} style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <TimeField
                    label={`Giờ ${index + 1}`}
                    value={entry.time}
                    onChange={(v) => updateTime(index, v)}
                    disabled={!isActive}
                    error={index === 0 ? errors.times : null}
                  />
                </View>
                {isActive && times.length > 1 ? (
                  <TouchableOpacity onPress={() => removeTime(index)} style={styles.removeBtn} accessibilityLabel={`Xóa giờ ${index + 1}`}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            {isActive ? (
              <Button variant="secondary" onPress={addTime} style={styles.mt}>
                + Thêm giờ uống
              </Button>
            ) : (
              <Text style={styles.muted}>Thuốc đã ngừng — không thể đổi lịch.</Text>
            )}
          </Card>

          <Card style={styles.card}>
            <Text style={styles.sectionTitle}>Thời gian dùng thuốc</Text>
            <DateField
              label="Ngày bắt đầu *"
              value={startDate}
              onChange={setStartDate}
              error={errors.startDate}
              disabled={!isActive}
            />
            <DateField
              label="Ngày kết thúc (tùy chọn)"
              value={endDate}
              onChange={setEndDate}
              placeholder="Để trống nếu dùng không có hạn"
              error={errors.endDate}
              defaultValue={startDate}
              disabled={!isActive}
              clearable
            />
          </Card>

          {serverError ? <Text style={styles.errText}>{serverError}</Text> : null}

          <Button onPress={handleSubmit} loading={saving} disabled={saving || !isActive} style={styles.mt}>
            Lưu thay đổi
          </Button>
          {!isActive ? <Text style={styles.muted}>Thuốc đã ngừng — chỉ xem thông tin.</Text> : null}

          <Button variant="ghost" onPress={() => router.back()} style={styles.mt}>
            ← Quay lại danh sách thuốc
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  card: { marginBottom: spacing.md },
  label: { ...typography.bodySm, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: spacing.sm },
  timeLabel: { ...typography.caption, fontWeight: '700', color: colors.muted, marginBottom: 4, marginTop: spacing.xs },
  sectionTitle: { ...typography.body, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  muted: { ...typography.bodySm, color: colors.muted, marginBottom: spacing.xs },
  req: { color: colors.danger },
  mt: { marginTop: spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  removeBtn: { padding: 10, marginTop: 30 },
  errText: { color: colors.danger, fontSize: 13, fontWeight: '600', marginTop: 2 },
  timesHeader: { marginBottom: 2 },
  imagePreviewWrap: { marginTop: spacing.xs, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  imagePreview: { width: 140, height: 105, borderRadius: 12, backgroundColor: colors.bg },
  imageRemoveBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.surface, borderRadius: 13 },
  imageActions: { flexDirection: 'row', gap: spacing.sm },
});
