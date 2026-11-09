import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Card, Button, Input, Text, TimeField } from '../components';
import { colors, spacing, typography } from '../theme';
import { createMedication } from '../services/endpoints';
import { todayYmd } from '../utils/dateTime';
import { validateMedicationForm } from '../utils/validation';
import { uploadImageToStorage } from '../services/firebase';

export default function MedicationNewScreen() {
  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dosageText, setDosageText] = useState('');
  const [instructions, setInstructions] = useState('');
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState('');
  const [times, setTimes] = useState<string[]>(['08:00']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');

  async function pickAndUploadImage() {
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
      const extGuess = uri.split('.').pop()?.toLowerCase().split('?')[0];
      const ext = extGuess && /^[a-z0-9]+$/.test(extGuess) ? extGuess : 'jpg';
      const path = `medication-images/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const downloadUrl = await uploadImageToStorage(uri, path);
      setImageUrl(downloadUrl);
    } catch (e: any) {
      setImageError(e?.message || 'Không tải ảnh lên được. Vui lòng thử lại.');
    } finally {
      setImageUploading(false);
    }
  }

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function addTime() {
    setTimes((prev) => [...prev, '20:00']);
  }

  function removeTime(index: number) {
    setTimes((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function handleSave() {
    setError('');
    const normalizedTimes = times.map((t) => {
      const v = t.trim();
      return /^\d{1}:\d{2}$/.test(v) ? `0${v}` : v;
    });
    const found = validateMedicationForm({
      name,
      times: normalizedTimes,
      startDate: startDate.trim(),
      endDate: endDate.trim() || undefined,
    });
    setFieldErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true);
    try {
      await createMedication({
        name: name.trim(),
        imageUrl: imageUrl.trim() || undefined,
        dosageText: dosageText.trim() || undefined,
        instructions: instructions.trim() || undefined,
        startDate: startDate.trim(),
        endDate: endDate.trim() || undefined,
        schedules: normalizedTimes.map((timeOfDay) => ({ timeOfDay, recurrenceRule: 'daily' })),
      });
      // Tự động quay lại danh sách sau khi thêm thành công
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.alert('Đã thêm thuốc mới.');
        router.back();
      } else {
        router.back();
      }
    } catch (e: any) {
      setError(e?.message || 'Không thể thêm thuốc');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button">
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Thêm thuốc</Text>
            <View style={{ width: 40 }} />
          </View>

          <Card style={styles.card}>
            <Text style={styles.label}>Tên thuốc <Text style={styles.req}>*</Text></Text>
            <Input value={name} onChangeText={setName} placeholder="Ví dụ: Thuốc huyết áp" />
            {fieldErrors.name ? <Text style={styles.error}>{fieldErrors.name}</Text> : null}

            <Text style={styles.label}>Liều dùng</Text>
            <Input value={dosageText} onChangeText={setDosageText} placeholder="Ví dụ: 1 viên/lần" />

            <Text style={styles.label}>Hướng dẫn</Text>
            <Input value={instructions} onChangeText={setInstructions} placeholder="Ví dụ: Uống sau ăn sáng" />

            <Text style={styles.label}>Ảnh thuốc (không bắt buộc)</Text>
            {imageUrl ? (
              <View style={styles.imagePreviewWrap}>
                <Image source={{ uri: imageUrl }} style={styles.imagePreview} resizeMode="cover" />
                <TouchableOpacity
                  onPress={() => setImageUrl('')}
                  style={styles.imageRemoveBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Xóa ảnh"
                >
                  <Ionicons name="close-circle" size={26} color={colors.danger} />
                </TouchableOpacity>
              </View>
            ) : null}
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
            {imageError ? <Text style={styles.error}>{imageError}</Text> : null}
            <Text style={[styles.label, { marginTop: spacing.xs }]}>Hoặc dán đường dẫn ảnh</Text>
            <Input value={imageUrl} onChangeText={setImageUrl} placeholder="https://…" autoCapitalize="none" />

            <Text style={styles.label}>Ngày bắt đầu <Text style={styles.req}>*</Text></Text>
            <Input value={startDate} onChangeText={setStartDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
            {fieldErrors.startDate ? <Text style={styles.error}>{fieldErrors.startDate}</Text> : null}

            <Text style={styles.label}>Ngày kết thúc</Text>
            <Input value={endDate} onChangeText={setEndDate} placeholder="Để trống nếu dùng không có hạn" autoCapitalize="none" />
            {fieldErrors.endDate ? <Text style={styles.error}>{fieldErrors.endDate}</Text> : null}
          </Card>

          <Card style={styles.card}>
            <View style={styles.timesHeader}>
              <Text style={styles.sectionTitle}>Giờ uống</Text>
              <TouchableOpacity onPress={addTime} style={styles.addTimeBtn}>
                <Ionicons name="add" size={18} color={colors.primary} />
                <Text style={styles.addTimeText}>Thêm giờ</Text>
              </TouchableOpacity>
            </View>
            {times.map((t, idx) => (
              <View key={idx} style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <TimeField label={`Giờ ${idx + 1}`} value={t} onChange={(v) => updateTime(idx, v)} error={idx === 0 ? fieldErrors.times : null} />
                </View>
                {times.length > 1 ? (
                  <TouchableOpacity onPress={() => removeTime(idx)} style={styles.removeBtn} accessibilityLabel={`Xóa giờ ${idx + 1}`}>
                    <Ionicons name="trash-outline" size={20} color={colors.danger} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}

          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button onPress={handleSave} loading={saving} disabled={saving} style={styles.saveBtn}>
            Lưu thuốc
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  card: { marginBottom: spacing.md },
  label: { ...typography.bodySm, fontWeight: '700', color: colors.text, marginBottom: 6, marginTop: spacing.sm },
  req: { color: colors.danger },
  sectionTitle: { ...typography.body, fontWeight: '800', color: colors.text },
  timesHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  addTimeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addTimeText: { color: colors.primary, fontWeight: '700', fontSize: 14 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm },
  removeBtn: { padding: 10, marginTop: 30 },
  error: { color: colors.danger, marginBottom: spacing.sm, fontWeight: '600' },
  saveBtn: { marginTop: spacing.xs },
  imagePreviewWrap: { marginTop: spacing.xs, marginBottom: spacing.sm, alignSelf: 'flex-start' },
  imagePreview: { width: 140, height: 105, borderRadius: 12, backgroundColor: colors.bg },
  imageRemoveBtn: { position: 'absolute', top: -8, right: -8, backgroundColor: colors.surface, borderRadius: 13 },
  imageActions: { flexDirection: 'row', gap: spacing.sm },
});
