import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { notifyAssignment } from '../../core/notification-engine';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

export class ChangeService {
  async list(options: QueryOptions) {
    const query = db('changes')
      .select(
        'changes.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = changes.assignment_group_id) as assignment_group_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'changes', {
      ...options,
      searchFields: ['number', 'short_description'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return db('changes')
      .select(
        'changes.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = changes.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.created_by) as created_by_name"),
      )
      .where('changes.id', id)
      .orWhere('changes.number', id)
      .first();
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [seqResult] = await db.raw("SELECT nextval('change_number_seq') as seq");
    const number = `CHG${seqResult.seq}`;

    const [change] = await db('changes')
      .insert({
        number,
        short_description: data.short_description,
        description: data.description || null,
        state: 'new',
        type: data.type || 'normal',
        risk: data.risk || 'moderate',
        priority: data.priority || 4,
        assigned_to: data.assigned_to || null,
        assignment_group_id: data.assignment_group_id || null,
        planned_start: data.planned_start || null,
        planned_end: data.planned_end || null,
        backout_plan: data.backout_plan || null,
        justification: data.justification || null,
        created_by: userId,
      })
      .returning('*');

    if (change.assigned_to) {
      await notifyAssignment(change.assigned_to, 'changes', number, change.short_description);
    }

    eventBus.emitRecordCreated('changes', change.id, change, userId);
    return change;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('changes').where('id', id).first();
    if (!existing) throw new AppError(404, 'Change not found');

    if (data.state && data.state !== existing.state) {
      validateStateTransition('changes', existing.state, data.state as string);
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('changes').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('changes', id, changes, userId);

    if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
      await notifyAssignment(data.assigned_to as string, 'changes', existing.number, existing.short_description);
    }

    if (data.state && data.state !== existing.state) {
      eventBus.emitStateChanged('changes', id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('changes', id, updated, userId, existing);
    }

    return updated;
  }
}

export const changeService = new ChangeService();
