import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { AppError } from '../../middleware/error';

// ── Cost Centers ──

export class CostCenterService {
  async list(options: QueryOptions) {
    const query = db('cost_centers')
      .select(
        'cost_centers.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cost_centers.manager_id) as manager_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'cost_centers', {
      ...options,
      searchFields: ['code', 'name', 'department'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const center = await db('cost_centers')
      .select(
        'cost_centers.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cost_centers.manager_id) as manager_name"),
      )
      .where('cost_centers.id', id)
      .orWhere('cost_centers.code', id)
      .first();

    return center;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [center] = await db('cost_centers')
      .insert({
        code: data.code,
        name: data.name,
        department: data.department || null,
        manager_id: data.manager_id || null,
        budget_annual: data.budget_annual || 0,
        active: data.active !== undefined ? data.active : true,
      })
      .returning('*');

    await recordAudit('cost_centers', center.id, { action: { old: null, new: 'created' } }, userId);
    return center;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('cost_centers').where('id', id).first();
    if (!existing) throw new AppError(404, 'Cost center not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('cost_centers').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('cost_centers', id, changes, userId);

    return updated;
  }
}

// ── Cost Items ──

export class CostItemService {
  async list(options: QueryOptions) {
    const query = db('cost_items')
      .select(
        'cost_items.*',
        db.raw("(SELECT name FROM cost_centers WHERE cost_centers.id = cost_items.cost_center_id) as cost_center_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'cost_items', {
      ...options,
      searchFields: ['number', 'description', 'category'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const item = await db('cost_items')
      .select(
        'cost_items.*',
        db.raw("(SELECT name FROM cost_centers WHERE cost_centers.id = cost_items.cost_center_id) as cost_center_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cost_items.created_by) as created_by_name"),
      )
      .where('cost_items.id', id)
      .orWhere('cost_items.number', id)
      .first();

    return item;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('cost_item_number_seq') as seq")).rows[0];
    const number = `CST${String(seqResult.seq).padStart(7, '0')}`;

    const [item] = await db('cost_items')
      .insert({
        number,
        cost_center_id: data.cost_center_id,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'USD',
        date: data.date,
        recurring: data.recurring || false,
        frequency: data.frequency || null,
        asset_id: data.asset_id || null,
        contract_id: data.contract_id || null,
        project_id: data.project_id || null,
        created_by: userId,
      })
      .returning('*');

    await recordAudit('cost_items', item.id, { action: { old: null, new: 'created' } }, userId);
    return item;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('cost_items').where('id', id).first();
    if (!existing) throw new AppError(404, 'Cost item not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('cost_items').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('cost_items', id, changes, userId);

    return updated;
  }
}

// ── Chargeback ──

export class ChargebackService {
  async listRules() {
    return db('chargeback_rules').orderBy('created_at', 'desc');
  }

  async createRule(data: Record<string, unknown>) {
    const [rule] = await db('chargeback_rules')
      .insert({
        name: data.name,
        source_type: data.source_type,
        allocation_method: data.allocation_method,
        rate: data.rate || 0,
        unit: data.unit || null,
        active: data.active !== undefined ? data.active : true,
      })
      .returning('*');

    return rule;
  }

  async updateRule(id: string, data: Record<string, unknown>) {
    const existing = await db('chargeback_rules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Chargeback rule not found');

    const [updated] = await db('chargeback_rules')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    return updated;
  }

  async deleteRule(id: string) {
    const existing = await db('chargeback_rules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Chargeback rule not found');

    await db('chargeback_rules').where('id', id).del();
  }

  async listRecords(options: QueryOptions) {
    const query = db('chargeback_records')
      .select(
        'chargeback_records.*',
        db.raw("(SELECT name FROM chargeback_rules WHERE chargeback_rules.id = chargeback_records.rule_id) as rule_name"),
        db.raw("(SELECT name FROM cost_centers WHERE cost_centers.id = chargeback_records.cost_center_id) as cost_center_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'chargeback_records', {
      ...options,
      searchFields: ['period'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async generateRecords(period: string) {
    const rules = await db('chargeback_rules').where('active', true);
    const costCenters = await db('cost_centers').where('active', true);
    const records: any[] = [];

    for (const rule of rules) {
      for (const center of costCenters) {
        const amount = Number(rule.rate);
        if (amount <= 0) continue;

        const [record] = await db('chargeback_records')
          .insert({
            rule_id: rule.id,
            cost_center_id: center.id,
            period,
            amount,
            details: JSON.stringify({
              rule_name: rule.name,
              allocation_method: rule.allocation_method,
              rate: rule.rate,
              unit: rule.unit,
            }),
          })
          .returning('*');

        records.push(record);
      }
    }

    return records;
  }
}

// ── Summary ──

export async function getSummary() {
  const byCategory = await db('cost_items')
    .select('category')
    .sum('amount as total')
    .groupBy('category')
    .orderBy('total', 'desc');

  const byDepartment = await db('cost_items')
    .join('cost_centers', 'cost_centers.id', 'cost_items.cost_center_id')
    .select('cost_centers.department')
    .sum('cost_items.amount as total')
    .groupBy('cost_centers.department')
    .orderBy('total', 'desc');

  const monthlyTrend = await db('cost_items')
    .select(db.raw("to_char(date, 'YYYY-MM') as month"))
    .sum('amount as total')
    .groupBy(db.raw("to_char(date, 'YYYY-MM')"))
    .orderBy('month', 'asc');

  return { byCategory, byDepartment, monthlyTrend };
}

export const costCenterService = new CostCenterService();
export const costItemService = new CostItemService();
export const chargebackService = new ChargebackService();
