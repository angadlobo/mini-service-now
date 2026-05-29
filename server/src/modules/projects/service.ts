import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

// ══════════════════════════════════════
// Project Service
// ══════════════════════════════════════

export class ProjectService {
  async list(options: QueryOptions) {
    const query = db('projects')
      .select(
        'projects.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = projects.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = projects.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'projects', {
      ...options,
      searchFields: ['number', 'name'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const project = await db('projects')
      .select(
        'projects.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = projects.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = projects.created_by) as created_by_name"),
      )
      .where('projects.id', id)
      .orWhere('projects.number', id)
      .first();

    return project;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('project_number_seq') as seq")).rows[0];
    const number = `PRJ${seqResult.seq}`;

    const [project] = await db('projects')
      .insert({
        number,
        name: data.name,
        description: data.description || null,
        status: data.status || 'planning',
        priority: data.priority || 3,
        type: data.type || 'waterfall',
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        budget: data.budget || null,
        owner_id: data.owner_id || userId,
        portfolio: data.portfolio || null,
        phase: data.phase || 'initiation',
        created_by: userId,
      })
      .returning('*');

    eventBus.emitRecordCreated('projects', project.id, project, userId);
    return project;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('projects').where('id', id).first();
    if (!existing) throw new AppError(404, 'Project not found');

    // Track status changes
    if (data.status === 'active' && existing.status !== 'active' && !data.actual_start) {
      data.actual_start = new Date().toISOString().split('T')[0];
    }
    if ((data.status === 'completed' || data.status === 'cancelled') && !data.actual_end) {
      data.actual_end = new Date().toISOString().split('T')[0];
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('projects').where('id', id).update(updateData).returning('*');

    // Audit
    const changes = diffRecords(existing, updateData);
    await recordAudit('projects', id, changes, userId);

    if (data.status && data.status !== existing.status) {
      eventBus.emitStateChanged('projects', id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('projects', id, updated, userId, existing);
    }

    return updated;
  }
}

// ══════════════════════════════════════
// Project Task Service
// ══════════════════════════════════════

export class ProjectTaskService {
  async listByProject(projectId: string, options: QueryOptions) {
    const query = db('project_tasks')
      .select(
        'project_tasks.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = project_tasks.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = project_tasks.assignment_group_id) as assignment_group_name"),
      )
      .where('project_tasks.project_id', projectId);

    const { dataQuery, countQuery } = applyQueryOptions(query, 'project_tasks', {
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
    const task = await db('project_tasks')
      .select(
        'project_tasks.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = project_tasks.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = project_tasks.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = project_tasks.created_by) as created_by_name"),
      )
      .where('project_tasks.id', taskId)
      .orWhere('project_tasks.number', taskId)
      .first();

    return task;
  }

  async create(projectId: string, data: Record<string, unknown>, userId: string) {
    // Verify project exists
    const project = await db('projects').where('id', projectId).first();
    if (!project) throw new AppError(404, 'Project not found');

    const seqResult = (await db.raw("SELECT nextval('project_task_number_seq') as seq")).rows[0];
    const number = `TSK${seqResult.seq}`;

    const [task] = await db('project_tasks')
      .insert({
        number,
        project_id: projectId,
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

    eventBus.emitRecordCreated('project_tasks', task.id, task, userId);
    return task;
  }

  async update(taskId: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('project_tasks').where('id', taskId).first();
    if (!existing) throw new AppError(404, 'Task not found');

    // Auto-set actual dates on status change
    if (data.status === 'in_progress' && existing.status !== 'in_progress' && !data.actual_start) {
      data.actual_start = new Date().toISOString();
    }
    if (data.status === 'completed' && existing.status !== 'completed' && !data.actual_end) {
      data.actual_end = new Date().toISOString();
      if (!data.percent_complete) data.percent_complete = 100;
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('project_tasks').where('id', taskId).update(updateData).returning('*');

    // Audit
    const changes = diffRecords(existing, updateData);
    await recordAudit('project_tasks', taskId, changes, userId);

    if (data.status && data.status !== existing.status) {
      eventBus.emitStateChanged('project_tasks', taskId, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('project_tasks', taskId, updated, userId, existing);
    }

    return updated;
  }
}

// ══════════════════════════════════════
// Members, Milestones, Time Entries
// ══════════════════════════════════════

export async function getMembers(projectId: string) {
  return db('project_members')
    .select(
      'project_members.*',
      db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = project_members.user_id) as user_name"),
      db.raw("(SELECT email FROM users WHERE users.id = project_members.user_id) as user_email"),
    )
    .where('project_id', projectId)
    .orderBy('role');
}

export async function addMember(projectId: string, userId: string, role: string = 'member') {
  const existing = await db('project_members')
    .where({ project_id: projectId, user_id: userId })
    .first();
  if (existing) throw new AppError(409, 'User is already a member of this project');

  const [member] = await db('project_members')
    .insert({ project_id: projectId, user_id: userId, role })
    .returning('*');
  return member;
}

export async function removeMember(projectId: string, userId: string) {
  const deleted = await db('project_members')
    .where({ project_id: projectId, user_id: userId })
    .del();
  if (!deleted) throw new AppError(404, 'Member not found');
  return { message: 'Member removed' };
}

export async function getMilestones(projectId: string) {
  return db('project_milestones')
    .where('project_id', projectId)
    .orderBy('due_date');
}

export async function addMilestone(projectId: string, data: Record<string, unknown>) {
  const project = await db('projects').where('id', projectId).first();
  if (!project) throw new AppError(404, 'Project not found');

  const [milestone] = await db('project_milestones')
    .insert({
      project_id: projectId,
      name: data.name,
      due_date: data.due_date || null,
      status: data.status || 'pending',
    })
    .returning('*');
  return milestone;
}

export async function updateMilestone(milestoneId: string, data: Record<string, unknown>) {
  const existing = await db('project_milestones').where('id', milestoneId).first();
  if (!existing) throw new AppError(404, 'Milestone not found');

  // Auto-set completed_date
  if (data.status === 'completed' && !data.completed_date) {
    data.completed_date = new Date().toISOString().split('T')[0];
  }

  const [updated] = await db('project_milestones')
    .where('id', milestoneId)
    .update({ ...data, updated_at: new Date() })
    .returning('*');
  return updated;
}

export async function getTimeEntries(projectId: string) {
  return db('time_entries')
    .select(
      'time_entries.*',
      db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = time_entries.user_id) as user_name"),
      db.raw("(SELECT number FROM project_tasks WHERE project_tasks.id = time_entries.task_id) as task_number"),
      db.raw("(SELECT short_description FROM project_tasks WHERE project_tasks.id = time_entries.task_id) as task_description"),
    )
    .leftJoin('project_tasks', 'time_entries.task_id', 'project_tasks.id')
    .where('project_tasks.project_id', projectId)
    .orWhere(function () {
      this.where('time_entries.table_name', 'projects').andWhere('time_entries.record_id', projectId);
    })
    .orderBy('time_entries.date', 'desc');
}

export async function addTimeEntry(projectId: string, data: Record<string, unknown>, userId: string) {
  const insertData: Record<string, unknown> = {
    user_id: userId,
    date: data.date,
    hours: data.hours,
    notes: data.notes || null,
    billable: data.billable || false,
  };

  if (data.task_id) {
    // Verify task belongs to project
    const task = await db('project_tasks')
      .where({ id: data.task_id as string, project_id: projectId })
      .first();
    if (!task) throw new AppError(404, 'Task not found in this project');
    insertData.task_id = data.task_id;
  } else {
    insertData.table_name = 'projects';
    insertData.record_id = projectId;
  }

  const [entry] = await db('time_entries').insert(insertData).returning('*');
  return entry;
}

export const projectService = new ProjectService();
export const projectTaskService = new ProjectTaskService();
