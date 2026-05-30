import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { notifyAssignment } from '../../core/notification-engine';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

export class IncidentTaskService {
  async listByIncident(incidentId: string, options: QueryOptions) {
    const query = db('incident_tasks')
      .select(
        'incident_tasks.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incident_tasks.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = incident_tasks.assignment_group_id) as assignment_group_name"),
      )
      .where('incident_tasks.incident_id', incidentId);

    const { dataQuery, countQuery } = applyQueryOptions(query, 'incident_tasks', {
      ...options,
      searchFields: ['number', 'short_description'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 50;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(taskId: string) {
    const task = await db('incident_tasks')
      .select(
        'incident_tasks.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incident_tasks.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = incident_tasks.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incident_tasks.created_by) as created_by_name"),
      )
      .where('incident_tasks.id', taskId)
      .orWhere('incident_tasks.number', taskId)
      .first();

    return task;
  }

  async create(incidentId: string, data: Record<string, unknown>, userId: string) {
    // Verify incident exists
    const incident = await db('incidents').where('id', incidentId).first();
    if (!incident) throw new AppError(404, 'Incident not found');

    // Verify parent task exists if provided
    if (data.parent_task_id) {
      const parentTask = await db('incident_tasks').where('id', data.parent_task_id).first();
      if (!parentTask) throw new AppError(404, 'Parent task not found');
    }

    const seqResult = (await db.raw("SELECT nextval('incident_task_number_seq') as seq")).rows[0];
    const number = `ITSK${seqResult.seq}`;

    const [task] = await db('incident_tasks')
      .insert({
        number,
        incident_id: incidentId,
        parent_task_id: data.parent_task_id || null,
        short_description: data.short_description,
        description: data.description || null,
        status: data.status || 'pending',
        priority: data.priority || 3,
        assigned_to: data.assigned_to || null,
        assignment_group_id: data.assignment_group_id || null,
        planned_start: data.planned_start || null,
        planned_end: data.planned_end || null,
        estimated_hours: data.estimated_hours || null,
        order_index: data.order_index || 0,
        created_by: userId,
      })
      .returning('*');

    // Notify assignee
    if (task.assigned_to) {
      await notifyAssignment(task.assigned_to, 'incident_tasks', number, task.short_description);
    }

    eventBus.emitRecordCreated('incident_tasks', task.id, task, userId);
    return task;
  }

  async update(taskId: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('incident_tasks').where('id', taskId).first();
    if (!existing) throw new AppError(404, 'Task not found');

    // Verify parent task exists if changing
    if (data.parent_task_id && data.parent_task_id !== existing.parent_task_id) {
      const parentTask = await db('incident_tasks').where('id', data.parent_task_id).first();
      if (!parentTask) throw new AppError(404, 'Parent task not found');
    }

    // Auto-set actual dates on status change
    if (data.status === 'in_progress' && existing.status !== 'in_progress' && !data.actual_start) {
      data.actual_start = new Date().toISOString();
    }
    if (data.status === 'completed' && existing.status !== 'completed' && !data.actual_end) {
      data.actual_end = new Date().toISOString();
      if (!data.percent_complete) data.percent_complete = 100;
    }
    if (data.status === 'closed' && existing.status !== 'closed' && !data.actual_end) {
      data.actual_end = new Date().toISOString();
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('incident_tasks').where('id', taskId).update(updateData).returning('*');

    // Audit
    const changes = diffRecords(existing, updateData);
    await recordAudit('incident_tasks', taskId, changes, userId);

    // Notify new assignee
    if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
      await notifyAssignment(data.assigned_to as string, 'incident_tasks', existing.number, existing.short_description);
    }

    if (data.status && data.status !== existing.status) {
      eventBus.emitStateChanged('incident_tasks', taskId, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('incident_tasks', taskId, updated, userId, existing);
    }

    return updated;
  }

  async delete(taskId: string, userId: string) {
    const existing = await db('incident_tasks').where('id', taskId).first();
    if (!existing) throw new AppError(404, 'Task not found');

    // Delete subtasks first (cascade isn't automatic in our audit)
    await db('incident_tasks').where('parent_task_id', taskId).del();

    await db('incident_tasks').where('id', taskId).del();
    eventBus.emitRecordDeleted('incident_tasks', taskId, existing, userId);

    return existing;
  }
}

export const incidentTaskService = new IncidentTaskService();
