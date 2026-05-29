import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { AppError } from '../../middleware/error';

// ── Resource Pools ──

export class ResourcePoolService {
  async list(options: QueryOptions) {
    const query = db('resource_pools')
      .select(
        'resource_pools.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = resource_pools.assignment_group_id) as assignment_group_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'resource_pools', {
      ...options,
      searchFields: ['name', 'type'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const pool = await db('resource_pools')
      .select(
        'resource_pools.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = resource_pools.assignment_group_id) as assignment_group_name"),
      )
      .where('resource_pools.id', id)
      .first();

    return pool;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [pool] = await db('resource_pools')
      .insert({
        name: data.name,
        type: data.type || 'team',
        assignment_group_id: data.assignment_group_id || null,
        total_capacity_hours: data.total_capacity_hours || 0,
        period: data.period || 'monthly',
      })
      .returning('*');

    await recordAudit('resource_pools', pool.id, { action: { old: null, new: 'created' } }, userId);
    return pool;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('resource_pools').where('id', id).first();
    if (!existing) throw new AppError(404, 'Resource pool not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('resource_pools').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('resource_pools', id, changes, userId);

    return updated;
  }

  async delete(id: string) {
    const existing = await db('resource_pools').where('id', id).first();
    if (!existing) throw new AppError(404, 'Resource pool not found');

    await db('resource_pools').where('id', id).del();
  }
}

// ── Allocations ──

export class AllocationService {
  async listByPool(poolId: string) {
    return db('capacity_allocations')
      .where('pool_id', poolId)
      .orderBy('period_start', 'asc');
  }

  async create(poolId: string, data: Record<string, unknown>, userId: string) {
    const pool = await db('resource_pools').where('id', poolId).first();
    if (!pool) throw new AppError(404, 'Resource pool not found');

    const [allocation] = await db('capacity_allocations')
      .insert({
        pool_id: poolId,
        allocated_to_type: data.allocated_to_type,
        allocated_to_id: data.allocated_to_id || null,
        hours: data.hours,
        period_start: data.period_start,
        period_end: data.period_end,
        status: data.status || 'planned',
      })
      .returning('*');

    await recordAudit('capacity_allocations', allocation.id, { action: { old: null, new: 'created' } }, userId);
    return allocation;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('capacity_allocations').where('id', id).first();
    if (!existing) throw new AppError(404, 'Capacity allocation not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('capacity_allocations').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('capacity_allocations', id, changes, userId);

    return updated;
  }

  async delete(id: string) {
    const existing = await db('capacity_allocations').where('id', id).first();
    if (!existing) throw new AppError(404, 'Capacity allocation not found');

    await db('capacity_allocations').where('id', id).del();
  }
}

// ── Forecasts ──

export class ForecastService {
  async listByPool(poolId: string) {
    return db('capacity_forecasts')
      .where('pool_id', poolId)
      .orderBy('period_start', 'asc');
  }

  async create(poolId: string, data: Record<string, unknown>, userId: string) {
    const pool = await db('resource_pools').where('id', poolId).first();
    if (!pool) throw new AppError(404, 'Resource pool not found');

    const forecastedDemand = Number(data.forecasted_demand_hours) || 0;
    const available = Number(data.available_hours) || 0;
    const gap = available - forecastedDemand;

    const [forecast] = await db('capacity_forecasts')
      .insert({
        pool_id: poolId,
        period_start: data.period_start,
        forecasted_demand_hours: forecastedDemand,
        available_hours: available,
        gap_hours: gap,
        notes: data.notes || null,
      })
      .returning('*');

    await recordAudit('capacity_forecasts', forecast.id, { action: { old: null, new: 'created' } }, userId);
    return forecast;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('capacity_forecasts').where('id', id).first();
    if (!existing) throw new AppError(404, 'Capacity forecast not found');

    const forecastedDemand = data.forecasted_demand_hours !== undefined
      ? Number(data.forecasted_demand_hours)
      : Number(existing.forecasted_demand_hours);
    const available = data.available_hours !== undefined
      ? Number(data.available_hours)
      : Number(existing.available_hours);

    const updateData = {
      ...data,
      gap_hours: available - forecastedDemand,
      updated_at: new Date(),
    };

    const [updated] = await db('capacity_forecasts').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('capacity_forecasts', id, changes, userId);

    return updated;
  }
}

// ── Dashboard ──

export async function getDashboard() {
  const pools = await db('resource_pools')
    .select(
      'resource_pools.*',
      db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = resource_pools.assignment_group_id) as assignment_group_name"),
    )
    .orderBy('name', 'asc');

  const utilization = [];
  for (const pool of pools) {
    const allocations = await db('capacity_allocations')
      .where('pool_id', pool.id)
      .where('status', 'confirmed')
      .sum('hours as total_allocated');

    const totalAllocated = Number(allocations[0]?.total_allocated || 0);
    const totalCapacity = Number(pool.total_capacity_hours) || 1;
    const utilizationPct = Math.round((totalAllocated / totalCapacity) * 10000) / 100;

    utilization.push({
      pool_id: pool.id,
      pool_name: pool.name,
      pool_type: pool.type,
      total_capacity_hours: pool.total_capacity_hours,
      total_allocated_hours: totalAllocated,
      utilization_percent: utilizationPct,
    });
  }

  const gapAnalysis = await db('capacity_forecasts')
    .select(
      'capacity_forecasts.*',
      db.raw("(SELECT name FROM resource_pools WHERE resource_pools.id = capacity_forecasts.pool_id) as pool_name"),
    )
    .where('gap_hours', '<', 0)
    .orderBy('gap_hours', 'asc');

  return { utilization, gapAnalysis };
}

export const resourcePoolService = new ResourcePoolService();
export const allocationService = new AllocationService();
export const forecastService = new ForecastService();
