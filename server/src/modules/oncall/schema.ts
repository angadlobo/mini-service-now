import { z } from 'zod';

export const createScheduleSchema = z.object({
  name: z.string().min(1).max(200),
  assignment_group_id: z.string().uuid().optional().nullable(),
  timezone: z.string().max(50).optional(),
  rotation_type: z.enum(['daily', 'weekly', 'custom']).optional(),
  handoff_time: z.string().max(10).optional(),
});

export const updateScheduleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  timezone: z.string().max(50).optional(),
  rotation_type: z.enum(['daily', 'weekly', 'custom']).optional(),
  handoff_time: z.string().max(10).optional(),
});

export const createRotationSchema = z.object({
  user_id: z.string().uuid(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  order_index: z.number().int().min(0).optional(),
});

export const createOverrideSchema = z.object({
  user_id: z.string().uuid(),
  override_user_id: z.string().uuid(),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().optional().nullable(),
});

export const createEscalationPolicySchema = z.object({
  name: z.string().min(1).max(200),
  assignment_group_id: z.string().uuid().optional().nullable(),
  enabled: z.boolean().optional(),
});

export const updateEscalationPolicySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  enabled: z.boolean().optional(),
});

export const createEscalationLevelSchema = z.object({
  level: z.number().int().min(1),
  delay_minutes: z.number().int().min(0).optional(),
  notify_oncall: z.boolean().optional(),
  notify_user_id: z.string().uuid().optional().nullable(),
  notify_group_id: z.string().uuid().optional().nullable(),
  action: z.enum(['notify', 'reassign', 'page']).optional(),
});
