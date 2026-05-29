import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { AppError } from '../../middleware/error';

export class DemandService {
  async list(options: QueryOptions) {
    const query = db('demands')
      .select(
        'demands.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demands.requested_by) as requested_by_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demands.approved_by) as approved_by_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demands.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'demands', {
      ...options,
      searchFields: ['number', 'title', 'description', 'business_unit'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const demand = await db('demands')
      .select(
        'demands.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demands.requested_by) as requested_by_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demands.approved_by) as approved_by_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demands.created_by) as created_by_name"),
      )
      .where('demands.id', id)
      .orWhere('demands.number', id)
      .first();

    return demand;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('demand_number_seq') as seq")).rows[0];
    const number = `DMD${String(seqResult.seq).padStart(7, '0')}`;

    const [demand] = await db('demands')
      .insert({
        number,
        title: data.title,
        description: data.description || null,
        status: data.status || 'submitted',
        type: data.type || 'enhancement',
        business_justification: data.business_justification || null,
        requested_by: data.requested_by || null,
        business_unit: data.business_unit || null,
        priority: data.priority || 3,
        estimated_effort_days: data.estimated_effort_days || null,
        estimated_cost: data.estimated_cost || null,
        expected_value: data.expected_value || null,
        roi_score: data.roi_score || null,
        target_quarter: data.target_quarter || null,
        approved_by: data.approved_by || null,
        project_id: data.project_id || null,
        created_by: userId,
      })
      .returning('*');

    await recordAudit('demands', demand.id, { action: { old: null, new: 'created' } }, userId);
    return demand;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('demands').where('id', id).first();
    if (!existing) throw new AppError(404, 'Demand not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('demands').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('demands', id, changes, userId);

    return updated;
  }

  async delete(id: string) {
    const existing = await db('demands').where('id', id).first();
    if (!existing) throw new AppError(404, 'Demand not found');

    await db('demands').where('id', id).del();
  }

  // ── Scores ──

  async getScores(demandId: string) {
    return db('demand_scores')
      .select(
        'demand_scores.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = demand_scores.scored_by) as scored_by_name"),
      )
      .where('demand_id', demandId)
      .orderBy('criterion', 'asc');
  }

  async setScore(demandId: string, data: Record<string, unknown>, userId: string) {
    const demand = await db('demands').where('id', demandId).first();
    if (!demand) throw new AppError(404, 'Demand not found');

    // Upsert: insert or update on conflict
    const existing = await db('demand_scores')
      .where({ demand_id: demandId, criterion: data.criterion as string })
      .first();

    let score;
    if (existing) {
      [score] = await db('demand_scores')
        .where('id', existing.id)
        .update({
          score: data.score,
          weight: data.weight || existing.weight,
          scored_by: userId,
          updated_at: new Date(),
        })
        .returning('*');
    } else {
      [score] = await db('demand_scores')
        .insert({
          demand_id: demandId,
          criterion: data.criterion,
          score: data.score,
          weight: data.weight || 1.0,
          scored_by: userId,
        })
        .returning('*');
    }

    // Recalculate roi_score as weighted average of all scores
    const allScores = await db('demand_scores').where('demand_id', demandId);
    if (allScores.length > 0) {
      const totalWeight = allScores.reduce((sum: number, s: any) => sum + Number(s.weight), 0);
      const weightedSum = allScores.reduce((sum: number, s: any) => sum + (Number(s.score) * Number(s.weight)), 0);
      const roiScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

      await db('demands').where('id', demandId).update({
        roi_score: Math.round(roiScore * 100) / 100,
        updated_at: new Date(),
      });
    }

    return score;
  }

  // ── Pipeline ──

  async getPipeline() {
    const pipeline = await db('demands')
      .select('status')
      .count('* as count')
      .sum('estimated_cost as total_estimated_cost')
      .sum('expected_value as total_expected_value')
      .groupBy('status')
      .orderBy('status', 'asc');

    const byType = await db('demands')
      .select('type')
      .count('* as count')
      .groupBy('type');

    const byQuarter = await db('demands')
      .select('target_quarter')
      .count('* as count')
      .sum('estimated_cost as total_estimated_cost')
      .whereNotNull('target_quarter')
      .groupBy('target_quarter')
      .orderBy('target_quarter', 'asc');

    return { byStatus: pipeline, byType, byQuarter };
  }
}

export const demandService = new DemandService();
