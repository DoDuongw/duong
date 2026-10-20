import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { M01 } from '../screens/M01';
import { M02 } from '../screens/M02';
import { M03 } from '../screens/M03';
import { M04 } from '../screens/M04';
import { M05 } from '../screens/M05';
import { M06 } from '../screens/M06';
import { M07 } from '../screens/M07';
import { AuthContext, type AuthContextValue } from '../store/authContext';
import type { DoseWithMedication, FamilyConnectionItem, HistoryItem, Medication, TodayDoses } from '../types';

vi.mock('../services/endpoints', () => ({
  listMedications: vi.fn(),
  getMedication: vi.fn(),
  createMedication: vi.fn(),
  updateMedication: vi.fn(),
  discontinueMedication: vi.fn(),
  addSchedule: vi.fn(),
  removeSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  getTodayDoses: vi.fn(),
  getDosesByDate: vi.fn(),
  getDose: vi.fn(),
  confirmDose: vi.fn(),
  snoozeDose: vi.fn(),
  cannotTakeDose: vi.fn(),
  getHistory: vi.fn(),
  newClientRequestId: vi.fn(() => 'test-request-id'),
  acceptFamilyInvite: vi.fn(),
  createFamilyInvite: vi.fn(),
  listFamilyConnections: vi.fn(),
  revokeFamilyConnection: vi.fn(),
  updateFamilyPermissions: vi.fn(),
}));

import {
  cannotTakeDose,
  confirmDose,
  createMedication,
  discontinueMedication,
  getDose,
  getDosesByDate,
  getHistory,
  getMedication,
  getTodayDoses,
  listFamilyConnections,
  listMedications,
  snoozeDose,
  updateMedication,
  updateSchedule,
} from '../services/endpoints';

const mock = {
  listMedications: vi.mocked(listMedications),
  getMedication: vi.mocked(getMedication),
  createMedication: vi.mocked(createMedication),
  updateMedication: vi.mocked(updateMedication),
  discontinueMedication: vi.mocked(discontinueMedication),
  updateSchedule: vi.mocked(updateSchedule),
  getTodayDoses: vi.mocked(getTodayDoses),
  getDosesByDate: vi.mocked(getDosesByDate),
  getDose: vi.mocked(getDose),
  confirmDose: vi.mocked(confirmDose),
  snoozeDose: vi.mocked(snoozeDose),
  cannotTakeDose: vi.mocked(cannotTakeDose),
  getHistory: vi.mocked(getHistory),
  listFamilyConnections: vi.mocked(listFamilyConnections),
};

const med: Medication = {
  id: 'm1',
  name: 'Thuốc huyết áp',
  dosageText: '1 viên',
  instructions: null,
  startDate: '2026-10-01',
  endDate: null,
  status: 'active',
  schedules: [
    {
      id: 's1',
      medicationId: 'm1',
      timeOfDay: '08:00:00',
      recurrenceRule: 'daily',
      effectiveFrom: '2026-10-01',
      effectiveTo: null,
      status: 'active',
      currentVersion: 1,
    },
  ],
};

const dose: DoseWithMedication = {
  id: 'd1',
  scheduleId: 's1',
  medicationId: 'm1',
  scheduledAt: '2026-10-20T01:00:00.000Z',
  status: 'pending',
  confirmedAt: null,
  isLateConfirmation: false,
  cannotTakeReason: null,
  snoozedUntil: null,
  snoozeCount: 0,
  medicationName: 'Thuốc huyết áp',
  dosageText: '1 viên',
  instructions: 'Sau ăn',
};

const today: TodayDoses = {
  date: '2026-10-20',
  doses: [dose],
  stats: { confirmed: 0, remaining: 1, total: 1 },
};

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    initializing: false,
    user: { uid: 'u1', email: 'lan@example.com' },
    profile: {
      id: 'p1',
      phone: null,
      displayName: 'Bà Lan',
      address: null,
      timezone: 'Asia/Ho_Chi_Minh',
      preferences: null,
    },
    timezone: 'Asia/Ho_Chi_Minh',
    phone: null,
    configured: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    clearError: vi.fn(),
    refreshProfile: vi.fn(),
    ...overrides,
  };
}

function renderScreen(ui: ReactNode, route = '/', path = '*', auth: AuthContextValue = authValue()) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <AuthContext.Provider value={auth}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<div>điều hướng khác</div>} />
        </Routes>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('M04 — danh sách thuốc (API thật)', () => {
  it('tải danh sách “Đang dùng” từ GET /medications?status=active', async () => {
    mock.listMedications.mockResolvedValue([med]);
    renderScreen(<M04 />);

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(screen.getByText('Liều: 1 viên')).toBeInTheDocument();
    expect(screen.getByText('Giờ uống: 08:00')).toBeInTheDocument();
    expect(mock.listMedications).toHaveBeenCalledWith('active', undefined);
  });

  it('ngừng thuốc phải xác nhận rồi mới gọi API và tải lại', async () => {
    mock.listMedications.mockResolvedValue([med]);
    mock.discontinueMedication.mockResolvedValue({ id: 'm1', status: 'discontinued', removedFutureDoses: 3 });
    renderScreen(<M04 />);

    await screen.findByText('Thuốc huyết áp');
    await userEvent.click(screen.getByRole('button', { name: 'Ngừng' }));

    expect(screen.getByRole('dialog', { name: 'Ngừng thuốc' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ngừng thuốc' }));

    await waitFor(() => expect(mock.discontinueMedication).toHaveBeenCalledWith('m1'));
    await waitFor(() => expect(mock.listMedications).toHaveBeenCalledTimes(2));
  });

  it('hiện trạng thái rỗng khi không có thuốc', async () => {
    mock.listMedications.mockResolvedValue([]);
    renderScreen(<M04 />);
    expect(await screen.findByText(/Chưa có thuốc nào đang dùng/)).toBeInTheDocument();
  });

  it('tab “Đã ngừng” chỉ để xem — không có nút Sửa/Ngừng', async () => {
    mock.listMedications.mockImplementation(async (status) =>
      status === 'discontinued'
        ? [
            {
              ...med,
              status: 'discontinued' as const,
              schedules: [{ ...med.schedules![0], status: 'archived' as const }],
            },
          ]
        : [],
    );
    renderScreen(<M04 />);
    await userEvent.click(screen.getByRole('tab', { name: 'Đã ngừng' }));

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngừng' })).not.toBeInTheDocument();
    expect(screen.getByText(/Đã ngừng — chỉ xem/)).toBeInTheDocument();
  });
});

describe('M05 — thêm thuốc (API thật)', () => {
  it('chặn lưu khi thiếu tên thuốc', async () => {
    renderScreen(<M05 />, '/medications/new', '/medications/new');

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByText('Tên thuốc phải từ 1 đến 200 ký tự')).toBeInTheDocument();
    expect(mock.createMedication).not.toHaveBeenCalled();
  });

  it('lưu thuốc mới → POST /medications kèm lịch', async () => {
    mock.createMedication.mockResolvedValue(med);
    renderScreen(<M05 />, '/medications/new', '/medications/new');

    await userEvent.type(screen.getByLabelText('Tên thuốc *'), 'Thuốc mới');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));

    await waitFor(() =>
      expect(mock.createMedication).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Thuốc mới',
          schedules: [{ timeOfDay: '08:00', recurrenceRule: 'daily' }],
        }),
      ),
    );
  });
});

describe('M05 — sửa thuốc (API thật)', () => {
  it('đổi giờ đang hoạt động → hỏi xác nhận rồi PATCH thuốc + PUT lịch', async () => {
    mock.getMedication.mockResolvedValue(med);
    mock.updateMedication.mockResolvedValue(med);
    mock.updateSchedule.mockResolvedValue({
      ...med.schedules![0],
      regeneratedDoses: 8,
    });
    renderScreen(<M05 />, '/medications/m1/edit', '/medications/:id/edit');

    await screen.findByDisplayValue('Thuốc huyết áp');
    const timeInput = screen.getByLabelText('Giờ 1 *');
    fireEvent.change(timeInput, { target: { value: '09:00' } });

    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(await screen.findByRole('dialog', { name: 'Đổi lịch uống' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() =>
      expect(mock.updateMedication).toHaveBeenCalledWith('m1', expect.objectContaining({ name: 'Thuốc huyết áp' })),
    );
    await waitFor(() =>
      expect(mock.updateSchedule).toHaveBeenCalledWith(
        's1',
        expect.objectContaining({ timeOfDay: '09:00' }),
      ),
    );
  });
});

describe('M02 — nhắc uống thuốc (API thật)', () => {
  it('“Đã uống” gọi confirm với clientRequestId và chỉ báo thành công sau khi server trả về', async () => {
    mock.getDose.mockResolvedValue(dose);
    mock.confirmDose.mockResolvedValue({ ...dose, status: 'confirmed', confirmedAt: '2026-10-20T01:05:00.000Z' });
    renderScreen(<M02 />, '/dose/d1', '/dose/:doseId');

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đã uống' }));

    await waitFor(() => expect(mock.confirmDose).toHaveBeenCalledWith('d1', 'test-request-id'));
    expect(await screen.findByText(/Đã xác nhận uống thuốc/)).toBeInTheDocument();
  });

  it('“Không thể uống” mở hộp thoại lý do và gửi lý do nhập tay', async () => {
    mock.getDose.mockResolvedValue(dose);
    mock.cannotTakeDose.mockResolvedValue({ ...dose, status: 'cannot_take', cannotTakeReason: 'Đau dạ dày' });
    renderScreen(<M02 />, '/dose/d1', '/dose/:doseId');

    await screen.findByText('Thuốc huyết áp');
    await userEvent.click(screen.getByRole('button', { name: 'Không thể uống' }));
    await screen.findByRole('dialog', { name: 'Không thể uống' });

    await userEvent.click(screen.getByLabelText('Lý do khác'));
    await userEvent.type(screen.getByLabelText('Nhập lý do'), 'Đau dạ dày');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận' }));

    await waitFor(() => expect(mock.cannotTakeDose).toHaveBeenCalledWith('d1', 'Đau dạ dày'));
  });

  it('lần uống đã kết thúc → không hiện nút hành động', async () => {
    mock.getDose.mockResolvedValue({ ...dose, status: 'confirmed', confirmedAt: '2026-10-20T01:05:00.000Z' });
    renderScreen(<M02 />, '/dose/d1', '/dose/:doseId');

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đã uống' })).not.toBeInTheDocument();
    expect(screen.getByText(/đã kết thúc nên không thể thay đổi/)).toBeInTheDocument();
  });

  it('mở từ action của thông báo (?action=confirm) → tự gọi confirm', async () => {
    mock.getDose.mockResolvedValue(dose);
    mock.confirmDose.mockResolvedValue({ ...dose, status: 'confirmed', confirmedAt: '2026-10-20T01:05:00.000Z' });
    renderScreen(<M02 />, '/dose/d1?action=confirm', '/dose/:doseId');

    await waitFor(() => expect(mock.confirmDose).toHaveBeenCalledWith('d1', 'test-request-id'));
    expect(await screen.findByText(/Đã xác nhận uống thuốc/)).toBeInTheDocument();
  });

  it('lần uống đã kết thúc + ?action=confirm → không gọi confirm', async () => {
    mock.getDose.mockResolvedValue({ ...dose, status: 'confirmed', confirmedAt: '2026-10-20T01:05:00.000Z' });
    renderScreen(<M02 />, '/dose/d1?action=confirm', '/dose/:doseId');

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(mock.confirmDose).not.toHaveBeenCalled();
  });

  it('mở từ action của thông báo (?action=snooze) → tự gọi snooze và báo đúng giờ hẹn lại', async () => {
    mock.getDose.mockResolvedValue(dose);
    mock.snoozeDose.mockResolvedValue({
      ...dose,
      status: 'snoozed',
      snoozedUntil: '2026-10-20T01:10:00.000Z',
      snoozeCount: 1,
    });
    renderScreen(<M02 />, '/dose/d1?action=snooze', '/dose/:doseId');

    await waitFor(() => expect(mock.snoozeDose).toHaveBeenCalledWith('d1'));
    expect(await screen.findByText(/Đã hẹn nhắc lại lúc/)).toBeInTheDocument();
  });

  it('mở từ action của thông báo (?action=cannot) → mở hộp thoại lý do, chưa gửi gì', async () => {
    mock.getDose.mockResolvedValue(dose);
    renderScreen(<M02 />, '/dose/d1?action=cannot', '/dose/:doseId');

    await screen.findByText('Thuốc huyết áp');
    expect(await screen.findByRole('dialog', { name: 'Không thể uống' })).toBeInTheDocument();
    expect(mock.cannotTakeDose).not.toHaveBeenCalled();
  });

  it('giới hạn nhắc lại lấy theo cài đặt M08 (snoozeMax), không hard-code 3', async () => {
    mock.getDose.mockResolvedValue({ ...dose, status: 'snoozed', snoozeCount: 5, snoozedUntil: '2026-10-20T01:10:00.000Z' });
    renderScreen(<M02 />, '/dose/d1', '/dose/:doseId', authValue({
      profile: {
        id: 'p1',
        phone: null,
        displayName: 'Bà Lan',
        address: null,
        timezone: 'Asia/Ho_Chi_Minh',
        preferences: { snoozeMinutes: 5, snoozeMax: 5 },
      },
    }));

    expect(await screen.findByText('Đã nhắc lại tối đa 5 lần cho lần uống này.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Nhắc lại sau' })).toBeDisabled();
  });
});

describe('M01 — trang chủ (API thật)', () => {
  it('hiển thị thống kê và xác nhận lần uống kế tiếp', async () => {
    mock.getTodayDoses.mockResolvedValue(today);
    mock.confirmDose.mockResolvedValue({ ...dose, status: 'confirmed' });
    renderScreen(<M01 />, '/', '/');

    expect(await screen.findByText('Đã xác nhận 0 / còn 1 (tổng 1)')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Đã uống thuốc' }));
    await waitFor(() => expect(mock.confirmDose).toHaveBeenCalledWith('d1', 'test-request-id'));
  });

  it('rỗng → hướng dẫn thêm thuốc', async () => {
    mock.getTodayDoses.mockResolvedValue({ date: '2026-10-20', doses: [], stats: { confirmed: 0, remaining: 0, total: 0 } });
    renderScreen(<M01 />, '/', '/');
    expect(await screen.findByText('Hôm nay chưa có lịch uống thuốc')).toBeInTheDocument();
  });
});

describe('M06 — lịch sử (API thật)', () => {
  it('tải danh sách, hiển thị phân trang và chuyển trang gọi API page=2', async () => {
    mock.listMedications.mockResolvedValue([med]);
    const item: HistoryItem = {
      ...dose,
      status: 'confirmed',
      confirmedAt: '2026-10-20T01:05:00.000Z',
      remindedAt: '2026-10-20T01:00:00.000Z',
    };
    mock.getHistory.mockResolvedValue({ items: [item], page: 1, pageSize: 20, total: 25 });

    renderScreen(<M06 />, '/history', '/history');
    expect(await screen.findByText('25 lần uống — trang 1/2')).toBeInTheDocument();
    expect(screen.getAllByText('Thuốc huyết áp').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: 'Trang sau →' }));
    await waitFor(() => expect(mock.getHistory).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });
});

/** Kết nối trong đó người đăng nhập là người thân (dùng cho M07 + M03/M04 xem hộ) */
const relativeConnection: FamilyConnectionItem = {
  id: 'c1',
  role: 'relative',
  user: { id: 'owner-1', displayName: 'Bà Lan', phone: null, timezone: 'Asia/Bangkok' },
  permissions: { view_schedule: true, manage_medication: false, relative_alerts: true },
  connectedAt: '2026-10-20T00:00:00.000Z',
};

describe('M07 — người thân: nút quay lại (R2) và đường xem lịch (R3)', () => {
  it('có nút quay lại — mở trực tiếp bằng URL thì về Trang chủ', async () => {
    mock.listFamilyConnections.mockResolvedValue([]);
    renderScreen(<M07 />, '/family', '/family');

    await userEvent.click(screen.getByRole('button', { name: 'Quay lại' }));
    expect(await screen.findByText('điều hướng khác')).toBeInTheDocument();
  });

  it('vai trò người thân + view_schedule → thấy lịch ngay trong M07 và mở được /schedule?ownerId=', async () => {
    mock.listFamilyConnections.mockResolvedValue([relativeConnection]);
    mock.getDosesByDate.mockResolvedValue({ date: '2026-10-20', doses: [dose] });
    renderScreen(<M07 />, '/family', '/family');

    expect(await screen.findByText(/Lịch uống thuốc của Bà Lan/)).toBeInTheDocument();
    expect(screen.getByText(/Quyền hiện tại: xem lịch uống thuốc/)).toBeInTheDocument();
    // Lịch hiển thị trực tiếp, không phải chỉ có nút
    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(mock.getDosesByDate).toHaveBeenCalledWith(expect.any(String), 'owner-1');

    await userEvent.click(screen.getByRole('button', { name: 'Xem lịch uống thuốc' }));
    expect(await screen.findByText('điều hướng khác')).toBeInTheDocument();
  });

  it('mất quyền view_schedule → không hiện lịch, không còn nút xem lịch', async () => {
    mock.listFamilyConnections.mockResolvedValue([
      { ...relativeConnection, permissions: { ...relativeConnection.permissions, view_schedule: false } },
    ]);
    renderScreen(<M07 />, '/family', '/family');

    expect(await screen.findByText(/Quyền hiện tại: không xem lịch/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem lịch uống thuốc' })).not.toBeInTheDocument();
  });

  it('chủ hồ sơ chưa xác nhận quá ngưỡng → người thân thấy cảnh báo rõ, không chỉ “Đang chờ”', async () => {
    mock.listFamilyConnections.mockResolvedValue([relativeConnection]);
    // Lần uống đã quá hạn từ lâu (01:00 UTC) mà chủ hồ sơ vẫn chưa xác nhận
    mock.getDosesByDate.mockResolvedValue({ date: '2026-10-20', doses: [dose] });

    renderScreen(<M07 />, '/family', '/family');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/Bà Lan chưa xác nhận uống thuốc/);
    expect(alert).toHaveTextContent('Thuốc huyết áp');
    // Vẫn giữ nhãn trạng thái gốc trong danh sách bên dưới (dòng lần uống)
    expect(screen.getAllByText(/Đang chờ/).length).toBeGreaterThanOrEqual(2);
  });

  it('chủ hồ sơ đã xác nhận → người thân KHÔNG thấy cảnh báo', async () => {
    mock.listFamilyConnections.mockResolvedValue([relativeConnection]);
    mock.getDosesByDate.mockResolvedValue({
      date: '2026-10-20',
      doses: [{ ...dose, status: 'confirmed', confirmedAt: '2026-10-20T01:05:00.000Z' }],
    });

    renderScreen(<M07 />, '/family', '/family');

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('chủ hồ sơ bấm “Không thể uống” → người thân KHÔNG thấy cảnh báo', async () => {
    mock.listFamilyConnections.mockResolvedValue([relativeConnection]);
    mock.getDosesByDate.mockResolvedValue({
      date: '2026-10-20',
      doses: [{ ...dose, status: 'cannot_take', cannotTakeReason: 'Cảm thấy không khỏe' }],
    });

    renderScreen(<M07 />, '/family', '/family');

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('vai trò chủ hồ sơ → không có nút xem lịch (chỉ có công tắc cấp quyền)', async () => {
    mock.listFamilyConnections.mockResolvedValue([
      {
        ...relativeConnection,
        id: 'c2',
        role: 'owner',
        user: { id: 'relative-1', displayName: 'Con Trai', phone: null, timezone: 'Asia/Ho_Chi_Minh' },
      },
    ]);
    renderScreen(<M07 />, '/family', '/family');

    expect(await screen.findByText(/Con Trai/)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Cho phép xem lịch uống thuốc/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Xem lịch uống thuốc' })).not.toBeInTheDocument();
  });
});

describe('M03 — người thân xem lịch của chủ hồ sơ (R3)', () => {
  it('?ownerId= → tải lịch của chủ hồ sơ và hiện banner “Đang xem lịch của …”', async () => {
    mock.listFamilyConnections.mockResolvedValue([relativeConnection]);
    mock.getDosesByDate.mockResolvedValue({ date: '2026-10-20', doses: [dose] });

    renderScreen(<M03 />, '/schedule?ownerId=owner-1', '/schedule');

    expect(await screen.findByText(/Đang xem lịch của Bà Lan/)).toBeInTheDocument();
    expect(screen.getByText(/Bạn chỉ xem được, không thay đổi được lịch uống thuốc/)).toBeInTheDocument();
    expect(mock.getDosesByDate).toHaveBeenCalledWith(expect.any(String), 'owner-1');
  });

  it('không có ownerId → tải lịch của chính mình, không có banner', async () => {
    mock.getDosesByDate.mockResolvedValue({ date: '2026-10-20', doses: [] });

    renderScreen(<M03 />, '/schedule', '/schedule');

    expect((await screen.findAllByText(/Không có lần uống nào/)).length).toBeGreaterThan(0);
    expect(mock.getDosesByDate).toHaveBeenCalledWith(expect.any(String), undefined);
    expect(screen.queryByText(/Đang xem lịch của/)).not.toBeInTheDocument();
    expect(mock.listFamilyConnections).not.toHaveBeenCalled();
  });
});

describe('M04 — người thân xem thuốc của chủ hồ sơ (R3, chỉ xem)', () => {
  it('?ownerId= → hiện banner, gọi API kèm ownerId, ẩn Thêm/Sửa/Ngừng', async () => {
    mock.listFamilyConnections.mockResolvedValue([relativeConnection]);
    mock.listMedications.mockResolvedValue([med]);

    renderScreen(<M04 />, '/medications?ownerId=owner-1', '/medications');

    expect(await screen.findByRole('heading', { name: /Thuốc của Bà Lan/ })).toBeInTheDocument();
    expect(mock.listMedications).toHaveBeenCalledWith('active', 'owner-1');
    expect(screen.getByText(/Bạn đang xem thuốc của Bà Lan/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Thêm thuốc' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sửa' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Ngừng' })).not.toBeInTheDocument();
  });
});

describe('M02 — người thân mở lần uống của chủ hồ sơ (R3, chỉ xem)', () => {
  it('canAct=false → không hiện nút hành động, hiện “Chỉ xem”', async () => {
    mock.getDose.mockResolvedValue({ ...dose, canAct: false, timezone: 'Asia/Bangkok' });

    renderScreen(<M02 />, '/dose/d1', '/dose/:doseId');

    expect(await screen.findByText('Thuốc huyết áp')).toBeInTheDocument();
    expect(screen.getByText('Chỉ xem')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đã uống' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Nhắc lại sau' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Không thể uống' })).not.toBeInTheDocument();
  });

  it('canAct=false + ?action=confirm → không gọi confirm', async () => {
    mock.getDose.mockResolvedValue({ ...dose, canAct: false });

    renderScreen(<M02 />, '/dose/d1?action=confirm', '/dose/:doseId');

    expect(await screen.findByText('Chỉ xem')).toBeInTheDocument();
    expect(mock.confirmDose).not.toHaveBeenCalled();
  });
});
