import { z } from 'zod';

export const createChangeSchema = z.object({
  short_description: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  type: z.enum(['normal', 'standard', 'emergency']).optional(),
  risk: z.enum(['high', 'moderate', 'low']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  backout_plan: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
});

export const updateChangeSchema = z.object({
  short_description: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  state: z.string().optional(),
  type: z.enum(['normal', 'standard', 'emergency']).optional(),
  risk: z.enum(['high', 'moderate', 'low']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  backout_plan: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
});
