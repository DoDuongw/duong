import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../services/endpoints', () => ({
  createFamilyInvite: vi.fn(),
  acceptFamilyInvite: vi.fn(),
  listFamilyConnections: vi.fn(),
  updateFamilyPermissions: vi.fn(),
  revokeFamilyConnection: vi.fn(),
}));

import { ApiError } from '../services/api';
import {
  acceptFamilyInvite,
  createFamilyInvite,
  listFamilyConnections,
  revokeFamilyConnection,
  updateFamilyPermissions,
} from '../services/endpoints';
import { M07 } from '../screens/M07';
import type { FamilyConnectionItem } from '../types';

const ownerConn: FamilyConnectionItem = {
  id: 'c1',
  role: 'owner',
  user: { id: 'u2', displayName: 'Anh Nam', phone: '0900000002', timezone: 'Asia/Ho_Chi_Minh' },
  permissions: { view_schedule: true, manage_medication: false, relative_alerts: true },
  connectedAt: '2026-10-01T00:00:00.000Z',
};

function renderM07() {
  return render(
    <MemoryRouter>
      <M07 />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listFamilyConnections).mockResolvedValue([]);
});

describe('M07 — danh sách kết nối', () => {
  it('chưa có kết nối → hiện trạng thái rỗng', async () => {
    renderM07();
    expect(await screen.findByText('Chưa có người thân kết nối')).toBeInTheDocument();
  });

  it('có kết nối (vai trò owner) → hiện tên và bật/tắt quyền xem lịch', async () => {
    vi.mocked(listFamilyConnections).mockResolvedValue([ownerConn]);
    vi.mocked(updateFamilyPermissions).mockResolvedValue({
      id: 'c1',
      permissions: { view_schedule: false, manage_medication: false, relative_alerts: true },
    });

    renderM07();
    expect(await screen.findByText(/Anh Nam/)).toBeInTheDocument();
    const toggle = screen.getByRole('checkbox', { name: /Cho phép xem lịch/ });
    expect(toggle).toBeChecked();

    await userEvent.click(toggle);
    await waitFor(() =>
      expect(updateFamilyPermissions).toHaveBeenCalledWith('c1', { viewSchedule: false }),
    );
  });

  it('ngắt kết nối cần xác nhận rồi gọi API', async () => {
    vi.mocked(listFamilyConnections).mockResolvedValue([ownerConn]);
    vi.mocked(revokeFamilyConnection).mockResolvedValue({ id: 'c1', status: 'revoked' });

    renderM07();
    await userEvent.click(await screen.findByRole('button', { name: 'Ngắt kết nối' }));

    expect(await screen.findByRole('dialog', { name: 'Ngắt kết nối?' })).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(withinButton(dialog, 'Ngắt kết nối'));

    await waitFor(() => expect(revokeFamilyConnection).toHaveBeenCalledWith('c1'));
  });
});

describe('M07 — mã mời', () => {
  it('tạo mã mời → hiện mã 6 chữ số và đếm ngược', async () => {
    vi.mocked(createFamilyInvite).mockResolvedValue({
      code: '123456',
      expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    });

    renderM07();
    await userEvent.click(await screen.findByRole('button', { name: 'Tạo mã mời' }));

    expect(await screen.findByLabelText('Mã mời 6 chữ số')).toHaveTextContent('123456');
    expect(screen.getByText(/Còn lại \d+:\d{2}/)).toBeInTheDocument();
  });

  it('nhập đủ 6 chữ số → kết nối và báo thành công', async () => {
    vi.mocked(acceptFamilyInvite).mockResolvedValue({
      id: 'c9',
      owner: { id: 'u1', displayName: 'Bà Lan' },
      permissions: { view_schedule: true, manage_medication: false, relative_alerts: true },
    });

    renderM07();
    await userEvent.click(await screen.findByRole('button', { name: 'Nhập mã mời' }));
    await userEvent.type(screen.getByLabelText('Mã mời 6 chữ số'), '654321');
    await userEvent.click(screen.getByRole('button', { name: 'Kết nối' }));

    await waitFor(() => expect(acceptFamilyInvite).toHaveBeenCalledWith('654321'));
    expect(await screen.findByText('Đã kết nối với Bà Lan.')).toBeInTheDocument();
  });

  it('mã sai → hiển thị lỗi từ server, không báo thành công', async () => {
    vi.mocked(acceptFamilyInvite).mockRejectedValue(
      new ApiError(404, 'NOT_FOUND', 'Mã mời không tồn tại hoặc đã hết hạn'),
    );

    renderM07();
    await userEvent.click(await screen.findByRole('button', { name: 'Nhập mã mời' }));
    await userEvent.type(screen.getByLabelText('Mã mời 6 chữ số'), '111111');
    await userEvent.click(screen.getByRole('button', { name: 'Kết nối' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Mã mời không tồn tại hoặc đã hết hạn');
  });
});

/** Tìm nút theo nhãn trong một phạm vi (hộp thoại có nút trùng tên với nút ngoài) */
function withinButton(scope: HTMLElement, name: string): HTMLElement {
  const buttons = Array.from(scope.querySelectorAll('button'));
  const found = buttons.find((b) => b.textContent?.trim() === name);
  if (!found) throw new Error(`Không tìm thấy nút "${name}" trong hộp thoại`);
  return found;
}
