import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';

export class WorkflowService {
  async list(options: QueryOptions) {
    const query = db('workflow_rules')
      .select(
        'workflow_rules.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = workflow_rules.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'workflow_rules', {
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
    return db('workflow_rules').where('id', id).first();
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [rule] = await db('workflow_rules')
      .insert({ ...data, created_by: userId })
      .returning('*');
    return rule;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('workflow_rules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Workflow rule not found');
    const [updated] = await db('workflow_rules').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async delete(id: string) {
    await db('workflow_rules').where('id', id).del();
  }

  async getExecutions(options: QueryOptions) {
    const query = db('workflow_executions')
      .join('workflow_rules', 'workflow_rules.id', 'workflow_executions.rule_id')
      .select('workflow_executions.*', 'workflow_rules.name as rule_name')
      .orderBy('workflow_executions.created_at', 'desc');

    const { dataQuery, countQuery } = applyQueryOptions(query, 'workflow_executions', options);
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}

export const workflowService = new WorkflowService();
