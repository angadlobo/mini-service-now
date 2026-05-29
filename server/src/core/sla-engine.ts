import { db } from '../config/database';
import { slaService } from '../modules/sla/service';

/**
 * Thin compatibility wrapper around the SLA module's service so existing callers
 * (e.g. the incident service) keep working while the SLA logic lives in one place.
 * The module's service handles condition matching, de-duplication, breach-on-late
 * completion, and the periodic breach sweep (see modules/sla/engine.ts).
 */

export async function applySla(
  tableName: string,
  recordId: string,
  recordData: Record<string, unknown>
): Promise<Date | null> {
  await slaService.evaluateRecord(tableName, recordId, recordData);
  const earliest = await db('sla_instances')
    .where({ table_name: tableName, record_id: recordId })
    .whereNull('actual_end_time')
    .orderBy('planned_end_time', 'asc')
    .first();
  return earliest ? new Date(earliest.planned_end_time) : null;
}

export async function checkSlaBreaches(): Promise<number> {
  const breached = await slaService.checkBreaches();
  return breached.length;
}

export async function completeSla(tableName: string, recordId: string): Promise<void> {
  await slaService.completeInstances(tableName, recordId);
}
