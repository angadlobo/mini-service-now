import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { notifyAssignment } from '../../core/notification-engine';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

export class ProblemService {
  async list(options: QueryOptions) {
    const query = db('problems')
      .select(
        'problems.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = problems.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = problems.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = problems.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'problems', {
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
    const problem = await db('problems')
      .select(
        'problems.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = problems.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = problems.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = problems.created_by) as created_by_name"),
      )
      .where('problems.id', id)
      .orWhere('problems.number', id)
      .first();
    return problem;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('problem_number_seq') as seq")).rows[0];
    const number = `PRB${seqResult.seq}`;

    const [problem] = await db('problems')
      .insert({
        number,
        short_description: data.short_description,
        description: data.description || null,
        state: 'new',
        priority: data.priority || 4,
        assigned_to: data.assigned_to || null,
        assignment_group_id: data.assignment_group_id || null,
        created_by: userId,
      })
      .returning('*');

    if (problem.assigned_to) {
      await notifyAssignment(problem.assigned_to, 'problems', number, problem.short_description);
    }

    eventBus.emitRecordCreated('problems', problem.id, problem, userId);
    return problem;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('problems').where('id', id).first();
    if (!existing) throw new AppError(404, 'Problem not found');

    if (data.state && data.state !== existing.state) {
      validateStateTransition('problems', existing.state, data.state as string);
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('problems').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('problems', id, changes, userId);

    if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
      await notifyAssignment(data.assigned_to as string, 'problems', existing.number, existing.short_description);
    }

    if (data.state && data.state !== existing.state) {
      eventBus.emitStateChanged('problems', id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('problems', id, updated, userId, existing);
    }

    return updated;
  }

  async linkIncident(problemId: string, incidentId: string) {
    await db('problem_incidents').insert({ problem_id: problemId, incident_id: incidentId }).onConflict(['problem_id', 'incident_id']).ignore();
  }

  async unlinkIncident(problemId: string, incidentId: string) {
    await db('problem_incidents').where({ problem_id: problemId, incident_id: incidentId }).del();
  }

  async getLinkedIncidents(problemId: string) {
    return db('incidents')
      .join('problem_incidents', 'incidents.id', 'problem_incidents.incident_id')
      .where('problem_incidents.problem_id', problemId)
      .select('incidents.*');
  }

  async linkChange(problemId: string, changeId: string) {
    await db('problem_changes').insert({ problem_id: problemId, change_id: changeId }).onConflict(['problem_id', 'change_id']).ignore();
  }

  async unlinkChange(problemId: string, changeId: string) {
    await db('problem_changes').where({ problem_id: problemId, change_id: changeId }).del();
  }

  async getLinkedChanges(problemId: string) {
    return db('changes')
      .join('problem_changes', 'changes.id', 'problem_changes.change_id')
      .where('problem_changes.problem_id', problemId)
      .select('changes.*');
  }
}

export const problemService = new ProblemService();
