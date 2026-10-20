import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
}

/** Khối nội dung trên nền sáng, viền bo góc — dùng cho mọi màn hình */
export function Card({ children, style }: CardProps) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  );
}
