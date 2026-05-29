import { z } from 'zod';

export const createCostCenterSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(200),
  department: z.string().max(100).optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  budget_annual: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export const updateCostCenterSchema = z.object({
  code: z.string().min(1).max(20).optional(),
  name: z.string().min(1).max(200).optional(),
  department: z.string().max(100).optional().nullable(),
  manager_id: z.string().uuid().optional().nullable(),
  budget_annual: z.number().min(0).optional(),
  active: z.boolean().optional(),
});

export const createCostItemSchema = z.object({
  cost_center_id: z.string().uuid(),
  category: z.enum(['infrastructure', 'software', 'labor', 'cloud', 'maintenance']),
  description: z.string().min(1).max(10000),
  amount: z.number().min(0),
  currency: z.string().length(3).optional(),
  date: z.string(),
  recurring: z.boolean().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'annual']).optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const updateCostItemSchema = z.object({
  cost_center_id: z.string().uuid().optional(),
  category: z.enum(['infrastructure', 'software', 'labor', 'cloud', 'maintenance']).optional(),
  description: z.string().min(1).max(10000).optional(),
  amount: z.number().min(0).optional(),
  currency: z.string().length(3).optional(),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
  frequency: z.enum(['monthly', 'quarterly', 'annual']).optional().nullable(),
  asset_id: z.string().uuid().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable(),
  project_id: z.string().uuid().optional().nullable(),
});

export const createChargebackRuleSchema = z.object({
  name: z.string().min(1).max(200),
  source_type: z.enum(['ci', 'service', 'department']),
  allocation_method: z.enum(['fixed', 'usage_based', 'headcount']),
  rate: z.number().min(0).optional(),
  unit: z.string().max(50).optional().nullable(),
  active: z.boolean().optional(),
});

export const updateChargebackRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  source_type: z.enum(['ci', 'service', 'department']).optional(),
  allocation_method: z.enum(['fixed', 'usage_based', 'headcount']).optional(),
  rate: z.number().min(0).optional(),
  unit: z.string().max(50).optional().nullable(),
  active: z.boolean().optional(),
});

export const generateChargebackSchema = z.object({
  period: z.string().min(1).max(20),
});
