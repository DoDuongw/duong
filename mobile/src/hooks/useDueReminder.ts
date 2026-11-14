import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { getTodayDoses } from '../services/endpoints';
import { firstDueDose } from '../utils/doseStatus';
import type { DoseWithMedication } from '../types';

const POLL_MS = 60_000;

export interface DueReminderState {
  due: DoseWithMedication | null;
  dismiss: (doseId: string) => void;
  reload: () => void;
}

export function useDueReminder(enabled = true): DueReminderState {
  const [doses, setDoses] = useState<DoseWithMedication[]>([]);
  const [hidden, setHidden] = useState<string[]>([]);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  const load = useCallback(async () => {
    if (!enabled) return;
    try {
      const today = await getTodayDoses();
      setDoses(today?.doses || []);
    } catch {
      // silent
    }
  }, [enabled]);

  useEffect(() => {
    void load();
  }, [load, tick]);

  useEffect(() => {
    const id = setInterval(() => {
      if (AppState.currentState === 'active') void load();
    }, POLL_MS);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void load();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [load]);

  const due = useMemo(() => firstDueDose(doses), [doses]);

  const dismiss = useCallback((doseId: string) => {
    setHidden((prev) => (prev.includes(doseId) ? prev : [...prev, doseId]));
  }, []);

  return {
    due: due && !hidden.includes(due.id) ? due : null,
    dismiss,
    reload,
  };
}
