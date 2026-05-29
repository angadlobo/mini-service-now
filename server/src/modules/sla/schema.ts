import { z } from 'zod';

export const createSlaDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  table_name: z.string().min(1).max(100),
  condition: z.record(z.any()).optional(),
  duration_minutes: z.number().int().positive(),
  active: z.boolean().optional(),
});

export const updateSlaDefinitionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  table_name: z.string().min(1).max(100).optional(),
  condition: z.record(z.any()).optional(),
  duration_minutes: z.number().int().positive().optional(),
  active: z.boolean().optional(),
});
