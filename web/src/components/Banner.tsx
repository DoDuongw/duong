interface BannerProps {
  online: boolean;
}

/** Dải báo đỏ trên đỉnh khi mất mạng (mất hẳn hoặc backend không phản hồi) */
export function Banner({ online }: BannerProps) {
  if (online) return null;
  return (
    <div className="offline-banner" role="alert">
      Mất kết nối máy chủ — đang thử lại…
    </div>
  );
}
