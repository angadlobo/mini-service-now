import { z } from 'zod';

export const createIncidentTaskSchema = z.object({
  short_description: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  parent_task_id: z.string().uuid().optional().nullable(),
  status: z.string().optional().default('pending'),
  priority: z.number().int().min(1).max(5).optional().default(3),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().datetime().optional().nullable(),
  planned_end: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
});

export const updateIncidentTaskSchema = z.object({
  short_description: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  parent_task_id: z.string().uuid().optional().nullable(),
  status: z.string().optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().datetime().optional().nullable(),
  planned_end: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  actual_hours: z.number().optional().nullable(),
  percent_complete: z.number().int().min(0).max(100).optional(),
  order_index: z.number().int().optional(),
});
