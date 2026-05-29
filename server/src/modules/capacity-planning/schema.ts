import { z } from 'zod';

export const createResourcePoolSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['team', 'infrastructure', 'budget']).optional(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  total_capacity_hours: z.number().min(0).optional(),
  period: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
});

export const updateResourcePoolSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['team', 'infrastructure', 'budget']).optional(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  total_capacity_hours: z.number().min(0).optional(),
  period: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
});

export const createAllocationSchema = z.object({
  allocated_to_type: z.enum(['project', 'demand', 'operational']),
  allocated_to_id: z.string().uuid().optional().nullable(),
  hours: z.number().min(0),
  period_start: z.string(),
  period_end: z.string(),
  status: z.enum(['planned', 'confirmed']).optional(),
});

export const updateAllocationSchema = z.object({
  allocated_to_type: z.enum(['project', 'demand', 'operational']).optional(),
  allocated_to_id: z.string().uuid().optional().nullable(),
  hours: z.number().min(0).optional(),
  period_start: z.string().optional(),
  period_end: z.string().optional(),
  status: z.enum(['planned', 'confirmed']).optional(),
});

export const createForecastSchema = z.object({
  period_start: z.string(),
  forecasted_demand_hours: z.number().min(0).optional(),
  available_hours: z.number().min(0).optional(),
  notes: z.string().max(10000).optional().nullable(),
});

export const updateForecastSchema = z.object({
  period_start: z.string().optional(),
  forecasted_demand_hours: z.number().min(0).optional(),
  available_hours: z.number().min(0).optional(),
  notes: z.string().max(10000).optional().nullable(),
});
