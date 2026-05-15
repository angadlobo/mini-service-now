import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';

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
    const [report] = await db('reports').insert({ ...data, created_by: userId }).returning('*');
    return report;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('reports').where('id', id).first();
    if (!existing) throw new AppError(404, 'Report not found');
    const [updated] = await db('reports').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async delete(id: string) {
    await db('reports').where('id', id).del();
  }

  async run(id: string) {
    const report = await db('reports').where('id', id).first();
    if (!report) throw new AppError(404, 'Report not found');

    const columns = (report.columns as string[]) || ['*'];
    const filters = report.filters as Record<string, unknown> || {};

    let query = db(report.table_name).select(columns);

    // Apply filters
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== '') {
        query = query.where(key, value);
      }
    }

    const data = await query.limit(1000);
    return { data, columns: columns[0] === '*' ? Object.keys(data[0] || {}) : columns, total: data.length };
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
