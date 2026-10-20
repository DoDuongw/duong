import { useSearchParams } from 'react-router-dom';
import { useApi } from './useApi';
import { listFamilyConnections } from '../services/endpoints';

export interface OwnerView {
  /** `?ownerId=` trên URL — có khi người thân đang xem hộ chủ hồ sơ */
  ownerId?: string;
  /** true khi đang xem dữ liệu của người khác (chỉ xem, không sửa) */
  isViewingOther: boolean;
  /** Tên hiển thị của chủ hồ sơ (chỉ có nghĩa khi `isViewingOther`) */
  ownerName: string;
  /** Múi giờ của chủ hồ sơ — undefined khi xem dữ liệu của chính mình */
  ownerTimezone?: string;
}

/**
 * Người thân xem lịch/thuốc của chủ hồ sơ (M03/M04 — Giai đoạn 7 R3).
 * Đọc `?ownerId=` và tra tên + múi giờ của chủ hồ sơ từ danh sách kết nối
 * (chỉ gọi API khi thực sự đang xem hộ).
 */
export function useOwnerView(): OwnerView {
  const [searchParams] = useSearchParams();
  const ownerId = searchParams.get('ownerId') ?? undefined;

  const { data: connections } = useApi(
    () => (ownerId ? listFamilyConnections() : Promise.resolve([])),
    [ownerId],
  );
  const conn = (connections ?? []).find((c) => c.role === 'relative' && c.user.id === ownerId);

  return {
    ownerId,
    isViewingOther: Boolean(ownerId),
    ownerName: conn?.user.displayName ?? conn?.user.phone ?? 'người thân',
    ownerTimezone: ownerId ? (conn?.user.timezone ?? undefined) : undefined,
  };
}
