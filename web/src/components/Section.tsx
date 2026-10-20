import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  icon?: string;
  /** Nội dung mô tả ngắn dưới tiêu đề */
  description?: string;
  children: ReactNode;
  /** Bỏ padding để nội dung con tự quản lý viền (ví dụ danh sách dòng) */
  flush?: boolean;
  /** Nhấn mạnh khối (dùng cho thẻ "việc cần làm ngay" ở M01) */
  highlight?: boolean;
  style?: React.CSSProperties;
}

/**
 * Khối nội dung có tiêu đề thống nhất cho mọi màn hình —
 * thay cho việc mỗi màn tự viết `Card` + `h2` với định dạng khác nhau.
 */
export function Section({ title, icon, description, children, flush, highlight, style }: SectionProps) {
  return (
    <section className={`card${flush ? ' card--flush' : ''}${highlight ? ' card--highlight' : ''}`} style={style}>
      <h2 className="section-title" style={flush ? { padding: '18px 18px 0', marginBottom: 10 } : undefined}>
        {icon && (
          <span className="section-title__icon" aria-hidden="true">
            {icon}
          </span>
        )}
        <span>{title}</span>
      </h2>
      {description && (
        <p
          className="muted"
          style={{
            margin: '0 0 12px',
            fontSize: 'calc(16px * var(--font-mult))',
            ...(flush ? { padding: '0 18px' } : null),
          }}
        >
          {description}
        </p>
      )}
      {flush ? <div style={{ padding: '0 18px 18px' }}>{children}</div> : children}
    </section>
  );
}
