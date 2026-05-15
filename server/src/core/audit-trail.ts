import { db } from '../config/database';

export async function recordAudit(
  tableName: string,
  recordId: string,
  changes: Record<string, { old: unknown; new: unknown }>,
  changedBy: string
): Promise<void> {
  const entries = Object.entries(changes).map(([fieldName, { old: oldValue, new: newValue }]) => ({
    table_name: tableName,
    record_id: recordId,
    field_name: fieldName,
    old_value: oldValue != null ? String(oldValue) : null,
    new_value: newValue != null ? String(newValue) : null,
    changed_by: changedBy,
  }));

  if (entries.length > 0) {
    await db('sys_audit').insert(entries);
  }
}

export function diffRecords(
  oldRecord: Record<string, unknown>,
  newData: Record<string, unknown>,
  trackFields?: string[]
): Record<string, { old: unknown; new: unknown }> {
  const changes: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, newVal] of Object.entries(newData)) {
    if (trackFields && !trackFields.includes(key)) continue;
    if (key === 'updated_at' || key === 'created_at') continue;
    const oldVal = oldRecord[key];
    if (String(oldVal ?? '') !== String(newVal ?? '')) {
      changes[key] = { old: oldVal, new: newVal };
    }
  }
  return changes;
}
