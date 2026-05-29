import { db } from '../../config/database';
import { AppError } from '../../middleware/error';
import { eventBus } from '../../core/event-bus';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MANAGER_SELECT = "(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = major_incidents.manager_id) as manager_name";
const DECLARED_SELECT = "(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = major_incidents.declared_by) as declared_by_name";
const INCIDENT_NUMBER_SELECT = "(SELECT number FROM incidents WHERE incidents.id = major_incidents.incident_id) as incident_number";

export class MajorIncidentService {
  async list(status?: string) {
    const q = db('major_incidents')
      .select('major_incidents.*', db.raw(MANAGER_SELECT), db.raw(DECLARED_SELECT), db.raw(INCIDENT_NUMBER_SELECT))
      .orderByRaw("CASE status WHEN 'active' THEN 0 WHEN 'proposed' THEN 1 ELSE 2 END")
      .orderBy('declared_at', 'desc');
    if (status) q.where('major_incidents.status', status);
    return q;
  }

  async getById(id: string) {
    const lookup = UUID_RE.test(String(id)) ? { 'major_incidents.id': id } : { 'major_incidents.number': id };
    const mi = await db('major_incidents')
      .select('major_incidents.*', db.raw(MANAGER_SELECT), db.raw(DECLARED_SELECT), db.raw(INCIDENT_NUMBER_SELECT))
      .where(lookup)
      .first();
    if (!mi) throw new AppError(404, 'Major incident not found');

    const updates = await db('major_incident_updates')
      .select('major_incident_updates.*', db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = major_incident_updates.posted_by) as posted_by_name"))
      .where('major_incident_id', mi.id)
      .orderBy('created_at', 'desc');

    return { ...mi, updates };
  }

  /**
   * Declare a major incident. If `incident_id` is provided, the major incident is
   * linked to that trigger incident (and its priority is escalated to 1/Critical).
   */
  async declare(data: Record<string, any>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('major_incident_number_seq') as seq")).rows[0];
    const number = `MI${String(seqResult.seq).padStart(7, '0')}`;

    let title = data.title;
    let incidentId: string | null = null;

    if (data.incident_id) {
      const lookup = UUID_RE.test(String(data.incident_id)) ? { id: data.incident_id } : { number: data.incident_id };
      const incident = await db('incidents').where(lookup).first();
      if (!incident) throw new AppError(404, 'Trigger incident not found');
      incidentId = incident.id;
      if (!title) title = incident.short_description;
      // Escalate the trigger incident to Critical priority.
      await db('incidents').where('id', incident.id).update({ priority: 1, urgency: 1, impact: 1, updated_at: new Date() });
    }

    if (!title) throw new AppError(400, 'A title or trigger incident is required');

    const [mi] = await db('major_incidents')
      .insert({
        number,
        incident_id: incidentId,
        title,
        status: data.status || 'active',
        severity: data.severity || 'sev1',
        manager_id: data.manager_id || null,
        business_impact: data.business_impact || null,
        summary: data.summary || null,
        war_room_url: data.war_room_url || null,
        declared_by: userId,
      })
      .returning('*');

    await db('major_incident_updates').insert({
      major_incident_id: mi.id,
      type: 'timeline',
      audience: 'internal',
      message: `Major incident ${number} declared${incidentId ? ' from a trigger incident' : ''}.`,
      posted_by: userId,
    });

    eventBus.emit('record.created', { type: 'record.created', tableName: 'major_incidents', recordId: mi.id, data: mi, userId });
    return mi;
  }

  async update(id: string, data: Record<string, any>, userId: string) {
    const mi = await db('major_incidents').where('id', id).first();
    if (!mi) throw new AppError(404, 'Major incident not found');

    const patch: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.status === 'resolved' && mi.status !== 'resolved') {
      patch.resolved_at = new Date();
    }
    const [updated] = await db('major_incidents').where('id', id).update(patch).returning('*');

    if (data.status && data.status !== mi.status) {
      await db('major_incident_updates').insert({
        major_incident_id: id,
        type: 'status',
        audience: 'internal',
        message: `Status changed from ${mi.status} to ${data.status}.`,
        posted_by: userId,
      });
      if (data.status === 'resolved') {
        eventBus.emitStateChanged('major_incidents', id, updated, userId, mi);
      }
    }

    return updated;
  }

  async postUpdate(id: string, data: Record<string, any>, userId: string) {
    const mi = await db('major_incidents').where('id', id).first();
    if (!mi) throw new AppError(404, 'Major incident not found');

    const [update] = await db('major_incident_updates')
      .insert({
        major_incident_id: id,
        type: data.type || 'timeline',
        audience: data.audience || 'internal',
        message: data.message,
        posted_by: userId,
      })
      .returning('*');

    return update;
  }

  async getDashboard() {
    const rows = await db('major_incidents').select('status', 'severity');
    const active = rows.filter((r: any) => r.status === 'active').length;
    const proposed = rows.filter((r: any) => r.status === 'proposed').length;
    const resolved = rows.filter((r: any) => r.status === 'resolved').length;
    const bySeverity = ['sev1', 'sev2', 'sev3'].map((sev) => ({
      severity: sev,
      active: rows.filter((r: any) => r.severity === sev && r.status === 'active').length,
    }));
    return { total: rows.length, active, proposed, resolved, bySeverity };
  }
}

export const majorIncidentService = new MajorIncidentService();
