import { db } from '../../config/database';
import { AppError } from '../../middleware/error';
import { reportingService } from '../reporting/service';
import type { WidgetConfig } from '@shared/interfaces';

const DEFAULT_LAYOUT: WidgetConfig[] = [
  { id: 'default-1', type: 'stat_card', title: 'Open Incidents', table_name: 'incidents', aggregate: 'count', filters: { state: { operator: 'in', value: ['new', 'in_progress', 'on_hold'] } }, col_span: 1, row_order: 0, color: 'red' },
  { id: 'default-2', type: 'stat_card', title: 'Open Changes', table_name: 'changes', aggregate: 'count', filters: { state: { operator: 'in', value: ['new', 'assess', 'authorize', 'scheduled', 'implement'] } }, col_span: 1, row_order: 1, color: 'blue' },
  { id: 'default-3', type: 'stat_card', title: 'Catalog Requests', table_name: 'sc_requests', aggregate: 'count', col_span: 1, row_order: 2, color: 'green' },
  { id: 'default-4', type: 'stat_card', title: 'KB Articles', table_name: 'kb_articles', aggregate: 'count', filters: { state: 'published' }, col_span: 1, row_order: 3, color: 'violet' },
  { id: 'default-5', type: 'stat_card', title: 'Open Problems', table_name: 'problems', aggregate: 'count', filters: { state: { operator: 'in', value: ['new', 'open', 'in_progress'] } }, col_span: 1, row_order: 4, color: 'orange' },
  { id: 'default-6', type: 'stat_card', title: 'Active CIs', table_name: 'cis', aggregate: 'count', filters: { status: 'active' }, col_span: 1, row_order: 5, color: 'teal' },
  { id: 'default-7', type: 'bar_chart', title: 'Incidents by Priority', table_name: 'incidents', group_by: 'priority', col_span: 2, row_order: 6, color: '#667eea' },
  { id: 'default-8', type: 'pie_chart', title: 'Changes by State', table_name: 'changes', group_by: 'state', col_span: 2, row_order: 7 },
];

export class DashboardService {
  async getStats() {
    const [
      incidentTotal, incidentOpen, incidentCritical, breachedSla,
      incidentByState, incidentByPriority,
      changeTotal, changeOpen, changePendingApproval, changeByState,
      catalogTotal, catalogPending,
      kbTotal, kbPublished,
      problemTotal, problemOpen, problemByState,
      ciTotal, ciActive,
    ] = await Promise.all([
      db('incidents').count('* as c').first(),
      db('incidents').whereNotIn('state', ['closed', 'cancelled', 'resolved']).count('* as c').first(),
      db('incidents').where('priority', 1).whereNotIn('state', ['closed', 'cancelled', 'resolved']).count('* as c').first(),
      db('sla_instances').where({ table_name: 'incidents', breached: true }).count('* as c').first(),
      db('incidents').select('state').count('* as count').groupBy('state'),
      db('incidents').select('priority').count('* as count').groupBy('priority'),
      db('changes').count('* as c').first(),
      db('changes').whereNotIn('state', ['closed', 'cancelled']).count('* as c').first(),
      db('changes').where('state', 'authorize').count('* as c').first(),
      db('changes').select('state').count('* as count').groupBy('state'),
      db('sc_requests').count('* as c').first(),
      db('sc_requests').where('state', 'pending').count('* as c').first(),
      db('kb_articles').count('* as c').first(),
      db('kb_articles').where('state', 'published').count('* as c').first(),
      db('problems').count('* as c').first().catch(() => ({ c: 0 })),
      db('problems').whereNotIn('state', ['closed']).count('* as c').first().catch(() => ({ c: 0 })),
      db('problems').select('state').count('* as count').groupBy('state').catch(() => []),
      db('cis').count('* as c').first().catch(() => ({ c: 0 })),
      db('cis').where('status', 'active').count('* as c').first().catch(() => ({ c: 0 })),
    ]);

    const toMap = (rows: { state?: string; priority?: number; count: string }[]) =>
      Object.fromEntries((rows || []).map((r) => [r.state || r.priority, Number(r.count)]));

    return {
      incidents: {
        total: Number(incidentTotal?.c || 0),
        open: Number(incidentOpen?.c || 0),
        critical: Number(incidentCritical?.c || 0),
        breached_sla: Number(breachedSla?.c || 0),
        by_state: toMap(incidentByState as any[]),
        by_priority: toMap(incidentByPriority as any[]),
      },
      changes: {
        total: Number(changeTotal?.c || 0),
        open: Number(changeOpen?.c || 0),
        pending_approval: Number(changePendingApproval?.c || 0),
        by_state: toMap(changeByState as any[]),
      },
      catalog: {
        total_requests: Number(catalogTotal?.c || 0),
        pending: Number(catalogPending?.c || 0),
      },
      knowledge: {
        total_articles: Number(kbTotal?.c || 0),
        published: Number(kbPublished?.c || 0),
      },
      problems: {
        total: Number((problemTotal as any)?.c || 0),
        open: Number((problemOpen as any)?.c || 0),
        by_state: toMap(problemByState as any[]),
      },
      cmdb: {
        total: Number((ciTotal as any)?.c || 0),
        active: Number((ciActive as any)?.c || 0),
      },
    };
  }

  async getMyWork(userId: string) {
    const [incidents, changes, problems] = await Promise.all([
      db('incidents')
        .where('assigned_to', userId)
        .whereNotIn('state', ['closed', 'cancelled'])
        .orderBy('priority')
        .limit(10),
      db('changes')
        .where('assigned_to', userId)
        .whereNotIn('state', ['closed', 'cancelled'])
        .orderBy('priority')
        .limit(10),
      db('problems')
        .where('assigned_to', userId)
        .whereNotIn('state', ['closed'])
        .orderBy('priority')
        .limit(10)
        .catch(() => []),
    ]);

    return { incidents, changes, problems };
  }

  async getUserLayout(userId: string): Promise<WidgetConfig[]> {
    const row = await db('user_dashboards').where('user_id', userId).first();
    if (row) return row.layout as WidgetConfig[];
    return DEFAULT_LAYOUT;
  }

  async saveUserLayout(userId: string, layout: WidgetConfig[]) {
    const existing = await db('user_dashboards').where('user_id', userId).first();
    if (existing) {
      await db('user_dashboards').where('user_id', userId).update({
        layout: JSON.stringify(layout),
        updated_at: db.fn.now(),
      });
    } else {
      await db('user_dashboards').insert({
        user_id: userId,
        layout: JSON.stringify(layout),
      });
    }
    return layout;
  }

  async getWidgetData(widget: WidgetConfig) {
    // Handle report_chart type
    if (widget.type === 'report_chart' && widget.report_id) {
      try {
        const result = await reportingService.run(widget.report_id);
        return { data: result.data, columns: result.columns };
      } catch {
        return { data: [], error: 'Report not found or failed to run' };
      }
    }

    const { table_name, type, aggregate, aggregate_field, filters, group_by, columns } = widget;

    if (!table_name) return { data: [] };

    const hasTable = await db.schema.hasTable(table_name);
    if (!hasTable) return { data: [], error: `Table '${table_name}' does not exist` };

    const applyFilters = (query: any, f: Record<string, unknown>) => {
      for (const [k, v] of Object.entries(f)) {
        if (v === undefined || v === null || v === '') continue;
        if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
          const fo = v as Record<string, unknown>;
          if (fo.operator && fo.value !== undefined) {
            const op = fo.operator as string;
            const val = fo.value;
            switch (op) {
              case 'in': if (Array.isArray(val)) query = query.whereIn(k, val); break;
              case 'eq': query = query.where(k, '=', val); break;
              case 'neq': query = query.where(k, '!=', val); break;
              case 'gt': query = query.where(k, '>', val); break;
              case 'lt': query = query.where(k, '<', val); break;
              case 'contains': query = query.whereILike(k, `%${val}%`); break;
              default: query = query.where(k, '=', val);
            }
          }
        } else {
          query = query.where(k, v);
        }
      }
      return query;
    };

    if (type === 'stat_card') {
      let query = db(table_name);
      if (filters) query = applyFilters(query, filters);
      if (aggregate === 'sum' && aggregate_field) {
        const result = await query.sum(`${aggregate_field} as value`).first();
        return { value: Number((result as any)?.value || 0) };
      }
      if (aggregate === 'avg' && aggregate_field) {
        const result = await query.avg(`${aggregate_field} as value`).first();
        return { value: Number((result as any)?.value || 0) };
      }
      // default to count
      const result = await query.count('* as value').first();
      return { value: Number(result?.value || 0) };
    }

    if (['bar_chart', 'pie_chart', 'line_chart'].includes(type) && group_by) {
      let query = db(table_name).select(group_by).count('* as count').groupBy(group_by);
      if (filters) query = applyFilters(query, filters);
      const data = await query;
      return { data };
    }

    if (type === 'table' || type === 'list') {
      const cols = columns && columns.length > 0 ? columns : ['*'];
      let query = db(table_name).select(cols).orderBy('created_at', 'desc').limit(20);
      if (filters) query = applyFilters(query, filters);
      const data = await query;
      return { data };
    }

    return { data: [] };
  }
}

export const dashboardService = new DashboardService();
