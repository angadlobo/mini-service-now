import { z } from 'zod';

export const createProblemSchema = z.object({
  short_description: z.string().min(1).max(255),
  description: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
});

export const updateProblemSchema = z.object({
  short_description: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  state: z.string().optional(),
  priority: z.number().min(1).max(5).optional(),
  root_cause: z.string().optional().nullable(),
  workaround: z.string().optional().nullable(),
  permanent_solution: z.string().optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
});
