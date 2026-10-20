interface Stat {
  label: string;
  value: string | number;
  /** Màu nhấn cho con số (mặc định theo màu chữ) */
  color?: string;
}

/**
 * Cụm số liệu nhanh (M01 đầu trang) — bố cục lưới, chữ số lớn dễ đọc
 * với người cao tuổi, có nhãn chữ nên không phụ thuộc màu.
 */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <div className="stat-grid">
      {stats.map((stat) => (
        <div className="stat" key={stat.label}>
          <span className="stat__value" style={{ color: stat.color }}>
            {stat.value}
          </span>
          <span className="stat__label">{stat.label}</span>
        </div>
      ))}
    </div>
  );
}
