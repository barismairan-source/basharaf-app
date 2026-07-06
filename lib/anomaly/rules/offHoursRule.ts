import { getRuleThresholds } from '../engine';
import { isOffHours, getTehranHour } from '../utils';
import type { AnomalyFindingInput } from '../types';

export interface OffHoursContext {
  entityType: string;
  entityId: string;
  createdAt: Date;
  branchId: string | null;
}

export async function offHoursRule(ctx: OffHoursContext): Promise<AnomalyFindingInput[]> {
  const thresholds = await getRuleThresholds('off_hours_activity');
  if (!thresholds) return [];

  const startHour = (thresholds.startHour as number) ?? 23;
  const endHour = (thresholds.endHour as number) ?? 5;

  const tehranHour = getTehranHour(ctx.createdAt);
  if (!isOffHours(tehranHour, startHour, endHour)) return [];

  return [
    {
      ruleKey: 'off_hours_activity',
      severity: 'low',
      branchId: ctx.branchId,
      entityType: ctx.entityType,
      entityId: ctx.entityId,
      details: {
        tehranHour,
        startHour,
        endHour,
      },
      note: `فعالیت ساعت غیرعادی — ساعت ${tehranHour} به‌وقت تهران`,
    },
  ];
}
