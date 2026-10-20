import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/Dialog';
import { DateField, TextField, TimeField } from '../components/Fields';
import { Notice } from '../components/Notice';
import { Section } from '../components/Section';
import { StateView } from '../components/StateView';
import { useApi } from '../hooks/useApi';
import { ApiError } from '../services/api';
import {
  addSchedule,
  createMedication,
  getMedication,
  removeSchedule,
  updateMedication,
  updateSchedule,
} from '../services/endpoints';
import type { Medication } from '../types';
import { todayYmd } from '../utils/dateTime';
import { validateMedicationForm } from '../utils/validation';

interface TimeEntry {
  /** key cho React */
  key: string;
  /** id lịch đã có trên server (chế độ sửa) */
  id?: string;
  time: string;
}

/**
 * M05 — Thêm/sửa thuốc và lịch uống (INTERFACE_SPEC).
 *
 * Biểu mẫu chia thành các nhóm rõ ràng (thông tin thuốc → giờ uống → thời gian dùng),
 * ô nhập lớn, mỗi giờ uống là một dòng có nút xoá riêng.
 */
export function M05() {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const med = useApi<Medication | null>(() => (id ? getMedication(id) : Promise.resolve(null)), [id]);

  const [name, setName] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [dosageText, setDosageText] = useState('');
  const [times, setTimes] = useState<TimeEntry[]>([{ key: 'new-0', time: '08:00' }]);
  const [startDate, setStartDate] = useState(() => todayYmd());
  const [endDate, setEndDate] = useState('');
  const [instructions, setInstructions] = useState('');
  const [originalTimes, setOriginalTimes] = useState<{ id: string; time: string }[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadedRef = useRef(false);
  const newKeyRef = useRef(0);

  useEffect(() => {
    if (!isEdit || !med.data || loadedRef.current) return;
    loadedRef.current = true;
    const m = med.data;
    setName(m.name);
    setImageUrl(m.imageUrl ?? '');
    setDosageText(m.dosageText ?? '');
    setInstructions(m.instructions ?? '');
    setStartDate(m.startDate);
    setEndDate(m.endDate ?? '');
    const active = (m.schedules ?? [])
      .filter((s) => s.status === 'active')
      .sort((a, b) => a.timeOfDay.localeCompare(b.timeOfDay));
    setOriginalTimes(active.map((s) => ({ id: s.id, time: s.timeOfDay.slice(0, 5) })));
    setTimes(active.map((s) => ({ key: s.id, id: s.id, time: s.timeOfDay.slice(0, 5) })));
  }, [isEdit, med.data]);

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

  /** Chế độ sửa: lịch uống có thay đổi (đổi giờ / thêm / bớt) không? */
  function scheduleChanged(): boolean {
    if (!isEdit) return false;
    const current = times.map((t) => ({ id: t.id, time: t.time }));
    if (current.length !== originalTimes.length) return true;
    return current.some((c) => {
      if (!c.id) return true;
      const orig = originalTimes.find((o) => o.id === c.id);
      return !orig || orig.time !== c.time;
    });
  }

  async function save() {
    setSubmitting(true);
    setServerError(null);
    try {
      const base = {
        name: name.trim(),
        imageUrl: imageUrl.trim() || undefined,
        dosageText: dosageText.trim(),
        instructions: instructions.trim(),
        startDate,
        endDate: endDate || null,
      };

      if (!isEdit) {
        await createMedication({
          name: base.name,
          imageUrl: base.imageUrl,
          dosageText: base.dosageText || undefined,
          instructions: base.instructions || undefined,
          startDate,
          endDate: endDate || undefined,
          schedules: times.map((t) => ({ timeOfDay: t.time, recurrenceRule: 'daily' })),
        });
      } else {
        await updateMedication(id!, base);

        for (const entry of times) {
          if (entry.id) {
            const orig = originalTimes.find((o) => o.id === entry.id);
            if (orig && orig.time !== entry.time) {
              await updateSchedule(entry.id, {
                timeOfDay: entry.time,
                recurrenceRule: 'daily',
                effectiveFrom: startDate,
                effectiveTo: endDate || null,
              });
            }
          } else {
            await addSchedule(id!, {
              timeOfDay: entry.time,
              recurrenceRule: 'daily',
              effectiveFrom: startDate,
              effectiveTo: endDate || null,
            });
          }
        }

        const keptIds = new Set(times.filter((t) => t.id).map((t) => t.id));
        for (const orig of originalTimes) {
          if (!keptIds.has(orig.id)) await removeSchedule(orig.id);
        }
      }

      navigate('/medications', { replace: true });
    } catch (e) {
      setServerError(e instanceof ApiError ? e.message : 'Không lưu được — kiểm tra kết nối và thử lại');
      setConfirmOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateMedicationForm({
      name,
      times: times.map((t) => t.time),
      startDate,
      endDate: endDate || undefined,
    });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (scheduleChanged()) {
      setConfirmOpen(true);
      return;
    }
    void save();
  }

  if (isEdit && med.loading) {
    return (
      <>
        <h1>Sửa thuốc</h1>
        <Card>
          <StateView state="loading" />
        </Card>
      </>
    );
  }

  if (isEdit && med.error) {
    return (
      <>
        <h1>Sửa thuốc</h1>
        <Card>
          <StateView state="error" message={med.error} onRetry={med.refetch} />
        </Card>
        <Button variant="ghost" block onClick={() => navigate('/medications')}>
          ← Quay lại
        </Button>
      </>
    );
  }

  return (
    <>
      <h1>{isEdit ? 'Sửa thuốc' : 'Thêm thuốc'}</h1>

      <form onSubmit={handleSubmit} noValidate>
        <Section title="Thông tin thuốc" icon="💊">
          <TextField
            id="med-name"
            label="Tên thuốc"
            value={name}
            onChange={setName}
            error={errors.name}
            placeholder="Ví dụ: Thuốc huyết áp"
            required
          />
          <TextField
            id="med-dosage"
            label="Liều theo đơn"
            value={dosageText}
            onChange={setDosageText}
            placeholder="Ví dụ: 1 viên/lần"
          />
          <TextField
            id="med-instructions"
            label="Hướng dẫn"
            value={instructions}
            onChange={setInstructions}
            placeholder="Ví dụ: Uống sau ăn sáng"
          />
          <TextField
            id="med-image"
            label="Đường dẫn ảnh (không bắt buộc)"
            value={imageUrl}
            onChange={setImageUrl}
            placeholder="https://…"
          />
        </Section>

        <Section title="Giờ uống trong ngày" icon="⏰" description="Thêm đủ các giờ uống theo đơn của bác sĩ.">
          {times.map((entry, index) => (
            <div key={entry.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <TimeField
                  id={`med-time-${entry.key}`}
                  label={`Giờ ${index + 1}`}
                  value={entry.time}
                  onChange={(value) => updateTime(index, value)}
                  error={index === 0 ? errors.times : undefined}
                  required
                />
              </div>
              {times.length > 1 && (
                <Button
                  variant="ghost"
                  style={{ marginTop: 26 }}
                  onClick={() => removeTime(index)}
                  aria-label={`Xóa giờ ${index + 1}`}
                >
                  Xóa
                </Button>
              )}
            </div>
          ))}
          <Button variant="secondary" block onClick={addTime}>
            + Thêm giờ uống
          </Button>
        </Section>

        <Section title="Thời gian dùng thuốc" icon="📆">
          <DateField
            id="med-start"
            label="Ngày bắt đầu"
            value={startDate}
            onChange={setStartDate}
            error={errors.startDate}
            required
          />
          <DateField
            id="med-end"
            label="Ngày kết thúc"
            value={endDate}
            onChange={setEndDate}
            error={errors.endDate}
            hint="Để trống nếu dùng không có hạn"
          />
        </Section>

        {serverError && (
          <Notice tone="error" icon={false}>
            {serverError}
          </Notice>
        )}

        <Button type="submit" block loading={submitting} style={{ marginBottom: 12 }}>
          Lưu
        </Button>
      </form>

      <Button variant="ghost" block onClick={() => navigate('/medications')}>
        ← Quay lại danh sách thuốc
      </Button>

      {confirmOpen && (
        <ConfirmDialog
          title="Đổi lịch uống"
          message="Thay đổi sẽ áp dụng cho các lần uống sắp tới; lịch sử đã uống giữ nguyên."
          confirmLabel="Lưu thay đổi"
          loading={submitting}
          error={serverError}
          onConfirm={() => void save()}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </>
  );
}
