import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { AppError } from '../../middleware/error';

export class BCPlanService {
  async list(options: QueryOptions) {
    const query = db('bc_plans')
      .select(
        'bc_plans.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = bc_plans.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = bc_plans.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'bc_plans', {
      ...options,
      searchFields: ['number', 'name', 'description'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const plan = await db('bc_plans')
      .select(
        'bc_plans.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = bc_plans.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = bc_plans.created_by) as created_by_name"),
      )
      .where('bc_plans.id', id)
      .orWhere('bc_plans.number', id)
      .first();

    return plan;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('bc_plan_number_seq') as seq")).rows[0];
    const number = `BCP${String(seqResult.seq).padStart(7, '0')}`;

    const [plan] = await db('bc_plans')
      .insert({
        number,
        name: data.name,
        description: data.description || null,
        status: data.status || 'draft',
        type: data.type || 'business_continuity',
        owner_id: data.owner_id || null,
        last_tested: data.last_tested || null,
        next_test_due: data.next_test_due || null,
        rpo_hours: data.rpo_hours || null,
        rto_hours: data.rto_hours || null,
        business_service_id: data.business_service_id || null,
        created_by: userId,
      })
      .returning('*');

    await recordAudit('bc_plans', plan.id, { action: { old: null, new: 'created' } }, userId);
    return plan;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('bc_plans').where('id', id).first();
    if (!existing) throw new AppError(404, 'BC plan not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('bc_plans').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('bc_plans', id, changes, userId);

    return updated;
  }

  async delete(id: string) {
    const existing = await db('bc_plans').where('id', id).first();
    if (!existing) throw new AppError(404, 'BC plan not found');

    await db('bc_plans').where('id', id).del();
  }

  // ── Tasks ──

  async getTasks(planId: string) {
    return db('bc_plan_tasks')
      .select(
        'bc_plan_tasks.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = bc_plan_tasks.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = bc_plan_tasks.assignment_group_id) as assignment_group_name"),
      )
      .where('plan_id', planId)
      .orderBy('order_index', 'asc');
  }

  async addTask(planId: string, data: Record<string, unknown>) {
    const plan = await db('bc_plans').where('id', planId).first();
    if (!plan) throw new AppError(404, 'BC plan not found');

    const [task] = await db('bc_plan_tasks')
      .insert({
        plan_id: planId,
        order_index: data.order_index || 0,
        description: data.description,
        assigned_to: data.assigned_to || null,
        assignment_group_id: data.assignment_group_id || null,
        estimated_minutes: data.estimated_minutes || null,
        category: data.category || 'recovery',
      })
      .returning('*');

    return task;
  }

  async updateTask(id: string, data: Record<string, unknown>) {
    const existing = await db('bc_plan_tasks').where('id', id).first();
    if (!existing) throw new AppError(404, 'BC plan task not found');

    const [updated] = await db('bc_plan_tasks')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    return updated;
  }

  async deleteTask(id: string) {
    const existing = await db('bc_plan_tasks').where('id', id).first();
    if (!existing) throw new AppError(404, 'BC plan task not found');

    await db('bc_plan_tasks').where('id', id).del();
  }

  // ── Tests ──

  async getTests(planId: string) {
    return db('bc_tests')
      .select(
        'bc_tests.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = bc_tests.conducted_by) as conducted_by_name"),
      )
      .where('plan_id', planId)
      .orderBy('test_date', 'desc');
  }

  async addTest(planId: string, data: Record<string, unknown>) {
    const plan = await db('bc_plans').where('id', planId).first();
    if (!plan) throw new AppError(404, 'BC plan not found');

    const [test] = await db('bc_tests')
      .insert({
        plan_id: planId,
        test_date: data.test_date,
        test_type: data.test_type || 'tabletop',
        status: data.status || 'planned',
        actual_rto_hours: data.actual_rto_hours || null,
        actual_rpo_hours: data.actual_rpo_hours || null,
        findings: data.findings || null,
        conducted_by: data.conducted_by || null,
      })
      .returning('*');

    // Update plan last_tested and next_test_due if test is completed
    if (data.status === 'completed') {
      await db('bc_plans').where('id', planId).update({
        last_tested: data.test_date,
        updated_at: new Date(),
      });
    }

    return test;
  }

  async updateTest(id: string, data: Record<string, unknown>) {
    const existing = await db('bc_tests').where('id', id).first();
    if (!existing) throw new AppError(404, 'BC test not found');

    const [updated] = await db('bc_tests')
      .where('id', id)
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    // Update plan last_tested if test is marked completed
    if (data.status === 'completed') {
      await db('bc_plans').where('id', existing.plan_id).update({
        last_tested: updated.test_date,
        updated_at: new Date(),
      });
    }

    return updated;
  }
}

export const bcPlanService = new BCPlanService();
