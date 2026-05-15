import { db } from '../config/database';
import { logger } from '../config/logger';

export async function applySla(
  tableName: string,
  recordId: string,
  recordData: Record<string, unknown>
): Promise<Date | null> {
  const definitions = await db('sla_definitions')
    .where({ table_name: tableName, active: true });

  for (const def of definitions) {
    const condition = typeof def.condition === 'string' ? JSON.parse(def.condition) : def.condition;
    const matches = Object.entries(condition).every(
      ([key, val]) => String(recordData[key]) === String(val)
    );

    if (matches) {
      const startTime = new Date();
      const plannedEnd = new Date(startTime.getTime() + def.duration_minutes * 60000);

      await db('sla_instances').insert({
        sla_definition_id: def.id,
        table_name: tableName,
        record_id: recordId,
        start_time: startTime.toISOString(),
        planned_end_time: plannedEnd.toISOString(),
      });

      logger.info(`SLA "${def.name}" applied to ${tableName}/${recordId}, due: ${plannedEnd.toISOString()}`);
      return plannedEnd;
    }
  }
  return null;
}

export async function checkSlaBreaches(): Promise<number> {
  const result = await db('sla_instances')
    .where('breached', false)
    .whereNull('actual_end_time')
    .where('planned_end_time', '<', new Date().toISOString())
    .update({ breached: true });

  return typeof result === 'number' ? result : 0;
}

export async function completeSla(tableName: string, recordId: string): Promise<void> {
  await db('sla_instances')
    .where({ table_name: tableName, record_id: recordId })
    .whereNull('actual_end_time')
    .update({ actual_end_time: new Date().toISOString() });
}
