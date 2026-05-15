import { z } from 'zod';

export const createIncidentSchema = z.object({
  short_description: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  urgency: z.number().int().min(1).max(3).optional(),
  impact: z.number().int().min(1).max(3).optional(),
  caller_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
});

export const updateIncidentSchema = z.object({
  short_description: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  state: z.string().optional(),
  urgency: z.number().int().min(1).max(3).optional(),
  impact: z.number().int().min(1).max(3).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  resolution_notes: z.string().optional().nullable(),
});
