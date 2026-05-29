import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { applySla, completeSla } from '../../core/sla-engine';
import { notifyAssignment } from '../../core/notification-engine';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

const PRIORITY_MATRIX: Record<string, number> = {
  '1-1': 1, '1-2': 2, '1-3': 3,
  '2-1': 2, '2-2': 3, '2-3': 4,
  '3-1': 3, '3-2': 4, '3-3': 5,
};

function calcPriority(urgency: number, impact: number): number {
  return PRIORITY_MATRIX[`${urgency}-${impact}`] || 4;
}

export class IncidentService {
  async list(options: QueryOptions) {
    const query = db('incidents')
      .select(
        'incidents.*',
        db.raw("(SELECT username FROM users WHERE users.id = incidents.assigned_to) as assigned_to_username"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incidents.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = incidents.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incidents.caller_id) as caller_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'incidents', {
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
    const incident = await db('incidents')
      .select(
        'incidents.*',
        db.raw("(SELECT username FROM users WHERE users.id = incidents.assigned_to) as assigned_to_username"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incidents.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = incidents.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incidents.caller_id) as caller_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = incidents.created_by) as created_by_name"),
      )
      .where('incidents.id', id)
      .orWhere('incidents.number', id)
      .first();

    return incident;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const urgency = Number(data.urgency || 3);
    const impact = Number(data.impact || 3);
    const priority = calcPriority(urgency, impact);

    const seqResult = (await db.raw("SELECT nextval('incident_number_seq') as seq")).rows[0];
    const number = `INC${seqResult.seq}`;

    const [incident] = await db('incidents')
      .insert({
        number,
        short_description: data.short_description,
        description: data.description || null,
        state: 'new',
        priority,
        urgency,
        impact,
        caller_id: data.caller_id || userId,
        assigned_to: data.assigned_to || null,
        assignment_group_id: data.assignment_group_id || null,
        created_by: userId,
      })
      .returning('*');

    // Apply SLA
    const slaDue = await applySla('incidents', incident.id, { priority });
    if (slaDue) {
      await db('incidents').where('id', incident.id).update({ sla_due: slaDue.toISOString() });
      incident.sla_due = slaDue.toISOString();
    }

    // Notify assignee
    if (incident.assigned_to) {
      await notifyAssignment(incident.assigned_to, 'incidents', number, incident.short_description);
    }

    eventBus.emitRecordCreated('incidents', incident.id, incident, userId);
    return incident;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('incidents').where('id', id).first();
    if (!existing) throw new AppError(404, 'Incident not found');

    // State transition validation
    if (data.state && data.state !== existing.state) {
      validateStateTransition('incidents', existing.state, data.state as string);

      if (data.state === 'resolved') {
        data.resolved_at = new Date().toISOString();
        await completeSla('incidents', id);
      }
      if (data.state === 'closed') {
        data.closed_at = new Date().toISOString();
      }
    }

    // Recalculate priority if urgency/impact changed
    const urgency = Number(data.urgency || existing.urgency);
    const impact = Number(data.impact || existing.impact);
    if (data.urgency || data.impact) {
      data.priority = calcPriority(urgency, impact);
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('incidents').where('id', id).update(updateData).returning('*');

    // Audit
    const changes = diffRecords(existing, updateData);
    await recordAudit('incidents', id, changes, userId);

    // Notify new assignee
    if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
      await notifyAssignment(data.assigned_to as string, 'incidents', existing.number, existing.short_description);
    }

    if (data.state && data.state !== existing.state) {
      eventBus.emitStateChanged('incidents', id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('incidents', id, updated, userId, existing);
    }

    return updated;
  }
}

export const incidentService = new IncidentService();
