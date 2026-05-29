import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  type: z.enum(['waterfall', 'agile', 'hybrid']).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  portfolio: z.string().max(100).optional().nullable(),
  phase: z.enum(['initiation', 'planning', 'execution', 'monitoring', 'closing']).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  type: z.enum(['waterfall', 'agile', 'hybrid']).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  actual_start: z.string().optional().nullable(),
  actual_end: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  actual_cost: z.number().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  portfolio: z.string().max(100).optional().nullable(),
  percent_complete: z.number().int().min(0).max(100).optional(),
  phase: z.enum(['initiation', 'planning', 'execution', 'monitoring', 'closing']).optional(),
});

export const createProjectTaskSchema = z.object({
  project_id: z.string().uuid().optional(),
  parent_task_id: z.string().uuid().optional().nullable(),
  short_description: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  order_index: z.number().int().optional(),
});

export const updateProjectTaskSchema = z.object({
  short_description: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled', 'blocked']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  actual_start: z.string().optional().nullable(),
  actual_end: z.string().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  actual_hours: z.number().optional().nullable(),
  percent_complete: z.number().int().min(0).max(100).optional(),
  order_index: z.number().int().optional(),
  parent_task_id: z.string().uuid().optional().nullable(),
});

export const createMilestoneSchema = z.object({
  name: z.string().min(1).max(200),
  due_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed', 'missed']).optional(),
});

export const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  due_date: z.string().optional().nullable(),
  completed_date: z.string().optional().nullable(),
  status: z.enum(['pending', 'completed', 'missed']).optional(),
});

export const createMemberSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['manager', 'member', 'stakeholder', 'sponsor']).optional(),
});

export const createTimeEntrySchema = z.object({
  task_id: z.string().uuid().optional().nullable(),
  date: z.string(),
  hours: z.number().min(0.25).max(24),
  notes: z.string().max(2000).optional(),
  billable: z.boolean().optional(),
});
