import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { listFamilyConnections } from '../services/endpoints';
import type { FamilyConnectionItem } from '../types';

export interface OwnerView {
  ownerId?: string;
  isViewingOther: boolean;
  ownerName: string;
  ownerTimezone?: string;
  loading: boolean;
}

export function useOwnerView(): OwnerView {
  const params = useLocalSearchParams<{ ownerId?: string }>();
  const raw = params?.ownerId;
  const ownerId = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
  const [conn, setConn] = useState<FamilyConnectionItem | null>(null);
  const [loading, setLoading] = useState(!!ownerId);

  const load = useCallback(async () => {
    if (!ownerId) {
      setConn(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const list = await listFamilyConnections();
      const found = (list || []).find((c) => c.role === 'relative' && c.user.id === ownerId) || null;
      setConn(found);
    } catch {
      setConn(null);
    } finally {
      setLoading(false);
    }
  }, [ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    ownerId,
    isViewingOther: Boolean(ownerId),
    ownerName: conn?.user.displayName ?? conn?.user.phone ?? 'người thân',
    ownerTimezone: ownerId ? (conn?.user.timezone ?? undefined) : undefined,
    loading,
  };
}
