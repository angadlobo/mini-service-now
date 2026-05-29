import { db } from '../../config/database';
import { AppError } from '../../middleware/error';

/** States that stop an SLA timer (the work is considered finished). */
const STOP_STATES = new Set(['resolved', 'closed', 'cancelled', 'completed', 'done', 'fulfilled']);

function matchesCondition(record: Record<string, any>, condition: Record<string, any> | null): boolean {
  if (!condition || Object.keys(condition).length === 0) return true;
  return Object.entries(condition).every(([key, val]) => {
    if (Array.isArray(val)) return val.map(String).includes(String(record[key]));
    return String(record[key]) === String(val);
  });
}

export class SlaService {
  // ── Definitions ──────────────────────────────────────
  async listDefinitions(tableName?: string) {
    const q = db('sla_definitions').orderBy('table_name').orderBy('duration_minutes');
    if (tableName) q.where('table_name', tableName);
    return q;
  }

  async getDefinition(id: string) {
    const def = await db('sla_definitions').where('id', id).first();
    if (!def) throw new AppError(404, 'SLA definition not found');
    return def;
  }

  async createDefinition(data: Record<string, unknown>) {
    const [def] = await db('sla_definitions')
      .insert({
        name: data.name,
        table_name: data.table_name,
        condition: JSON.stringify(data.condition || {}),
        duration_minutes: data.duration_minutes,
        active: data.active !== false,
      })
      .returning('*');
    return def;
  }

  async updateDefinition(id: string, data: Record<string, unknown>) {
    await this.getDefinition(id);
    const patch: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.condition !== undefined) patch.condition = JSON.stringify(data.condition);
    const [updated] = await db('sla_definitions').where('id', id).update(patch).returning('*');
    return updated;
  }

  async deleteDefinition(id: string) {
    await this.getDefinition(id);
    await db('sla_definitions').where('id', id).del();
    return { message: 'SLA definition deleted' };
  }

  // ── Instance lifecycle ───────────────────────────────
  /**
   * Evaluate a record against active SLA definitions for its table and start an
   * SLA instance for each matching definition that isn't already tracked.
   * Returns the number of instances started.
   */
  async evaluateRecord(tableName: string, recordId: string, record: Record<string, any>): Promise<number> {
    const defs = await db('sla_definitions').where({ table_name: tableName, active: true });
    let started = 0;

    for (const def of defs) {
      const condition = typeof def.condition === 'string' ? JSON.parse(def.condition) : def.condition;
      if (!matchesCondition(record, condition)) continue;

      const existing = await db('sla_instances')
        .where({ sla_definition_id: def.id, table_name: tableName, record_id: recordId })
        .whereNull('actual_end_time')
        .first();
      if (existing) continue;

      const start = new Date();
      const plannedEnd = new Date(start.getTime() + def.duration_minutes * 60_000);
      await db('sla_instances').insert({
        sla_definition_id: def.id,
        table_name: tableName,
        record_id: recordId,
        start_time: start,
        planned_end_time: plannedEnd,
        breached: false,
      });
      started += 1;
    }

    if (started > 0) await this.syncRecordDueDate(tableName, recordId);
    return started;
  }

  /**
   * Complete all open SLA instances for a record (called when it reaches a stop state).
   * Marks breached when finished after the planned end time. Returns count completed.
   */
  async completeInstances(tableName: string, recordId: string): Promise<number> {
    const open = await db('sla_instances')
      .where({ table_name: tableName, record_id: recordId })
      .whereNull('actual_end_time');

    const now = new Date();
    for (const inst of open) {
      await db('sla_instances').where('id', inst.id).update({
        actual_end_time: now,
        breached: now > new Date(inst.planned_end_time),
      });
    }
    return open.length;
  }

  /**
   * React to a record state change: complete SLAs when it reaches a stop state,
   * otherwise (re)evaluate in case a field change now matches a definition.
   */
  async processStateChange(tableName: string, recordId: string, record: Record<string, any>): Promise<void> {
    const state = String(record.state || '').toLowerCase();
    if (STOP_STATES.has(state)) {
      await this.completeInstances(tableName, recordId);
    } else {
      await this.evaluateRecord(tableName, recordId, record);
    }
  }

  /** Set the source record's sla_due to the earliest open SLA target, if the column exists. */
  private async syncRecordDueDate(tableName: string, recordId: string) {
    const earliest = await db('sla_instances')
      .where({ table_name: tableName, record_id: recordId })
      .whereNull('actual_end_time')
      .orderBy('planned_end_time', 'asc')
      .first();
    if (!earliest) return;
    try {
      await db(tableName).where('id', recordId).update({ sla_due: earliest.planned_end_time });
    } catch {
      // Table may not have an sla_due column — ignore.
    }
  }

  /**
   * Mark overdue, still-open SLA instances as breached. Returns the breached instances
   * (with table_name/record_id) so the caller can emit events.
   */
  async checkBreaches() {
    const now = new Date();
    const overdue = await db('sla_instances')
      .whereNull('actual_end_time')
      .where('breached', false)
      .where('planned_end_time', '<', now);

    if (overdue.length > 0) {
      await db('sla_instances')
        .whereIn('id', overdue.map((o: any) => o.id))
        .update({ breached: true });
    }
    return overdue;
  }

  // ── Reporting ────────────────────────────────────────
  private async enrich(instances: any[]) {
    const byTable: Record<string, string[]> = {};
    instances.forEach((i) => {
      byTable[i.table_name] = byTable[i.table_name] || [];
      byTable[i.table_name].push(i.record_id);
    });

    const records: Record<string, any> = {};
    for (const [table, ids] of Object.entries(byTable)) {
      try {
        const rows = await db(table).whereIn('id', ids).select('*');
        rows.forEach((r: any) => { records[`${table}:${r.id}`] = r; });
      } catch { /* unknown table — skip enrichment */ }
    }

    return instances.map((i) => {
      const rec = records[`${i.table_name}:${i.record_id}`] || {};
      return {
        ...i,
        record_number: rec.number || null,
        record_short_description: rec.short_description || null,
        record_priority: rec.priority ?? null,
      };
    });
  }

  async getDashboard(tableName?: string) {
    const base = () => {
      const q = db('sla_instances');
      if (tableName) q.where('table_name', tableName);
      return q;
    };

    const all = await base()
      .leftJoin('sla_definitions', 'sla_definitions.id', 'sla_instances.sla_definition_id')
      .select('sla_instances.*', 'sla_definitions.name as definition_name');

    const completed = all.filter((i: any) => i.actual_end_time);
    const breached = all.filter((i: any) => i.breached);
    const met = completed.filter((i: any) => !i.breached);
    const active = all.filter((i: any) => !i.actual_end_time && !i.breached);

    const finished = met.length + breached.length;
    const complianceRate = finished > 0 ? Math.round((met.length / finished) * 100) : 100;

    // Per-definition breakdown
    const defMap: Record<string, { name: string; total: number; met: number; breached: number }> = {};
    for (const i of all) {
      const name = i.definition_name || 'Unknown';
      defMap[name] = defMap[name] || { name, total: 0, met: 0, breached: 0 };
      defMap[name].total += 1;
      if (i.breached) defMap[name].breached += 1;
      else if (i.actual_end_time) defMap[name].met += 1;
    }
    const byDefinition = Object.values(defMap).map((d) => ({
      ...d,
      rate: (d.met + d.breached) > 0 ? Math.round((d.met / (d.met + d.breached)) * 100) : 100,
    }));

    return {
      summary: {
        total: all.length,
        active: active.length,
        met: met.length,
        breached: breached.length,
        complianceRate,
      },
      byDefinition,
    };
  }

  /** Open instances close to breaching (>= 50% of the window elapsed), worst first. */
  async getAtRisk(thresholdPct = 50) {
    const open = await db('sla_instances')
      .whereNull('actual_end_time')
      .where('breached', false)
      .leftJoin('sla_definitions', 'sla_definitions.id', 'sla_instances.sla_definition_id')
      .select('sla_instances.*', 'sla_definitions.name as definition_name');

    const now = Date.now();
    const withProgress = open
      .map((i: any) => {
        const start = new Date(i.start_time).getTime();
        const end = new Date(i.planned_end_time).getTime();
        const pct = end > start ? Math.round(((now - start) / (end - start)) * 100) : 100;
        const minutesRemaining = Math.round((end - now) / 60_000);
        return { ...i, percent_elapsed: Math.min(pct, 100), minutes_remaining: minutesRemaining };
      })
      .filter((i: any) => i.percent_elapsed >= thresholdPct)
      .sort((a: any, b: any) => b.percent_elapsed - a.percent_elapsed);

    return this.enrich(withProgress);
  }

  async getBreached(limit = 50) {
    const breached = await db('sla_instances')
      .where('breached', true)
      .leftJoin('sla_definitions', 'sla_definitions.id', 'sla_instances.sla_definition_id')
      .select('sla_instances.*', 'sla_definitions.name as definition_name')
      .orderBy('planned_end_time', 'desc')
      .limit(limit);
    return this.enrich(breached);
  }
}

export const slaService = new SlaService();
