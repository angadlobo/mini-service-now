import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { AppError } from '../../middleware/error';

export class EventService {
  async list(options: QueryOptions) {
    const query = db('monitoring_events')
      .select(
        'monitoring_events.*',
        db.raw("(SELECT name FROM cis WHERE cis.id = monitoring_events.ci_id) as ci_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = monitoring_events.acknowledged_by) as acknowledged_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'monitoring_events', {
      ...options,
      searchFields: ['number', 'node', 'description', 'message_key'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const event = await db('monitoring_events')
      .select(
        'monitoring_events.*',
        db.raw("(SELECT name FROM cis WHERE cis.id = monitoring_events.ci_id) as ci_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = monitoring_events.acknowledged_by) as acknowledged_by_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = monitoring_events.created_by) as created_by_name"),
        db.raw("(SELECT number FROM incidents WHERE incidents.id = monitoring_events.incident_id) as incident_number"),
      )
      .where('monitoring_events.id', id)
      .orWhere('monitoring_events.number', id)
      .first();

    return event;
  }

  async create(data: Record<string, unknown>, userId?: string) {
    // Dedup: check if same message_key exists and is not closed
    if (data.message_key) {
      const existing = await db('monitoring_events')
        .where('message_key', data.message_key)
        .whereNot('status', 'closed')
        .first();

      if (existing) {
        // Correlate instead of creating new: create a new event and link them
        const seqResult = (await db.raw("SELECT nextval('event_number_seq') as seq")).rows[0];
        const number = `EVT${String(seqResult.seq).padStart(7, '0')}`;

        const [newEvent] = await db('monitoring_events')
          .insert({
            number,
            source: data.source,
            severity: data.severity || 'info',
            status: 'open',
            node: data.node || null,
            type: data.type || null,
            metric_name: data.metric_name || null,
            metric_value: data.metric_value || null,
            threshold: data.threshold || null,
            message_key: data.message_key || null,
            description: data.description || null,
            ci_id: data.ci_id || null,
            alert_rule_id: data.alert_rule_id || null,
            correlation_id: existing.id,
            created_by: userId || null,
          })
          .returning('*');

        // Add correlation record
        await db('event_correlations').insert({
          parent_event_id: existing.id,
          child_event_id: newEvent.id,
          correlation_type: 'duplicate',
        });

        return newEvent;
      }
    }

    const seqResult = (await db.raw("SELECT nextval('event_number_seq') as seq")).rows[0];
    const number = `EVT${String(seqResult.seq).padStart(7, '0')}`;

    const severity = (data.severity as string) || 'info';

    // Check alert rules for severity override and auto-incident creation
    let alertRuleId = data.alert_rule_id || null;
    let effectiveSeverity = severity;
    let incidentId = null;

    if (data.source) {
      const matchingRule = await db('alert_rules')
        .where('source', data.source)
        .where('enabled', true)
        .first();

      if (matchingRule) {
        alertRuleId = matchingRule.id;
        if (matchingRule.severity_override) {
          effectiveSeverity = matchingRule.severity_override;
        }

        // Auto-create incident for critical/major events if actions include create_incident
        const actions = matchingRule.actions || {};
        if (actions.create_incident && ['critical', 'major'].includes(effectiveSeverity)) {
          const incSeqResult = (await db.raw("SELECT nextval('incident_number_seq') as seq")).rows[0];
          const incNumber = `INC${incSeqResult.seq}`;

          const [incident] = await db('incidents')
            .insert({
              number: incNumber,
              short_description: `[Auto] Event: ${data.node || 'Unknown'} - ${data.metric_name || effectiveSeverity}`,
              description: data.description || `Auto-created from monitoring event ${number}`,
              state: 'new',
              priority: effectiveSeverity === 'critical' ? 1 : 2,
              urgency: effectiveSeverity === 'critical' ? 1 : 2,
              impact: effectiveSeverity === 'critical' ? 1 : 2,
              assignment_group_id: matchingRule.assignment_group_id || null,
              created_by: userId || null,
            })
            .returning('*');

          incidentId = incident.id;
        }
      }
    }

    const [event] = await db('monitoring_events')
      .insert({
        number,
        source: data.source,
        severity: effectiveSeverity,
        status: 'open',
        node: data.node || null,
        type: data.type || null,
        metric_name: data.metric_name || null,
        metric_value: data.metric_value || null,
        threshold: data.threshold || null,
        message_key: data.message_key || null,
        description: data.description || null,
        ci_id: data.ci_id || null,
        alert_rule_id: alertRuleId || null,
        incident_id: incidentId,
        created_by: userId || null,
      })
      .returning('*');

    return event;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('monitoring_events').where('id', id).first();
    if (!existing) throw new AppError(404, 'Event not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('monitoring_events').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('monitoring_events', id, changes, userId);

    return updated;
  }

  async acknowledge(id: string, userId: string) {
    const existing = await db('monitoring_events').where('id', id).first();
    if (!existing) throw new AppError(404, 'Event not found');
    if (existing.status === 'closed' || existing.status === 'resolved') {
      throw new AppError(400, 'Cannot acknowledge a closed or resolved event');
    }

    const [updated] = await db('monitoring_events')
      .where('id', id)
      .update({
        status: 'acknowledged',
        acknowledged_by: userId,
        acknowledged_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    const changes = diffRecords(existing, { status: 'acknowledged', acknowledged_by: userId });
    await recordAudit('monitoring_events', id, changes, userId);

    return updated;
  }

  async resolve(id: string, userId: string) {
    const existing = await db('monitoring_events').where('id', id).first();
    if (!existing) throw new AppError(404, 'Event not found');
    if (existing.status === 'closed') {
      throw new AppError(400, 'Cannot resolve a closed event');
    }

    const [updated] = await db('monitoring_events')
      .where('id', id)
      .update({
        status: 'resolved',
        updated_at: new Date(),
      })
      .returning('*');

    const changes = diffRecords(existing, { status: 'resolved' });
    await recordAudit('monitoring_events', id, changes, userId);

    return updated;
  }

  async getCorrelations(id: string) {
    const asParent = await db('event_correlations')
      .join('monitoring_events', 'monitoring_events.id', 'event_correlations.child_event_id')
      .where('event_correlations.parent_event_id', id)
      .select(
        'monitoring_events.id',
        'monitoring_events.number',
        'monitoring_events.severity',
        'monitoring_events.status',
        'monitoring_events.node',
        'monitoring_events.description',
        'monitoring_events.created_at',
        'event_correlations.correlation_type',
      );

    const asChild = await db('event_correlations')
      .join('monitoring_events', 'monitoring_events.id', 'event_correlations.parent_event_id')
      .where('event_correlations.child_event_id', id)
      .select(
        'monitoring_events.id',
        'monitoring_events.number',
        'monitoring_events.severity',
        'monitoring_events.status',
        'monitoring_events.node',
        'monitoring_events.description',
        'monitoring_events.created_at',
        'event_correlations.correlation_type',
      );

    return [...asParent, ...asChild];
  }

  async addCorrelation(parentId: string, childId: string, type: string) {
    const parentEvent = await db('monitoring_events').where('id', parentId).first();
    if (!parentEvent) throw new AppError(404, 'Parent event not found');

    const childEvent = await db('monitoring_events').where('id', childId).first();
    if (!childEvent) throw new AppError(404, 'Child event not found');

    const existing = await db('event_correlations')
      .where({ parent_event_id: parentId, child_event_id: childId })
      .first();
    if (existing) throw new AppError(409, 'Correlation already exists');

    const [correlation] = await db('event_correlations')
      .insert({
        parent_event_id: parentId,
        child_event_id: childId,
        correlation_type: type || 'related',
      })
      .returning('*');

    return correlation;
  }
}

export class AlertRuleService {
  async list() {
    const rules = await db('alert_rules')
      .select(
        'alert_rules.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = alert_rules.assignment_group_id) as assignment_group_name"),
      )
      .orderBy('created_at', 'desc');

    return rules;
  }

  async getById(id: string) {
    const rule = await db('alert_rules')
      .select(
        'alert_rules.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = alert_rules.assignment_group_id) as assignment_group_name"),
      )
      .where('alert_rules.id', id)
      .first();

    return rule;
  }

  async create(data: Record<string, unknown>) {
    const [rule] = await db('alert_rules')
      .insert({
        name: data.name,
        enabled: data.enabled !== undefined ? data.enabled : true,
        source: data.source,
        conditions: JSON.stringify(data.conditions || {}),
        actions: JSON.stringify(data.actions || {}),
        severity_override: data.severity_override || null,
        assignment_group_id: data.assignment_group_id || null,
        cooldown_minutes: data.cooldown_minutes || 5,
      })
      .returning('*');

    return rule;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('alert_rules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Alert rule not found');

    const updateData: Record<string, unknown> = { ...data, updated_at: new Date() };
    if (data.conditions) updateData.conditions = JSON.stringify(data.conditions);
    if (data.actions) updateData.actions = JSON.stringify(data.actions);

    const [updated] = await db('alert_rules').where('id', id).update(updateData).returning('*');
    return updated;
  }

  async delete(id: string) {
    const existing = await db('alert_rules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Alert rule not found');

    await db('alert_rules').where('id', id).del();
  }
}

export const eventService = new EventService();
export const alertRuleService = new AlertRuleService();
