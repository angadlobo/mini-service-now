import { db } from '../../config/database';
import { AppError } from '../../middleware/error';

// ══════════════════════════════════════════════════════════
// On-Call Scheduling Service
// ══════════════════════════════════════════════════════════

export class OnCallService {
  // ── Schedules ──

  async listSchedules() {
    return db('oncall_schedules')
      .select(
        'oncall_schedules.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = oncall_schedules.assignment_group_id) as group_name"),
      )
      .orderBy('oncall_schedules.name');
  }

  async getSchedule(id: string) {
    const schedule = await db('oncall_schedules')
      .select(
        'oncall_schedules.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = oncall_schedules.assignment_group_id) as group_name"),
      )
      .where('oncall_schedules.id', id)
      .first();

    if (!schedule) return null;

    const rotations = await db('oncall_rotations')
      .select(
        'oncall_rotations.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_rotations.user_id) as user_name"),
      )
      .where('oncall_rotations.schedule_id', id)
      .orderBy('oncall_rotations.order_index');

    const overrides = await db('oncall_overrides')
      .select(
        'oncall_overrides.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_overrides.user_id) as user_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_overrides.override_user_id) as override_user_name"),
      )
      .where('oncall_overrides.schedule_id', id)
      .orderBy('oncall_overrides.start_date', 'desc');

    return { ...schedule, rotations, overrides };
  }

  async createSchedule(data: Record<string, unknown>) {
    const insertData: Record<string, unknown> = {
      name: data.name,
      assignment_group_id: data.assignment_group_id || null,
      timezone: data.timezone || 'UTC',
      rotation_type: data.rotation_type || 'weekly',
      handoff_time: data.handoff_time || '09:00',
    };

    const [schedule] = await db('oncall_schedules').insert(insertData).returning('*');
    return schedule;
  }

  async updateSchedule(id: string, data: Record<string, unknown>) {
    const existing = await db('oncall_schedules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Schedule not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('oncall_schedules').where('id', id).update(updateData).returning('*');
    return updated;
  }

  async deleteSchedule(id: string) {
    const existing = await db('oncall_schedules').where('id', id).first();
    if (!existing) throw new AppError(404, 'Schedule not found');

    await db('oncall_schedules').where('id', id).del();
  }

  // ── Rotations ──

  async getRotations(scheduleId: string) {
    return db('oncall_rotations')
      .select(
        'oncall_rotations.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_rotations.user_id) as user_name"),
      )
      .where('oncall_rotations.schedule_id', scheduleId)
      .orderBy('oncall_rotations.order_index');
  }

  async addRotation(scheduleId: string, data: Record<string, unknown>) {
    const schedule = await db('oncall_schedules').where('id', scheduleId).first();
    if (!schedule) throw new AppError(404, 'Schedule not found');

    // Auto-calculate order_index if not provided
    let orderIndex = data.order_index as number | undefined;
    if (orderIndex === undefined || orderIndex === null) {
      const maxOrder = await db('oncall_rotations').where('schedule_id', scheduleId).max('order_index as max').first();
      orderIndex = (((maxOrder as any)?.max ?? -1) + 1);
    }

    const [rotation] = await db('oncall_rotations').insert({
      schedule_id: scheduleId,
      user_id: data.user_id,
      start_date: data.start_date,
      end_date: data.end_date,
      order_index: orderIndex,
    }).returning('*');

    return rotation;
  }

  async updateRotation(id: string, data: Record<string, unknown>) {
    const existing = await db('oncall_rotations').where('id', id).first();
    if (!existing) throw new AppError(404, 'Rotation not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('oncall_rotations').where('id', id).update(updateData).returning('*');
    return updated;
  }

  async deleteRotation(id: string) {
    const existing = await db('oncall_rotations').where('id', id).first();
    if (!existing) throw new AppError(404, 'Rotation not found');

    await db('oncall_rotations').where('id', id).del();
  }

  // ── Overrides ──

  async addOverride(scheduleId: string, data: Record<string, unknown>) {
    const schedule = await db('oncall_schedules').where('id', scheduleId).first();
    if (!schedule) throw new AppError(404, 'Schedule not found');

    const [override] = await db('oncall_overrides').insert({
      schedule_id: scheduleId,
      user_id: data.user_id,
      override_user_id: data.override_user_id,
      start_date: data.start_date,
      end_date: data.end_date,
      reason: data.reason || null,
    }).returning('*');

    return override;
  }

  async deleteOverride(id: string) {
    const existing = await db('oncall_overrides').where('id', id).first();
    if (!existing) throw new AppError(404, 'Override not found');

    await db('oncall_overrides').where('id', id).del();
  }

  // ── Who's On Call ──

  async getWhosOnCall(scheduleId?: string) {
    const now = new Date();

    let schedulesQuery = db('oncall_schedules')
      .select(
        'oncall_schedules.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = oncall_schedules.assignment_group_id) as group_name"),
      );

    if (scheduleId) {
      schedulesQuery = schedulesQuery.where('oncall_schedules.id', scheduleId);
    }

    const schedules = await schedulesQuery.orderBy('oncall_schedules.name');

    const results = [];

    for (const schedule of schedules) {
      // Check for active overrides first
      const activeOverride = await db('oncall_overrides')
        .select(
          'oncall_overrides.*',
          db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_overrides.override_user_id) as oncall_user_name"),
          db.raw("(SELECT email FROM users WHERE users.id = oncall_overrides.override_user_id) as oncall_user_email"),
        )
        .where('oncall_overrides.schedule_id', schedule.id)
        .where('oncall_overrides.start_date', '<=', now)
        .where('oncall_overrides.end_date', '>=', now)
        .first();

      if (activeOverride) {
        results.push({
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          group_name: schedule.group_name,
          timezone: schedule.timezone,
          handoff_time: schedule.handoff_time,
          oncall_user_id: activeOverride.override_user_id,
          oncall_user_name: activeOverride.oncall_user_name,
          oncall_user_email: activeOverride.oncall_user_email,
          is_override: true,
          override_reason: activeOverride.reason,
          rotation_start: activeOverride.start_date,
          rotation_end: activeOverride.end_date,
        });
        continue;
      }

      // Find current rotation
      const currentRotation = await db('oncall_rotations')
        .select(
          'oncall_rotations.*',
          db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_rotations.user_id) as oncall_user_name"),
          db.raw("(SELECT email FROM users WHERE users.id = oncall_rotations.user_id) as oncall_user_email"),
        )
        .where('oncall_rotations.schedule_id', schedule.id)
        .where('oncall_rotations.start_date', '<=', now)
        .where('oncall_rotations.end_date', '>=', now)
        .orderBy('oncall_rotations.order_index')
        .first();

      if (currentRotation) {
        // Find next rotation for handoff info
        const nextRotation = await db('oncall_rotations')
          .select(
            'oncall_rotations.start_date',
            db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = oncall_rotations.user_id) as next_user_name"),
          )
          .where('oncall_rotations.schedule_id', schedule.id)
          .where('oncall_rotations.start_date', '>', currentRotation.end_date)
          .orderBy('oncall_rotations.start_date')
          .first();

        results.push({
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          group_name: schedule.group_name,
          timezone: schedule.timezone,
          handoff_time: schedule.handoff_time,
          oncall_user_id: currentRotation.user_id,
          oncall_user_name: currentRotation.oncall_user_name,
          oncall_user_email: currentRotation.oncall_user_email,
          is_override: false,
          rotation_start: currentRotation.start_date,
          rotation_end: currentRotation.end_date,
          next_handoff: nextRotation?.start_date || null,
          next_user_name: nextRotation?.next_user_name || null,
        });
      } else {
        results.push({
          schedule_id: schedule.id,
          schedule_name: schedule.name,
          group_name: schedule.group_name,
          timezone: schedule.timezone,
          handoff_time: schedule.handoff_time,
          oncall_user_id: null,
          oncall_user_name: null,
          oncall_user_email: null,
          is_override: false,
          rotation_start: null,
          rotation_end: null,
        });
      }
    }

    return results;
  }
}

// ══════════════════════════════════════════════════════════
// Escalation Policy Service
// ══════════════════════════════════════════════════════════

export class EscalationService {
  // ── Policies ──

  async listPolicies() {
    return db('escalation_policies')
      .select(
        'escalation_policies.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = escalation_policies.assignment_group_id) as group_name"),
      )
      .orderBy('escalation_policies.name');
  }

  async getPolicy(id: string) {
    const policy = await db('escalation_policies')
      .select(
        'escalation_policies.*',
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = escalation_policies.assignment_group_id) as group_name"),
      )
      .where('escalation_policies.id', id)
      .first();

    if (!policy) return null;

    const levels = await db('escalation_levels')
      .select(
        'escalation_levels.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = escalation_levels.notify_user_id) as notify_user_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = escalation_levels.notify_group_id) as notify_group_name"),
      )
      .where('escalation_levels.policy_id', id)
      .orderBy('escalation_levels.level');

    return { ...policy, levels };
  }

  async createPolicy(data: Record<string, unknown>) {
    const insertData: Record<string, unknown> = {
      name: data.name,
      assignment_group_id: data.assignment_group_id || null,
      enabled: data.enabled !== undefined ? data.enabled : true,
    };

    const [policy] = await db('escalation_policies').insert(insertData).returning('*');
    return policy;
  }

  async updatePolicy(id: string, data: Record<string, unknown>) {
    const existing = await db('escalation_policies').where('id', id).first();
    if (!existing) throw new AppError(404, 'Escalation policy not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('escalation_policies').where('id', id).update(updateData).returning('*');
    return updated;
  }

  async deletePolicy(id: string) {
    const existing = await db('escalation_policies').where('id', id).first();
    if (!existing) throw new AppError(404, 'Escalation policy not found');

    await db('escalation_policies').where('id', id).del();
  }

  // ── Levels ──

  async getLevels(policyId: string) {
    return db('escalation_levels')
      .select(
        'escalation_levels.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = escalation_levels.notify_user_id) as notify_user_name"),
        db.raw("(SELECT name FROM assignment_groups WHERE assignment_groups.id = escalation_levels.notify_group_id) as notify_group_name"),
      )
      .where('escalation_levels.policy_id', policyId)
      .orderBy('escalation_levels.level');
  }

  async addLevel(policyId: string, data: Record<string, unknown>) {
    const policy = await db('escalation_policies').where('id', policyId).first();
    if (!policy) throw new AppError(404, 'Escalation policy not found');

    const [level] = await db('escalation_levels').insert({
      policy_id: policyId,
      level: data.level,
      delay_minutes: data.delay_minutes ?? 15,
      notify_oncall: data.notify_oncall !== undefined ? data.notify_oncall : true,
      notify_user_id: data.notify_user_id || null,
      notify_group_id: data.notify_group_id || null,
      action: data.action || 'notify',
    }).returning('*');

    return level;
  }

  async updateLevel(id: string, data: Record<string, unknown>) {
    const existing = await db('escalation_levels').where('id', id).first();
    if (!existing) throw new AppError(404, 'Escalation level not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('escalation_levels').where('id', id).update(updateData).returning('*');
    return updated;
  }

  async deleteLevel(id: string) {
    const existing = await db('escalation_levels').where('id', id).first();
    if (!existing) throw new AppError(404, 'Escalation level not found');

    await db('escalation_levels').where('id', id).del();
  }
}

export const onCallService = new OnCallService();
export const escalationService = new EscalationService();
