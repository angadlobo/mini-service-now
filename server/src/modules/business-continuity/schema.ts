import { z } from 'zod';

export const createBCPlanSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.enum(['draft', 'active', 'under_review', 'retired']).optional(),
  type: z.enum(['business_continuity', 'disaster_recovery', 'crisis_management']).optional(),
  owner_id: z.string().uuid().optional().nullable(),
  last_tested: z.string().optional().nullable(),
  next_test_due: z.string().optional().nullable(),
  rpo_hours: z.number().int().min(0).optional().nullable(),
  rto_hours: z.number().int().min(0).optional().nullable(),
  business_service_id: z.string().uuid().optional().nullable(),
});

export const updateBCPlanSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['draft', 'active', 'under_review', 'retired']).optional(),
  type: z.enum(['business_continuity', 'disaster_recovery', 'crisis_management']).optional(),
  owner_id: z.string().uuid().optional().nullable(),
  last_tested: z.string().optional().nullable(),
  next_test_due: z.string().optional().nullable(),
  rpo_hours: z.number().int().min(0).optional().nullable(),
  rto_hours: z.number().int().min(0).optional().nullable(),
  business_service_id: z.string().uuid().optional().nullable(),
});

export const createBCTaskSchema = z.object({
  order_index: z.number().int().min(0).optional(),
  description: z.string().min(1).max(10000),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  estimated_minutes: z.number().int().min(0).optional().nullable(),
  category: z.enum(['communication', 'failover', 'recovery', 'verification']).optional(),
});

export const updateBCTaskSchema = z.object({
  order_index: z.number().int().min(0).optional(),
  description: z.string().min(1).max(10000).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  estimated_minutes: z.number().int().min(0).optional().nullable(),
  category: z.enum(['communication', 'failover', 'recovery', 'verification']).optional(),
});

export const createBCTestSchema = z.object({
  test_date: z.string(),
  test_type: z.enum(['tabletop', 'walkthrough', 'simulation', 'full']).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'failed']).optional(),
  actual_rto_hours: z.number().min(0).optional().nullable(),
  actual_rpo_hours: z.number().min(0).optional().nullable(),
  findings: z.string().max(10000).optional().nullable(),
  conducted_by: z.string().uuid().optional().nullable(),
});

export const updateBCTestSchema = z.object({
  test_date: z.string().optional(),
  test_type: z.enum(['tabletop', 'walkthrough', 'simulation', 'full']).optional(),
  status: z.enum(['planned', 'in_progress', 'completed', 'failed']).optional(),
  actual_rto_hours: z.number().min(0).optional().nullable(),
  actual_rpo_hours: z.number().min(0).optional().nullable(),
  findings: z.string().max(10000).optional().nullable(),
  conducted_by: z.string().uuid().optional().nullable(),
});
