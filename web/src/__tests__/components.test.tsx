import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../components/Button';
import { StateView } from '../components/StateView';

describe('StateView (trạng thái chuẩn INTERFACE_SPEC)', () => {
  it('loading → hiện “Đang tải dữ liệu…”', () => {
    render(<StateView state="loading" />);
    expect(screen.getByRole('status')).toHaveTextContent('Đang tải dữ liệu');
  });

  it('error → hiện nút Thử lại và gọi onRetry', async () => {
    const onRetry = vi.fn();
    render(<StateView state="error" message="Không tải được lịch" onRetry={onRetry} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Không tải được lịch');
    await userEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('empty → hiện thông báo rỗng', () => {
    render(<StateView state="empty" message="Hôm nay chưa có lịch uống thuốc" />);
    expect(screen.getByText('Hôm nay chưa có lịch uống thuốc')).toBeInTheDocument();
  });
});

describe('Button', () => {
  it('loading → disable, tránh bấm trùng', () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Đã uống
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Đang xử lý…' });
    expect(btn).toBeDisabled();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('disabled → không gọi onClick', async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Lưu
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onClick).not.toHaveBeenCalled();
  });
});
