import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { notify, notifyAssignment, notifyApprovalRequest } from '../../core/notification-engine';
import { createApproval, checkAllApproved } from '../../core/approval-engine';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';

// ── Risk Score Matrix ──
const RISK_MATRIX: Record<string, Record<string, number>> = {
  high:     { high: 95, moderate: 80, low: 60 },
  moderate: { high: 70, moderate: 50, low: 30 },
  low:      { high: 40, moderate: 20, low: 10 },
};

function calculateRiskScore(risk: string, impact: string, type: string, affectedCiCount: number): number {
  let base = RISK_MATRIX[risk]?.[impact] ?? 50;
  if (type === 'emergency') base = Math.min(100, base + 15);
  if (type === 'standard') base = Math.max(0, base - 20);
  if (affectedCiCount > 5) base = Math.min(100, base + 10);
  else if (affectedCiCount > 2) base = Math.min(100, base + 5);
  return Math.round(base);
}

export class ChangeService {
  // ══════════════════════════════════════
  // Core CRUD
  // ══════════════════════════════════════

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
    const change = await db('changes')
      .select(
        'changes.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.assigned_to) as assigned_to_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = changes.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.created_by) as created_by_name"),
      )
      .where('changes.id', id)
      .orWhere('changes.number', id)
      .first();

    if (!change) return null;

    const affectedCis = await db('change_affected_cis')
      .join('cis', 'cis.id', 'change_affected_cis.ci_id')
      .where('change_affected_cis.change_id', change.id)
      .select('cis.id', 'cis.name', 'cis.number', 'cis.status', 'change_affected_cis.relationship_type', 'change_affected_cis.notes');

    const linkedIncidents = await db('change_incidents')
      .join('incidents', 'incidents.id', 'change_incidents.incident_id')
      .where('change_incidents.change_id', change.id)
      .select('incidents.id', 'incidents.number', 'incidents.short_description', 'incidents.state', 'change_incidents.relationship');

    const linkedProblems = await db('change_problems')
      .join('problems', 'problems.id', 'change_problems.problem_id')
      .where('change_problems.change_id', change.id)
      .select('problems.id', 'problems.number', 'problems.short_description', 'problems.state', 'change_problems.relationship');

    const conflicts = await db('change_conflicts')
      .where('change_id', change.id)
      .select('*');

    return { ...change, affected_cis: affectedCis, linked_incidents: linkedIncidents, linked_problems: linkedProblems, conflicts };
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [seqResult] = await db.raw("SELECT nextval('change_number_seq') as seq");
    const number = `CHG${seqResult.seq}`;

    const type = (data.type as string) || 'normal';
    const risk = (data.risk as string) || 'moderate';
    const impact = (data.impact as string) || 'moderate';
    const affectedCiIds = (data.affected_ci_ids as string[]) || [];

    const riskScore = calculateRiskScore(risk, impact, type, affectedCiIds.length);

    // Check if CAB is required based on approval rules
    let cabRequired = data.cab_required as boolean ?? false;
    if (!cabRequired) {
      const cabRule = await db('change_approval_rules')
        .where({ change_type: type, cab_required: true, active: true })
        .where(function () {
          this.whereNull('risk_level').orWhere('risk_level', risk);
        })
        .where(function () {
          this.whereNull('impact_level').orWhere('impact_level', impact);
        })
        .first();
      if (cabRule) cabRequired = true;
    }

    // If created from template, apply template defaults
    let templateData: Record<string, unknown> = {};
    if (data.template_id) {
      const template = await db('change_templates').where('id', data.template_id).first();
      if (template) {
        templateData = {
          change_plan: template.change_plan,
          implementation_plan: template.implementation_plan,
          test_plan: template.test_plan,
          communication_plan: template.communication_plan,
          rollback_plan: template.rollback_plan,
          backout_plan: template.backout_plan,
          justification: template.justification,
          assignment_group_id: template.default_assignment_group_id,
          cab_required: template.cab_required,
        };
      }
    }

    // For standard (pre-approved) changes, skip to scheduled
    let initialState = 'new';
    if (type === 'standard' && data.template_id) {
      const template = await db('change_templates').where({ id: data.template_id, pre_approved: true }).first();
      if (template) initialState = 'scheduled';
    }

    const insertData: Record<string, unknown> = {
      number,
      short_description: data.short_description,
      description: data.description || null,
      state: initialState,
      type,
      risk,
      impact,
      risk_score: riskScore,
      priority: data.priority || 4,
      assigned_to: data.assigned_to || null,
      assignment_group_id: data.assignment_group_id || templateData.assignment_group_id || null,
      planned_start: data.planned_start || null,
      planned_end: data.planned_end || null,
      backout_plan: data.backout_plan || templateData.backout_plan || null,
      justification: data.justification || templateData.justification || null,
      change_plan: data.change_plan || templateData.change_plan || null,
      implementation_plan: data.implementation_plan || templateData.implementation_plan || null,
      test_plan: data.test_plan || templateData.test_plan || null,
      communication_plan: data.communication_plan || templateData.communication_plan || null,
      rollback_plan: data.rollback_plan || templateData.rollback_plan || null,
      cab_required: cabRequired || (templateData.cab_required as boolean) || false,
      template_id: data.template_id || null,
      related_incident_id: data.related_incident_id || null,
      related_problem_id: data.related_problem_id || null,
      created_by: userId,
    };

    const [change] = await db('changes').insert(insertData).returning('*');

    // Link affected CIs
    if (affectedCiIds.length > 0) {
      await db('change_affected_cis').insert(
        affectedCiIds.map((ciId) => ({ change_id: change.id, ci_id: ciId, relationship_type: 'affected' }))
      );
    }

    // Auto-detect schedule conflicts
    if (data.planned_start && data.planned_end) {
      await this.detectConflicts(change.id, data.planned_start as string, data.planned_end as string, affectedCiIds);
    }

    // Auto-create approval requests based on rules
    await this.applyApprovalRules(change);

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

      // Track actual start/end based on state transitions
      if (data.state === 'implement' && !existing.actual_start) {
        data.actual_start = new Date().toISOString();
      }
      if ((data.state === 'review' || data.state === 'closed') && !existing.actual_end) {
        data.actual_end = new Date().toISOString();
      }
    }

    // Recalculate risk score if risk, impact, or type changed
    const risk = (data.risk as string) || existing.risk;
    const impact = (data.impact as string) || existing.impact;
    const type = (data.type as string) || existing.type;
    if (data.risk || data.impact || data.type) {
      const ciCount = await db('change_affected_cis').where('change_id', id).count('* as c').first();
      data.risk_score = calculateRiskScore(risk, impact, type, Number((ciCount as any)?.c || 0));
    }

    // Handle affected CIs update
    const affectedCiIds = data.affected_ci_ids as string[] | undefined;
    delete data.affected_ci_ids;
    if (affectedCiIds !== undefined) {
      await db('change_affected_cis').where('change_id', id).del();
      if (affectedCiIds.length > 0) {
        await db('change_affected_cis').insert(
          affectedCiIds.map((ciId) => ({ change_id: id, ci_id: ciId, relationship_type: 'affected' }))
        );
      }
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('changes').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('changes', id, changes, userId);

    // Re-detect conflicts if schedule changed
    if (data.planned_start || data.planned_end) {
      const start = (data.planned_start as string) || existing.planned_start;
      const end = (data.planned_end as string) || existing.planned_end;
      if (start && end) {
        const currentCis = affectedCiIds ?? (await db('change_affected_cis').where('change_id', id).pluck('ci_id'));
        await this.detectConflicts(id, start, end, currentCis);
      }
    }

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

  // ══════════════════════════════════════
  // Risk & Impact Analysis
  // ══════════════════════════════════════

  async assessRisk(changeId: string) {
    const change = await db('changes').where('id', changeId).first();
    if (!change) throw new AppError(404, 'Change not found');

    const affectedCis = await db('change_affected_cis')
      .join('cis', 'cis.id', 'change_affected_cis.ci_id')
      .where('change_affected_cis.change_id', changeId)
      .select('cis.*');

    // Get CI dependencies
    const ciIds = affectedCis.map((ci: any) => ci.id);
    const dependencies = ciIds.length > 0
      ? await db('ci_relationships')
          .whereIn('parent_ci_id', ciIds)
          .orWhereIn('child_ci_id', ciIds)
          .select('*')
      : [];

    // Find dependent CIs not directly listed
    const dependentCiIds = new Set<string>();
    for (const dep of dependencies) {
      if (!ciIds.includes(dep.parent_ci_id)) dependentCiIds.add(dep.parent_ci_id);
      if (!ciIds.includes(dep.child_ci_id)) dependentCiIds.add(dep.child_ci_id);
    }

    const indirectCis = dependentCiIds.size > 0
      ? await db('cis').whereIn('id', Array.from(dependentCiIds)).select('id', 'name', 'number', 'status')
      : [];

    const riskScore = calculateRiskScore(change.risk, change.impact, change.type, affectedCis.length);

    const conflicts = change.planned_start && change.planned_end
      ? await this.getScheduleConflicts(changeId, change.planned_start, change.planned_end)
      : [];

    const blackouts = change.planned_start && change.planned_end
      ? await this.checkBlackoutWindows(change.planned_start, change.planned_end)
      : [];

    return {
      risk_score: riskScore,
      risk_level: riskScore >= 70 ? 'high' : riskScore >= 40 ? 'moderate' : 'low',
      affected_cis: affectedCis,
      indirect_cis: indirectCis,
      dependencies,
      schedule_conflicts: conflicts,
      blackout_violations: blackouts,
      recommendations: this.generateRiskRecommendations(riskScore, change, affectedCis.length, conflicts.length, blackouts.length),
    };
  }

  private generateRiskRecommendations(
    riskScore: number,
    change: any,
    ciCount: number,
    conflictCount: number,
    blackoutCount: number
  ): string[] {
    const recs: string[] = [];
    if (riskScore >= 70) recs.push('High risk score - CAB review strongly recommended');
    if (riskScore >= 80) recs.push('Consider breaking this change into smaller, lower-risk changes');
    if (!change.backout_plan && !change.rollback_plan) recs.push('No backout/rollback plan defined - add one before proceeding');
    if (!change.test_plan) recs.push('No test plan defined - add testing steps before implementation');
    if (!change.communication_plan) recs.push('No communication plan - stakeholders should be informed');
    if (ciCount > 5) recs.push(`${ciCount} CIs affected - consider scheduling during maintenance window`);
    if (conflictCount > 0) recs.push(`${conflictCount} schedule conflict(s) detected - review and resolve`);
    if (blackoutCount > 0) recs.push(`Change overlaps with ${blackoutCount} blackout window(s) - reschedule required`);
    if (change.type === 'emergency' && !change.justification) recs.push('Emergency changes require justification');
    return recs;
  }

  async aiRiskAnalysis(changeId: string, userId: string) {
    const change = await this.getById(changeId);
    if (!change) throw new AppError(404, 'Change not found');

    const provider = await db('ai_providers').where('active', true).first();
    if (!provider) throw new AppError(400, 'No active AI provider configured');

    const { decryptApiKey } = await import('../../core/ai-engine');
    const apiKey = provider.api_key_encrypted ? decryptApiKey(provider.api_key_encrypted) : '';

    const prompt = `Analyze this IT change request and provide a risk assessment:

Change: ${change.number} - ${change.short_description}
Type: ${change.type} | Risk: ${change.risk} | Impact: ${change.impact}
Description: ${change.description || 'N/A'}
Affected CIs: ${(change.affected_cis || []).map((ci: any) => ci.name).join(', ') || 'None specified'}
Change Plan: ${change.change_plan || 'N/A'}
Test Plan: ${change.test_plan || 'N/A'}
Rollback Plan: ${change.rollback_plan || change.backout_plan || 'N/A'}
Planned: ${change.planned_start || 'N/A'} to ${change.planned_end || 'N/A'}

Provide:
1. Predicted risk score (0-100) with rationale
2. Potential issues or risks
3. Recommended assignment group (if applicable)
4. Suggested improvements to the change plan
5. Overall recommendation (approve/review/reject)

Format as JSON with keys: predicted_risk_score, rationale, potential_issues (array), recommended_group, suggestions (array), recommendation`;

    let text = '';
    if (provider.provider_type === 'openai') {
      const res = await fetch(`${provider.base_url || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: provider.model,
          messages: [
            { role: 'system', content: 'You are an IT change management risk analyst. Respond in valid JSON only.' },
            { role: 'user', content: prompt },
          ],
          max_tokens: 1500,
        }),
      });
      if (!res.ok) throw new AppError(500, `AI provider error: ${res.status}`);
      const json = await res.json() as any;
      text = json.choices?.[0]?.message?.content || '';
    } else if (provider.provider_type === 'anthropic') {
      const res = await fetch(`${provider.base_url || 'https://api.anthropic.com'}/v1/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: provider.model, max_tokens: 1500,
          system: 'You are an IT change management risk analyst. Respond in valid JSON only.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      if (!res.ok) throw new AppError(500, `AI provider error: ${res.status}`);
      const json = await res.json() as any;
      text = json.content?.[0]?.text || '';
    } else if (provider.provider_type === 'ollama') {
      const res = await fetch(`${provider.base_url || 'http://localhost:11434'}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.model, stream: false,
          messages: [
            { role: 'system', content: 'You are an IT change management risk analyst. Respond in valid JSON only.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (!res.ok) throw new AppError(500, `AI provider error: ${res.status}`);
      const json = await res.json() as any;
      text = json.message?.content || '';
    }

    let analysis: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw_response: text };
    } catch {
      analysis = { raw_response: text };
    }

    await db('changes').where('id', changeId).update({ ai_risk_analysis: JSON.stringify(analysis), updated_at: new Date() });
    return analysis;
  }

  // ══════════════════════════════════════
  // Conflict Detection & Scheduling
  // ══════════════════════════════════════

  async detectConflicts(changeId: string, startTime: string, endTime: string, affectedCiIds: string[]) {
    await db('change_conflicts').where('change_id', changeId).where('resolution', 'unresolved').del();

    const conflicts: Array<{ conflicting_change_id: string; conflict_type: string; description: string }> = [];

    // 1. Schedule overlap
    const overlapping = await db('changes')
      .whereNot('id', changeId)
      .whereNotIn('state', ['closed', 'cancelled'])
      .whereNotNull('planned_start')
      .whereNotNull('planned_end')
      .where('planned_start', '<', endTime)
      .where('planned_end', '>', startTime)
      .select('id', 'number', 'short_description', 'planned_start', 'planned_end');

    for (const overlap of overlapping) {
      conflicts.push({
        conflicting_change_id: overlap.id,
        conflict_type: 'schedule_overlap',
        description: `Schedule overlap with ${overlap.number}: ${overlap.short_description}`,
      });
    }

    // 2. CI overlap
    if (affectedCiIds.length > 0 && overlapping.length > 0) {
      const overlappingIds = overlapping.map((o: any) => o.id);
      const ciOverlaps = await db('change_affected_cis')
        .whereIn('change_id', overlappingIds)
        .whereIn('ci_id', affectedCiIds)
        .join('cis', 'cis.id', 'change_affected_cis.ci_id')
        .join('changes', 'changes.id', 'change_affected_cis.change_id')
        .select('changes.id as change_id', 'changes.number', 'cis.name as ci_name');

      for (const ciOverlap of ciOverlaps) {
        const existing = conflicts.find(
          (c) => c.conflicting_change_id === ciOverlap.change_id && c.conflict_type === 'ci_overlap'
        );
        if (!existing) {
          conflicts.push({
            conflicting_change_id: ciOverlap.change_id,
            conflict_type: 'ci_overlap',
            description: `CI conflict: ${ciOverlap.ci_name} also affected by ${ciOverlap.number}`,
          });
        }
      }
    }

    // 3. Blackout window violations
    const blackouts = await this.checkBlackoutWindows(startTime, endTime);
    for (const blackout of blackouts) {
      conflicts.push({
        conflicting_change_id: changeId,
        conflict_type: 'blackout',
        description: `Overlaps with blackout window: ${blackout.name} (${blackout.severity})`,
      });
    }

    if (conflicts.length > 0) {
      await db('change_conflicts').insert(
        conflicts.map((c) => ({ change_id: changeId, ...c, resolution: 'unresolved' }))
      );
    }

    return conflicts;
  }

  private async getScheduleConflicts(changeId: string, startTime: string, endTime: string) {
    return db('changes')
      .whereNot('id', changeId)
      .whereNotIn('state', ['closed', 'cancelled'])
      .whereNotNull('planned_start')
      .whereNotNull('planned_end')
      .where('planned_start', '<', endTime)
      .where('planned_end', '>', startTime)
      .select('id', 'number', 'short_description', 'planned_start', 'planned_end', 'type', 'risk');
  }

  async checkBlackoutWindows(startTime: string, endTime: string) {
    return db('blackout_windows')
      .where('active', true)
      .where('start_time', '<', endTime)
      .where('end_time', '>', startTime)
      .select('id', 'name', 'reason', 'start_time', 'end_time', 'severity');
  }

  async resolveConflict(conflictId: string, resolution: string, userId: string) {
    const conflict = await db('change_conflicts').where('id', conflictId).first();
    if (!conflict) throw new AppError(404, 'Conflict not found');

    const [updated] = await db('change_conflicts').where('id', conflictId).update({
      resolution,
      resolved_by: userId,
      resolved_at: new Date(),
      updated_at: new Date(),
    }).returning('*');

    return updated;
  }

  async getChangeCalendar(startDate: string, endDate: string) {
    const changes = await db('changes')
      .whereNotIn('state', ['cancelled'])
      .where(function () {
        this.where(function () {
          this.whereNotNull('planned_start').where('planned_start', '>=', startDate).where('planned_start', '<=', endDate);
        }).orWhere(function () {
          this.whereNotNull('planned_end').where('planned_end', '>=', startDate).where('planned_end', '<=', endDate);
        });
      })
      .select('id', 'number', 'short_description', 'type', 'risk', 'impact', 'state', 'planned_start', 'planned_end', 'risk_score');

    const maintenanceWindows = await db('maintenance_windows')
      .where('active', true)
      .where('start_time', '>=', startDate)
      .where('start_time', '<=', endDate)
      .select('*');

    const blackoutWindows = await db('blackout_windows')
      .where('active', true)
      .where('start_time', '<=', endDate)
      .where('end_time', '>=', startDate)
      .select('*');

    return { changes, maintenance_windows: maintenanceWindows, blackout_windows: blackoutWindows };
  }

  // ══════════════════════════════════════
  // Approval Rules & Auto-routing
  // ══════════════════════════════════════

  private async applyApprovalRules(change: any) {
    const rules = await db('change_approval_rules')
      .where({ change_type: change.type, active: true })
      .where(function () {
        this.whereNull('risk_level').orWhere('risk_level', change.risk);
      })
      .where(function () {
        this.whereNull('impact_level').orWhere('impact_level', change.impact);
      })
      .orderBy('approval_order', 'asc');

    // Standard pre-approved changes skip approval
    if (change.type === 'standard' && change.template_id) {
      const template = await db('change_templates').where({ id: change.template_id, pre_approved: true }).first();
      if (template) return;
    }

    const allApproverIds: string[] = [];

    for (const rule of rules) {
      const approverIds = typeof rule.approver_ids === 'string'
        ? JSON.parse(rule.approver_ids)
        : (rule.approver_ids || []);

      for (const approverId of approverIds) {
        if (!allApproverIds.includes(approverId)) allApproverIds.push(approverId);
      }

      if (rule.approver_group_id) {
        const group = await db('assignment_groups').where('id', rule.approver_group_id).first();
        if (group?.manager_id && !allApproverIds.includes(group.manager_id)) {
          allApproverIds.push(group.manager_id);
        }
      }
    }

    // Fallback: use assignment group manager for normal/emergency changes
    if (allApproverIds.length === 0 && change.type !== 'standard') {
      if (change.assignment_group_id) {
        const group = await db('assignment_groups').where('id', change.assignment_group_id).first();
        if (group?.manager_id) allApproverIds.push(group.manager_id);
      }
    }

    if (allApproverIds.length > 0) {
      await createApproval('changes', change.id, allApproverIds);
      for (const approverId of allApproverIds) {
        await notifyApprovalRequest(approverId, 'changes', change.number, change.short_description);
      }
    }
  }

  async listApprovalRules() {
    return db('change_approval_rules')
      .select(
        'change_approval_rules.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = change_approval_rules.approver_group_id) as approver_group_name"),
      )
      .where('active', true)
      .orderBy('change_type')
      .orderBy('approval_order');
  }

  async createApprovalRule(data: Record<string, unknown>, userId: string) {
    const [rule] = await db('change_approval_rules').insert({
      ...data,
      approver_ids: JSON.stringify(data.approver_ids || []),
      created_by: userId,
    }).returning('*');
    return rule;
  }

  async updateApprovalRule(id: string, data: Record<string, unknown>) {
    if (data.approver_ids) {
      data.approver_ids = JSON.stringify(data.approver_ids);
    }
    const [updated] = await db('change_approval_rules').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteApprovalRule(id: string) {
    await db('change_approval_rules').where('id', id).del();
  }

  // ══════════════════════════════════════
  // Templates & Standard Change Catalog
  // ══════════════════════════════════════

  async listTemplates(options?: QueryOptions) {
    const query = db('change_templates')
      .select(
        'change_templates.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = change_templates.default_assignment_group_id) as assignment_group_name"),
      )
      .where('active', true);

    if (options?.search) {
      query.where(function () {
        this.whereILike('name', `%${options.search}%`)
          .orWhereILike('description', `%${options.search}%`);
      });
    }
    if (options?.filters?.type) query.where('type', options.filters.type);
    if (options?.filters?.category) query.where('category', options.filters.category);

    return query.orderBy('name');
  }

  async getTemplate(id: string) {
    return db('change_templates').where('id', id).first();
  }

  async createTemplate(data: Record<string, unknown>, userId: string) {
    const insertData = {
      ...data,
      default_approvers: JSON.stringify(data.default_approvers || []),
      created_by: userId,
    };
    const [template] = await db('change_templates').insert(insertData).returning('*');
    return template;
  }

  async updateTemplate(id: string, data: Record<string, unknown>) {
    if (data.default_approvers) {
      data.default_approvers = JSON.stringify(data.default_approvers);
    }
    const [updated] = await db('change_templates').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteTemplate(id: string) {
    await db('change_templates').where('id', id).update({ active: false, updated_at: new Date() });
  }

  async listStandardCatalog() {
    return db('change_templates')
      .where({ type: 'standard', pre_approved: true, active: true })
      .select('*')
      .orderBy('category')
      .orderBy('name');
  }

  async createFromTemplate(templateId: string, overrides: Record<string, unknown>, userId: string) {
    const template = await db('change_templates').where('id', templateId).first();
    if (!template) throw new AppError(404, 'Template not found');

    const data: Record<string, unknown> = {
      short_description: overrides.short_description || template.name,
      description: overrides.description || template.description,
      type: template.type,
      risk: template.risk,
      impact: template.impact,
      priority: template.priority,
      change_plan: template.change_plan,
      implementation_plan: template.implementation_plan,
      test_plan: template.test_plan,
      communication_plan: template.communication_plan,
      rollback_plan: template.rollback_plan,
      backout_plan: template.backout_plan,
      justification: template.justification,
      assignment_group_id: template.default_assignment_group_id,
      cab_required: template.cab_required,
      template_id: templateId,
      ...overrides,
    };

    return this.create(data, userId);
  }

  // ══════════════════════════════════════
  // CAB Management
  // ══════════════════════════════════════

  async listCabMeetings(options?: QueryOptions) {
    const query = db('cab_meetings')
      .select(
        'cab_meetings.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cab_meetings.chair_id) as chair_name"),
        db.raw("(SELECT COUNT(*) FROM cab_agenda_items WHERE cab_agenda_items.cab_meeting_id = cab_meetings.id) as agenda_count"),
      );

    if (options?.filters?.state) query.where('state', options.filters.state);
    return query.orderBy('scheduled_date', 'desc');
  }

  async getCabMeeting(id: string) {
    const meeting = await db('cab_meetings')
      .select(
        'cab_meetings.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cab_meetings.chair_id) as chair_name"),
      )
      .where('cab_meetings.id', id)
      .first();

    if (!meeting) throw new AppError(404, 'CAB meeting not found');

    const agendaItems = await db('cab_agenda_items')
      .join('changes', 'changes.id', 'cab_agenda_items.change_id')
      .where('cab_agenda_items.cab_meeting_id', id)
      .select(
        'cab_agenda_items.*',
        'changes.number', 'changes.short_description', 'changes.type', 'changes.risk',
        'changes.impact', 'changes.risk_score', 'changes.state as change_state',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.assigned_to) as assigned_to_name"),
      )
      .orderBy('cab_agenda_items.order');

    const attendeeIds = typeof meeting.attendees === 'string' ? JSON.parse(meeting.attendees) : (meeting.attendees || []);
    const attendees = attendeeIds.length > 0
      ? await db('users').whereIn('id', attendeeIds).select('id', 'first_name', 'last_name', 'email')
      : [];

    return { ...meeting, agenda_items: agendaItems, attendee_details: attendees };
  }

  async createCabMeeting(data: Record<string, unknown>, userId: string) {
    const [meeting] = await db('cab_meetings').insert({
      ...data,
      attendees: JSON.stringify(data.attendees || []),
      created_by: userId,
    }).returning('*');

    const attendeeIds = (data.attendees as string[]) || [];
    for (const attendeeId of attendeeIds) {
      await notify(attendeeId, `CAB Meeting Scheduled: ${data.title}`, `A CAB meeting has been scheduled for ${data.scheduled_date}`, '/changes/cab');
    }

    return meeting;
  }

  async updateCabMeeting(id: string, data: Record<string, unknown>) {
    if (data.attendees) data.attendees = JSON.stringify(data.attendees);
    const [updated] = await db('cab_meetings').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async addToAgenda(meetingId: string, changeId: string) {
    const existing = await db('cab_agenda_items').where({ cab_meeting_id: meetingId, change_id: changeId }).first();
    if (existing) throw new AppError(409, 'Change already on agenda');

    const maxOrder = await db('cab_agenda_items').where('cab_meeting_id', meetingId).max('order as max').first();
    const [item] = await db('cab_agenda_items').insert({
      cab_meeting_id: meetingId,
      change_id: changeId,
      order: ((maxOrder as any)?.max || 0) + 1,
    }).returning('*');

    await db('changes').where('id', changeId).update({ cab_meeting_id: meetingId, updated_at: new Date() });
    return item;
  }

  async removeFromAgenda(meetingId: string, changeId: string) {
    await db('cab_agenda_items').where({ cab_meeting_id: meetingId, change_id: changeId }).del();
    await db('changes').where('id', changeId).where('cab_meeting_id', meetingId).update({ cab_meeting_id: null, updated_at: new Date() });
  }

  async recordCabDecision(agendaItemId: string, decision: string, notes: string | null, votes: Record<string, string>, userId: string) {
    const [updated] = await db('cab_agenda_items').where('id', agendaItemId).update({
      decision,
      discussion_notes: notes,
      votes: JSON.stringify(votes || {}),
      updated_at: new Date(),
    }).returning('*');

    const item = await db('cab_agenda_items').where('id', agendaItemId).first();
    if (item && decision === 'approved') {
      const change = await db('changes').where('id', item.change_id).first();
      if (change && change.state === 'authorize') {
        await this.update(item.change_id, { state: 'scheduled' }, userId);
      }
    }

    if (item) {
      const change = await db('changes').where('id', item.change_id).first();
      if (change) {
        await notify(change.created_by, `CAB Decision: ${change.number}`, `Your change ${change.number} has been ${decision} by the CAB`, `/changes/${change.id}`);
      }
    }

    return updated;
  }

  // ══════════════════════════════════════
  // Maintenance & Blackout Windows
  // ══════════════════════════════════════

  async listMaintenanceWindows() {
    return db('maintenance_windows').where('active', true).orderBy('start_time', 'desc');
  }

  async createMaintenanceWindow(data: Record<string, unknown>, userId: string) {
    const [window] = await db('maintenance_windows').insert({ ...data, created_by: userId }).returning('*');
    return window;
  }

  async updateMaintenanceWindow(id: string, data: Record<string, unknown>) {
    const [updated] = await db('maintenance_windows').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteMaintenanceWindow(id: string) {
    await db('maintenance_windows').where('id', id).update({ active: false, updated_at: new Date() });
  }

  async listBlackoutWindows() {
    return db('blackout_windows').where('active', true).orderBy('start_time', 'desc');
  }

  async createBlackoutWindow(data: Record<string, unknown>, userId: string) {
    const [window] = await db('blackout_windows').insert({ ...data, created_by: userId }).returning('*');
    return window;
  }

  async updateBlackoutWindow(id: string, data: Record<string, unknown>) {
    const [updated] = await db('blackout_windows').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteBlackoutWindow(id: string) {
    await db('blackout_windows').where('id', id).update({ active: false, updated_at: new Date() });
  }

  // ══════════════════════════════════════
  // Linking (Incidents / Problems)
  // ══════════════════════════════════════

  async linkIncident(changeId: string, incidentId: string, relationship: string) {
    const [link] = await db('change_incidents').insert({ change_id: changeId, incident_id: incidentId, relationship }).returning('*');
    return link;
  }

  async unlinkIncident(changeId: string, incidentId: string) {
    await db('change_incidents').where({ change_id: changeId, incident_id: incidentId }).del();
  }

  async linkProblem(changeId: string, problemId: string, relationship: string) {
    const [link] = await db('change_problems').insert({ change_id: changeId, problem_id: problemId, relationship }).returning('*');
    return link;
  }

  async unlinkProblem(changeId: string, problemId: string) {
    await db('change_problems').where({ change_id: changeId, problem_id: problemId }).del();
  }

  // ══════════════════════════════════════
  // Metrics & Reporting
  // ══════════════════════════════════════

  async getMetrics(startDate?: string, endDate?: string) {
    const [
      totalChanges,
      byState,
      byType,
      byRisk,
      successRate,
      avgRiskScore,
      emergencyCount,
      recentChanges,
    ] = await Promise.all([
      db('changes').count('* as count').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }).first(),
      db('changes').select('state').count('* as count').groupBy('state').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }),
      db('changes').select('type').count('* as count').groupBy('type').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }),
      db('changes').select('risk').count('* as count').groupBy('risk').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }),
      db('changes').where('state', 'closed')
        .select(
          db.raw("COUNT(CASE WHEN close_code = 'successful' OR close_code = 'successful_with_issues' THEN 1 END) as successful"),
          db.raw("COUNT(CASE WHEN close_code = 'unsuccessful' THEN 1 END) as unsuccessful"),
          db.raw("COUNT(*) as total_closed"),
        )
        .modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); })
        .first(),
      db('changes').avg('risk_score as avg_risk').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }).first(),
      db('changes').where('type', 'emergency').count('* as count').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }).first(),
      db('changes').whereNotIn('state', ['closed', 'cancelled']).orderBy('created_at', 'desc').limit(10)
        .select('id', 'number', 'short_description', 'type', 'risk', 'state', 'risk_score', 'planned_start'),
    ]);

    const avgImplTime = await db('changes')
      .whereNotNull('actual_start')
      .whereNotNull('actual_end')
      .where('state', 'closed')
      .select(db.raw("AVG(EXTRACT(EPOCH FROM (actual_end::timestamp - actual_start::timestamp)) / 3600) as avg_hours"))
      .modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); })
      .first();

    const monthlyTrend = await db('changes')
      .select(db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"))
      .count('* as count')
      .groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
      .orderByRaw("TO_CHAR(created_at, 'YYYY-MM') DESC")
      .limit(12);

    return {
      total: Number((totalChanges as any)?.count || 0),
      by_state: byState,
      by_type: byType,
      by_risk: byRisk,
      success_rate: {
        successful: Number((successRate as any)?.successful || 0),
        unsuccessful: Number((successRate as any)?.unsuccessful || 0),
        total_closed: Number((successRate as any)?.total_closed || 0),
        rate: (successRate as any)?.total_closed > 0
          ? Math.round((Number((successRate as any)?.successful || 0) / Number((successRate as any)?.total_closed)) * 100)
          : 0,
      },
      avg_risk_score: Math.round(Number((avgRiskScore as any)?.avg_risk || 0)),
      emergency_count: Number((emergencyCount as any)?.count || 0),
      avg_implementation_hours: Math.round(Number((avgImplTime as any)?.avg_hours || 0) * 10) / 10,
      monthly_trend: monthlyTrend,
      recent_active: recentChanges,
    };
  }
}

export const changeService = new ChangeService();
