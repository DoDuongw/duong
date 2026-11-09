import type { CSSProperties, ReactNode } from 'react';

type Size = 'sm' | 'md' | 'lg' | 'xl';

const PX: Record<Size, number> = { sm: 15, md: 18, lg: 22, xl: 28 };

interface TextProps {
  size?: Size;
  muted?: boolean;
  strong?: boolean;
  as?: 'p' | 'span' | 'div';
  role?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Chữ theo preference cỡ chữ (M08) — fontSize nhân với --font-mult của theme.
 * Mặc định 18px (cỡ chữ tối thiểu theo INTERFACE_SPEC).
 */
export function Text({ size = 'md', muted, strong, as = 'p', role, style, children }: TextProps) {
  const Tag = as;
  return (
    <Tag
      role={role}
      style={{
        fontSize: `calc(${PX[size]}px * var(--font-mult))`,
        margin: as === 'span' ? 0 : '0 0 8px',
        color: muted ? 'var(--c-muted)' : undefined,
        fontWeight: strong ? 600 : undefined,
        ...style,
      }}
    >
      {children}
    </Tag>
  );
}
