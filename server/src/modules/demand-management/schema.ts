import { z } from 'zod';

export const createDemandSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  status: z.enum(['submitted', 'screening', 'approved', 'rejected', 'committed', 'completed']).optional(),
  type: z.enum(['project', 'enhancement', 'initiative']).optional(),
  business_justification: z.string().max(10000).optional().nullable(),
  requested_by: z.string().uuid().optional().nullable(),
  business_unit: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
  estimated_effort_days: z.number().int().min(0).optional().nullable(),
  estimated_cost: z.number().min(0).optional().nullable(),
  expected_value: z.number().min(0).optional().nullable(),
  target_quarter: z.string().max(10).optional().nullable(),
  approved_by: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateDemandSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  status: z.enum(['submitted', 'screening', 'approved', 'rejected', 'committed', 'completed']).optional(),
  type: z.enum(['project', 'enhancement', 'initiative']).optional(),
  business_justification: z.string().max(10000).optional().nullable(),
  requested_by: z.string().uuid().optional().nullable(),
  business_unit: z.string().max(100).optional().nullable(),
  priority: z.number().int().min(1).max(5).optional(),
  estimated_effort_days: z.number().int().min(0).optional().nullable(),
  estimated_cost: z.number().min(0).optional().nullable(),
  expected_value: z.number().min(0).optional().nullable(),
  roi_score: z.number().min(0).optional().nullable(),
  target_quarter: z.string().max(10).optional().nullable(),
  approved_by: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const setScoreSchema = z.object({
  criterion: z.enum(['strategic_alignment', 'risk', 'roi', 'resource_availability', 'urgency']),
  score: z.number().int().min(0).max(10),
  weight: z.number().min(0).max(10).optional(),
});
