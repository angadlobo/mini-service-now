import { z } from 'zod';

export const createServiceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  owner_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive', 'planned']).optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  portfolio: z.string().max(100).optional().nullable(),
  sla_definition_id: z.string().uuid().optional().nullable(),
});

export const updateServiceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  owner_id: z.string().uuid().optional().nullable(),
  status: z.enum(['active', 'inactive', 'planned']).optional(),
  criticality: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  portfolio: z.string().max(100).optional().nullable(),
  sla_definition_id: z.string().uuid().optional().nullable(),
});

export const createOfferingSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(10000).optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  availability_target: z.number().min(0).max(100).optional().nullable(),
});

export const createDependencySchema = z.object({
  depends_on_service_id: z.string().uuid(),
  dependency_type: z.enum(['hard', 'soft']).optional(),
  description: z.string().max(10000).optional().nullable(),
});

export const createCiMappingSchema = z.object({
  ci_id: z.string().uuid(),
  role: z.enum(['provides', 'consumes', 'manages']).optional(),
});
