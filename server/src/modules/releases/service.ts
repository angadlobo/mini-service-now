import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { notify, notifyAssignment } from '../../core/notification-engine';
import { createApproval } from '../../core/approval-engine';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';
import { logger } from '../../config/logger';

// ── Risk Score Matrix ──
const RISK_MATRIX: Record<string, Record<string, number>> = {
  high:     { high: 95, moderate: 80, low: 60 },
  moderate: { high: 70, moderate: 50, low: 30 },
  low:      { high: 40, moderate: 20, low: 10 },
};

function calculateRiskScore(risk: string, impact: string, releaseType: string, changeCount: number): number {
  let base = RISK_MATRIX[risk]?.[impact] ?? 50;
  if (releaseType === 'hotfix') base = Math.min(100, base + 15);
  if (releaseType === 'major') base = Math.min(100, base + 10);
  if (releaseType === 'patch') base = Math.max(0, base - 15);
  if (changeCount > 10) base = Math.min(100, base + 10);
  else if (changeCount > 5) base = Math.min(100, base + 5);
  return Math.round(base);
}

export class ReleaseService {
  // ══════════════════════════════════════
  // Core CRUD
  // ══════════════════════════════════════

  async list(options: QueryOptions) {
    const query = db('releases')
      .select(
        'releases.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = releases.assigned_to) as assigned_to_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = releases.release_manager_id) as release_manager_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = releases.assignment_group_id) as assignment_group_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'releases', {
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
    const release = await db('releases')
      .select(
        'releases.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = releases.assigned_to) as assigned_to_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = releases.release_manager_id) as release_manager_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = releases.assignment_group_id) as assignment_group_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = releases.created_by) as created_by_name"),
      )
      .where('releases.id', id)
      .orWhere('releases.number', id)
      .first();

    if (!release) return null;

    const changes = await db('release_changes')
      .join('changes', 'changes.id', 'release_changes.change_id')
      .where('release_changes.release_id', release.id)
      .select(
        'changes.id', 'changes.number', 'changes.short_description', 'changes.state', 'changes.type', 'changes.risk',
        'release_changes.sequence_order', 'release_changes.deployment_status',
      )
      .orderBy('release_changes.sequence_order');

    const cis = await db('release_cis')
      .join('cis', 'cis.id', 'release_cis.ci_id')
      .where('release_cis.release_id', release.id)
      .select('cis.id', 'cis.name', 'cis.number', 'cis.status');

    const stakeholders = await db('release_stakeholders')
      .join('users', 'users.id', 'release_stakeholders.user_id')
      .where('release_stakeholders.release_id', release.id)
      .select('users.id', 'users.first_name', 'users.last_name', 'users.email', 'release_stakeholders.role');

    return { ...release, changes, cis, stakeholders };
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [seqResult] = await db.raw("SELECT nextval('release_number_seq') as seq");
    const number = `REL${String(seqResult.seq).padStart(6, '0')}`;

    const releaseType = (data.release_type as string) || 'minor';
    const risk = (data.risk as string) || 'moderate';
    const impact = (data.impact as string) || 'moderate';

    const riskScore = calculateRiskScore(risk, impact, releaseType, 0);

    const insertData: Record<string, unknown> = {
      number,
      short_description: data.short_description,
      description: data.description || null,
      state: 'planning',
      release_type: releaseType,
      risk,
      impact,
      risk_score: riskScore,
      priority: data.priority || 4,
      release_manager_id: data.release_manager_id || null,
      assigned_to: data.assigned_to || null,
      assignment_group_id: data.assignment_group_id || null,
      scheduled_start: data.scheduled_start || null,
      scheduled_end: data.scheduled_end || null,
      implementation_plan: data.implementation_plan || null,
      test_plan: data.test_plan || null,
      rollback_plan: data.rollback_plan || null,
      communication_plan: data.communication_plan || null,
      deployed_version: data.deployed_version || null,
      previous_version: data.previous_version || null,
      build_number: data.build_number || null,
      created_by: userId,
    };

    const [release] = await db('releases').insert(insertData).returning('*');

    if (release.assigned_to) {
      await notifyAssignment(release.assigned_to, 'releases', number, release.short_description);
    }

    eventBus.emitRecordCreated('releases', release.id, release, userId);
    return release;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('releases').where('id', id).first();
    if (!existing) throw new AppError(404, 'Release not found');

    if (data.state && data.state !== existing.state) {
      validateStateTransition('releases', existing.state, data.state as string);

      if (data.state === 'in_progress' && !existing.actual_start) {
        data.actual_start = new Date().toISOString();
      }
      if ((data.state === 'completed' || data.state === 'rolled_back') && !existing.actual_end) {
        data.actual_end = new Date().toISOString();
      }
    }

    // Recalculate risk score if risk, impact, or type changed
    const risk = (data.risk as string) || existing.risk;
    const impact = (data.impact as string) || existing.impact;
    const releaseType = (data.release_type as string) || existing.release_type;
    if (data.risk || data.impact || data.release_type) {
      const changeCount = await db('release_changes').where('release_id', id).count('* as c').first();
      data.risk_score = calculateRiskScore(risk, impact, releaseType, Number((changeCount as any)?.c || 0));
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('releases').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('releases', id, changes, userId);

    if (data.assigned_to && data.assigned_to !== existing.assigned_to) {
      await notifyAssignment(data.assigned_to as string, 'releases', existing.number, existing.short_description);
    }

    if (data.state && data.state !== existing.state) {
      eventBus.emitStateChanged('releases', id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('releases', id, updated, userId, existing);
    }

    return updated;
  }

  // ══════════════════════════════════════
  // Composition: Changes
  // ══════════════════════════════════════

  async listChanges(releaseId: string) {
    return db('release_changes')
      .join('changes', 'changes.id', 'release_changes.change_id')
      .where('release_changes.release_id', releaseId)
      .select(
        'changes.id', 'changes.number', 'changes.short_description', 'changes.state',
        'changes.type', 'changes.risk', 'changes.risk_score',
        'release_changes.sequence_order', 'release_changes.deployment_status',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = changes.assigned_to) as assigned_to_name"),
      )
      .orderBy('release_changes.sequence_order');
  }

  async addChange(releaseId: string, changeId: string, sequenceOrder?: number) {
    const existing = await db('release_changes').where({ release_id: releaseId, change_id: changeId }).first();
    if (existing) throw new AppError(409, 'Change already linked to this release');

    const maxOrder = await db('release_changes').where('release_id', releaseId).max('sequence_order as max').first();
    const order = sequenceOrder ?? (((maxOrder as any)?.max || 0) + 1);

    const [link] = await db('release_changes').insert({
      release_id: releaseId,
      change_id: changeId,
      sequence_order: order,
    }).returning('*');

    // Recalculate risk score with updated change count
    await this.recalculateRiskScore(releaseId);

    return link;
  }

  async removeChange(releaseId: string, changeId: string) {
    await db('release_changes').where({ release_id: releaseId, change_id: changeId }).del();
    await this.recalculateRiskScore(releaseId);
  }

  // ══════════════════════════════════════
  // Composition: CIs
  // ══════════════════════════════════════

  async addCi(releaseId: string, ciId: string) {
    const existing = await db('release_cis').where({ release_id: releaseId, ci_id: ciId }).first();
    if (existing) throw new AppError(409, 'CI already linked to this release');

    const [link] = await db('release_cis').insert({ release_id: releaseId, ci_id: ciId }).returning('*');
    return link;
  }

  async removeCi(releaseId: string, ciId: string) {
    await db('release_cis').where({ release_id: releaseId, ci_id: ciId }).del();
  }

  // ══════════════════════════════════════
  // Composition: Stakeholders
  // ══════════════════════════════════════

  async addStakeholder(releaseId: string, userId: string, role?: string) {
    const existing = await db('release_stakeholders').where({ release_id: releaseId, user_id: userId }).first();
    if (existing) throw new AppError(409, 'User is already a stakeholder');

    const [link] = await db('release_stakeholders').insert({
      release_id: releaseId,
      user_id: userId,
      role: role || 'stakeholder',
    }).returning('*');
    return link;
  }

  async removeStakeholder(releaseId: string, userId: string) {
    await db('release_stakeholders').where({ release_id: releaseId, user_id: userId }).del();
  }

  // ══════════════════════════════════════
  // Deployment Actions
  // ══════════════════════════════════════

  async startDeployment(id: string, userId: string) {
    const release = await db('releases').where('id', id).first();
    if (!release) throw new AppError(404, 'Release not found');
    if (release.state !== 'approved') throw new AppError(400, 'Release must be in approved state to start deployment');

    return this.update(id, { state: 'in_progress' }, userId);
  }

  async completeDeployment(id: string, userId: string, notes?: string) {
    const release = await db('releases').where('id', id).first();
    if (!release) throw new AppError(404, 'Release not found');
    if (release.state !== 'in_progress') throw new AppError(400, 'Release must be in progress to complete');

    const updateData: Record<string, unknown> = { state: 'completed' };
    if (notes) updateData.description = (release.description || '') + '\n\n--- Deployment Notes ---\n' + notes;

    // Mark all linked changes deployment status as deployed
    await db('release_changes').where('release_id', id).update({ deployment_status: 'deployed', updated_at: new Date() });

    // Notify stakeholders
    const stakeholders = await db('release_stakeholders').where('release_id', id).pluck('user_id');
    for (const stakeholderId of stakeholders) {
      await notify(stakeholderId, `Release Completed: ${release.number}`, `Release ${release.number} - ${release.short_description} has been deployed successfully`, `/releases/${id}`);
    }

    return this.update(id, updateData, userId);
  }

  async rollback(id: string, userId: string, reason?: string) {
    const release = await db('releases').where('id', id).first();
    if (!release) throw new AppError(404, 'Release not found');
    if (release.state !== 'in_progress') throw new AppError(400, 'Release must be in progress to rollback');

    const updateData: Record<string, unknown> = { state: 'rolled_back' };
    if (reason) updateData.description = (release.description || '') + '\n\n--- Rollback Reason ---\n' + reason;

    // Mark all linked changes deployment status as rolled_back
    await db('release_changes').where('release_id', id).update({ deployment_status: 'rolled_back', updated_at: new Date() });

    // Notify stakeholders
    const stakeholders = await db('release_stakeholders').where('release_id', id).pluck('user_id');
    for (const stakeholderId of stakeholders) {
      await notify(stakeholderId, `Release Rolled Back: ${release.number}`, `Release ${release.number} - ${release.short_description} has been rolled back. Reason: ${reason || 'N/A'}`, `/releases/${id}`);
    }

    return this.update(id, updateData, userId);
  }

  // ══════════════════════════════════════
  // Analytics
  // ══════════════════════════════════════

  async getMetrics(startDate?: string, endDate?: string) {
    const [
      totalReleases,
      byState,
      byType,
      recentReleases,
    ] = await Promise.all([
      db('releases').count('* as count').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }).first(),
      db('releases').select('state').count('* as count').groupBy('state').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }),
      db('releases').select('release_type').count('* as count').groupBy('release_type').modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); }),
      db('releases').whereNotIn('state', ['completed', 'rolled_back', 'cancelled']).orderBy('created_at', 'desc').limit(10)
        .select('id', 'number', 'short_description', 'release_type', 'risk', 'state', 'risk_score', 'scheduled_start'),
    ]);

    const successRate = await db('releases')
      .whereIn('state', ['completed', 'rolled_back'])
      .select(
        db.raw("COUNT(CASE WHEN state = 'completed' THEN 1 END) as successful"),
        db.raw("COUNT(CASE WHEN state = 'rolled_back' THEN 1 END) as rolled_back"),
        db.raw("COUNT(*) as total_finished"),
      )
      .modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); })
      .first();

    const avgImplTime = await db('releases')
      .whereNotNull('actual_start')
      .whereNotNull('actual_end')
      .where('state', 'completed')
      .select(db.raw("AVG(EXTRACT(EPOCH FROM (actual_end::timestamp - actual_start::timestamp)) / 3600) as avg_hours"))
      .modify((q) => { if (startDate) q.where('created_at', '>=', startDate); if (endDate) q.where('created_at', '<=', endDate); })
      .first();

    const monthlyTrend = await db('releases')
      .select(db.raw("TO_CHAR(created_at, 'YYYY-MM') as month"))
      .count('* as count')
      .groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
      .orderByRaw("TO_CHAR(created_at, 'YYYY-MM') DESC")
      .limit(12);

    return {
      total: Number((totalReleases as any)?.count || 0),
      by_state: byState,
      by_type: byType,
      success_rate: {
        successful: Number((successRate as any)?.successful || 0),
        rolled_back: Number((successRate as any)?.rolled_back || 0),
        total_finished: Number((successRate as any)?.total_finished || 0),
        rate: (successRate as any)?.total_finished > 0
          ? Math.round((Number((successRate as any)?.successful || 0) / Number((successRate as any)?.total_finished)) * 100)
          : 0,
      },
      avg_deployment_hours: Math.round(Number((avgImplTime as any)?.avg_hours || 0) * 10) / 10,
      monthly_trend: monthlyTrend,
      recent_active: recentReleases,
    };
  }

  async getCalendar(startDate: string, endDate: string) {
    const releases = await db('releases')
      .whereNotIn('state', ['cancelled'])
      .where(function () {
        this.where(function () {
          this.whereNotNull('scheduled_start').where('scheduled_start', '>=', startDate).where('scheduled_start', '<=', endDate);
        }).orWhere(function () {
          this.whereNotNull('scheduled_end').where('scheduled_end', '>=', startDate).where('scheduled_end', '<=', endDate);
        });
      })
      .select('id', 'number', 'short_description', 'release_type', 'risk', 'impact', 'state', 'scheduled_start', 'scheduled_end', 'risk_score');

    return { releases };
  }

  // ══════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════

  private async recalculateRiskScore(releaseId: string) {
    const release = await db('releases').where('id', releaseId).first();
    if (!release) return;

    const changeCount = await db('release_changes').where('release_id', releaseId).count('* as c').first();
    const count = Number((changeCount as any)?.c || 0);
    const riskScore = calculateRiskScore(release.risk, release.impact, release.release_type, count);

    await db('releases').where('id', releaseId).update({ risk_score: riskScore, updated_at: new Date() });
  }
}

export const releaseService = new ReleaseService();
