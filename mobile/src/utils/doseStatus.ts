import type { DoseWithMedication } from '../types';

export function nextActionable(doses: DoseWithMedication[] = []) {
  const pending = doses.filter((d) => d.status === 'pending');
  if (pending.length === 0) return null;
  // Sort by scheduled time
  pending.sort((a, b) => {
    const ta = a.scheduledTime ? new Date(a.scheduledTime).getTime() : 0;
    const tb = b.scheduledTime ? new Date(b.scheduledTime).getTime() : 0;
    return ta - tb;
  });
  return pending[0];
}

export function groupByBuoi(doses: DoseWithMedication[] = []) {
  const groups: Record<string, DoseWithMedication[]> = {
    sang: [],
    trua: [],
    chieu: [],
    toi: [],
  };
  for (const d of doses) {
    const h = d.scheduledTime ? new Date(d.scheduledTime).getHours() : 8;
    if (h >= 5 && h < 11) groups.sang.push(d);
    else if (h >= 11 && h < 14) groups.trua.push(d);
    else if (h >= 14 && h < 18) groups.chieu.push(d);
    else groups.toi.push(d);
  }
  return groups;
}
