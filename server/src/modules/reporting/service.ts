import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';

const ALLOWED_TABLES = [
  'incidents', 'changes', 'problems', 'cis', 'users',
  'approvals', 'sc_requests', 'sc_catalog_items', 'knowledge_articles',
];

export class ReportingService {
  async list(options: QueryOptions) {
    const query = db('reports')
      .select(
        'reports.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = reports.created_by) as created_by_name"),
      );
    const { dataQuery, countQuery } = applyQueryOptions(query, 'reports', {
      ...options,
      searchFields: ['name', 'table_name'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return db('reports').where('id', id).first();
  }

  async create(data: Record<string, unknown>, userId: string) {
    const payload: Record<string, unknown> = { ...data, created_by: userId };
    const jsonFields = ['columns', 'filters', 'config'];
    for (const field of jsonFields) {
      if (payload[field] && typeof payload[field] !== 'string') {
        payload[field] = JSON.stringify(payload[field]);
      }
    }
    const [report] = await db('reports').insert(payload).returning('*');
    return report;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('reports').where('id', id).first();
    if (!existing) throw new AppError(404, 'Report not found');
    const payload: Record<string, unknown> = { ...data, updated_at: new Date() };
    const jsonFields = ['columns', 'filters', 'config'];
    for (const field of jsonFields) {
      if (payload[field] && typeof payload[field] !== 'string') {
        payload[field] = JSON.stringify(payload[field]);
      }
    }
    const [updated] = await db('reports').where('id', id).update(payload).returning('*');
    return updated;
  }

  async delete(id: string) {
    await db('reports').where('id', id).del();
  }

  async getTableColumns(tableName: string) {
    if (!ALLOWED_TABLES.includes(tableName)) {
      throw new AppError(400, `Table "${tableName}" is not available for reporting`);
    }
    const columns = await db.raw(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = ?
      ORDER BY ordinal_position
    `, [tableName]);
    return (columns.rows || []).map((c: any) => ({
      name: c.column_name,
      type: c.data_type,
      nullable: c.is_nullable === 'YES',
    }));
  }

  async run(id: string) {
    const report = await db('reports').where('id', id).first();
    if (!report) throw new AppError(404, 'Report not found');

    const columns = (report.columns as string[]) || ['*'];
    const filters = report.filters as Record<string, unknown> || {};
    const config = (report.config as Record<string, unknown>) || {};
    const groupBy = config.group_by as string | undefined;
    const aggregateFunction = config.aggregate_function as string | undefined;
    const aggregateColumn = config.aggregate_column as string | undefined;
    const sortBy = config.sort_by as string | undefined;
    const sortDirection = (config.sort_direction as string) || 'asc';
    const rowLimit = Math.min(Number(config.row_limit) || 1000, 5000);

    let query = db(report.table_name);

    // If group_by + aggregate, build aggregation query
    if (groupBy && aggregateFunction) {
      const aggCol = aggregateColumn || 'id';
      const aggFn = ['count', 'sum', 'avg', 'min', 'max'].includes(aggregateFunction)
        ? aggregateFunction : 'count';
      query = query
        .select(groupBy)
        .select(db.raw(`${aggFn}("${aggCol}") as value`))
        .groupBy(groupBy);
      if (sortBy === 'value') {
        query = query.orderBy(db.raw(`${aggFn}("${aggCol}")`), sortDirection as 'asc' | 'desc');
      } else {
        query = query.orderBy(groupBy, sortDirection as 'asc' | 'desc');
      }
    } else {
      query = query.select(columns);
      if (sortBy) {
        query = query.orderBy(sortBy, sortDirection as 'asc' | 'desc');
      }
    }

    // Apply filters — support both new format {column: {operator, value}}
    // and legacy seed format {logic: "AND", conditions: [{field, operator, value}]}
    if (Array.isArray(filters.conditions)) {
      // Legacy format
      for (const cond of filters.conditions as any[]) {
        if (!cond.field || cond.value === undefined || cond.value === '') continue;
        const field = cond.field as string;
        const op = cond.operator as string;
        const val = cond.value;
        switch (op) {
          case 'equals': case 'eq': query = query.where(field, '=', val); break;
          case 'not_equals': case 'neq': query = query.where(field, '!=', val); break;
          case 'greater_than': case 'gt': query = query.where(field, '>', val); break;
          case 'less_than': case 'lt': query = query.where(field, '<', val); break;
          case 'contains': query = query.whereILike(field, `%${val}%`); break;
          case 'in':
            if (Array.isArray(val)) query = query.whereIn(field, val);
            break;
          default: query = query.where(field, '=', val);
        }
      }
    } else {
      // New format
      for (const [key, value] of Object.entries(filters)) {
        if (key === 'logic' || key === 'conditions') continue;
        if (value === null || value === undefined || value === '') continue;
        if (typeof value === 'object' && value !== null) {
          const filterObj = value as Record<string, unknown>;
          if (filterObj.operator && filterObj.value !== undefined && filterObj.value !== '') {
            const op = filterObj.operator as string;
            const val = filterObj.value;
            switch (op) {
              case 'eq': query = query.where(key, '=', val); break;
              case 'neq': query = query.where(key, '<>', val as any); break;
              case 'gt': query = query.where(key, '>', val); break;
              case 'gte': query = query.where(key, '>=', val); break;
              case 'lt': query = query.where(key, '<', val); break;
              case 'lte': query = query.where(key, '<=', val); break;
              case 'contains': query = query.whereILike(key, `%${val}%`); break;
              case 'starts_with': query = query.whereILike(key, `${val}%`); break;
              case 'ends_with': query = query.whereILike(key, `%${val}`); break;
              case 'is_null': query = query.whereNull(key); break;
              case 'is_not_null': query = query.whereNotNull(key); break;
              case 'in':
                if (Array.isArray(val)) query = query.whereIn(key, val);
                break;
              default: query = query.where(key, '=', val);
            }
          }
        } else {
          query = query.where(key, value);
        }
      }
    }

    const data = await query.limit(rowLimit);

    let resultColumns: string[];
    if (groupBy && aggregateFunction) {
      resultColumns = [groupBy, 'value'];
    } else if (columns[0] === '*') {
      resultColumns = Object.keys(data[0] || {});
    } else {
      resultColumns = columns;
    }

    return { data, columns: resultColumns, total: data.length };
  }

  async exportCsv(id: string): Promise<string> {
    const result = await this.run(id);
    if (result.data.length === 0) return '';

    const headers = result.columns.join(',');
    const rows = result.data.map((row: any) =>
      result.columns.map((col: string) => {
        const val = String(row[col] ?? '').replace(/"/g, '""');
        return `"${val}"`;
      }).join(',')
    );
    return [headers, ...rows].join('\n');
  }

  // Schedules
  async getSchedules(reportId: string) {
    return db('report_schedules').where('report_id', reportId);
  }

  async createSchedule(data: Record<string, unknown>) {
    const [schedule] = await db('report_schedules').insert(data).returning('*');
    return schedule;
  }

  async deleteSchedule(id: string) {
    await db('report_schedules').where('id', id).del();
  }
}

export const reportingService = new ReportingService();
