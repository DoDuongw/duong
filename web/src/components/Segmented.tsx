import type { ReactNode } from 'react';

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  /**
   * `tab` (mặc định) khi các lựa chọn là chế độ xem trong cùng màn hình;
   * `button` khi là hành động chuyển nội dung (M07: Đã kết nối / Nhập mã mời).
   */
  role?: 'tab' | 'button';
}

/**
 * Chuyển đổi giữa các nhóm nội dung trong cùng màn hình
 * (Đang dùng / Đã ngừng ở M04, Đã kết nối / Nhập mã ở M07).
 */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  role = 'tab',
}: SegmentedProps<T>) {
  return (
    <div className="segmented" role={role === 'tab' ? 'tablist' : 'group'} aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role={role}
          className="segmented__item"
          {...(role === 'tab'
            ? { 'aria-selected': value === option.value }
            : { 'aria-pressed': value === option.value })}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

interface ChoiceRowProps {
  /** Nhãn hiển thị cạnh ô chọn */
  label: ReactNode;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  /** `radio` khi các lựa chọn loại trừ nhau */
  type?: 'checkbox' | 'radio';
  name?: string;
}

/** Một dòng có ô chọn lớn (vùng bấm ≥ 52px) — dùng cho cài đặt và quyền */
export function ChoiceRow({ label, checked, disabled, onChange, type = 'checkbox', name }: ChoiceRowProps) {
  return (
    <label className="check-row">
      <input
        type={type}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
