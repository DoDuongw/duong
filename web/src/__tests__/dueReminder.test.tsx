import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/endpoints', () => ({
  getTodayDoses: vi.fn(),
  confirmDose: vi.fn(),
  newClientRequestId: vi.fn(() => 'test-request-id'),
}));

vi.mock('../services/messaging', () => ({
  onForegroundPush: vi.fn(() => () => {}),
}));

import { confirmDose, getTodayDoses, newClientRequestId } from '../services/endpoints';
import { DueBanner } from '../components/DueBanner';
import { AuthContext, type AuthContextValue } from '../store/authContext';
import type { DoseWithMedication, TodayDoses } from '../types';

const authValue: AuthContextValue = {
  initializing: false,
  user: { uid: 'u1', email: 'lan@example.com' },
  profile: null,
  timezone: 'Asia/Ho_Chi_Minh',
  configured: true,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  clearError: vi.fn(),
  refreshProfile: vi.fn(),
};

const dose: DoseWithMedication = {
  id: 'd1',
  scheduleId: 's1',
  medicationId: 'm1',
  scheduledAt: '2020-01-01T01:00:00.000Z',
  status: 'pending',
  confirmedAt: null,
  isLateConfirmation: false,
  cannotTakeReason: null,
  snoozedUntil: null,
  snoozeCount: 0,
  medicationName: 'Thuốc huyết áp',
  dosageText: '1 viên',
  instructions: null,
};

function renderBanner() {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        <DueBanner />
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}

function today(doses: DoseWithMedication[]): TodayDoses {
  return { date: '2020-01-01', doses, stats: { confirmed: 0, remaining: doses.length, total: doses.length } };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('DueBanner — nhắc khi trang đang mở', () => {
  it('hiện banner cho lần uống đã tới hạn', async () => {
    vi.mocked(getTodayDoses).mockResolvedValue(today([dose]));
    renderBanner();

    expect(await screen.findByText(/Đến giờ uống thuốc/)).toBeInTheDocument();
    expect(screen.getByText(/Thuốc huyết áp/)).toBeInTheDocument();
  });

  it('không tới hạn → không hiện banner', async () => {
    const future: DoseWithMedication = { ...dose, scheduledAt: '2999-01-01T00:00:00.000Z' };
    vi.mocked(getTodayDoses).mockResolvedValue(today([future]));
    renderBanner();

    await waitFor(() => expect(getTodayDoses).toHaveBeenCalled());
    expect(screen.queryByText(/Đến giờ uống thuốc/)).not.toBeInTheDocument();
  });

  it('bấm “Đã uống” → gọi confirm và ẩn banner', async () => {
    vi.mocked(getTodayDoses).mockResolvedValue(today([dose]));
    vi.mocked(confirmDose).mockResolvedValue({ ...dose, status: 'confirmed' });
    renderBanner();

    await userEvent.click(await screen.findByRole('button', { name: 'Đã uống' }));

    await waitFor(() => expect(confirmDose).toHaveBeenCalledWith('d1', 'test-request-id'));
    await waitFor(() => expect(screen.queryByText(/Đến giờ uống thuốc/)).not.toBeInTheDocument());
    expect(newClientRequestId).toHaveBeenCalled();
  });

  it('bấm “Để sau” → ẩn banner trong phiên này', async () => {
    vi.mocked(getTodayDoses).mockResolvedValue(today([dose]));
    renderBanner();

    await userEvent.click(await screen.findByRole('button', { name: 'Để sau' }));
    expect(screen.queryByText(/Đến giờ uống thuốc/)).not.toBeInTheDocument();
    expect(confirmDose).not.toHaveBeenCalled();
  });
});
