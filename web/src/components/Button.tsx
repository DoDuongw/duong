import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
}

const BASE: CSSProperties = {
  minHeight: 56, // yêu cầu INTERFACE_SPEC: nút ≥ 56px
  padding: '12px 20px',
  borderRadius: 12,
  fontSize: 'calc(19px * var(--font-mult))',
  fontWeight: 600,
  cursor: 'pointer',
  border: '2px solid transparent',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
};

const VARIANTS: Record<Variant, CSSProperties> = {
  primary: { background: 'var(--c-primary)', color: '#fff' },
  secondary: {
    background: 'var(--c-surface)',
    color: 'var(--c-primary)',
    borderColor: 'var(--c-primary)',
    boxShadow: 'var(--shadow-1)',
  },
  danger: { background: 'var(--c-danger)', color: '#fff' },
  ghost: { background: 'transparent', color: 'var(--c-primary)', borderColor: 'var(--c-border)' },
};

/** Nút lớn, nhãn rõ nghĩa; loading → hiện “Đang xử lý…” và disable tránh bấm trùng */
export function Button({ variant = 'primary', block, loading, disabled, children, style, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        width: block ? '100%' : undefined,
        opacity: disabled || loading ? 0.55 : 1,
        ...style,
      }}
      {...rest}
    >
      {loading ? 'Đang xử lý…' : children}
    </button>
  );
}
