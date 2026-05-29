import { z } from 'zod';

export const declareMajorIncidentSchema = z.object({
  incident_id: z.string().optional().nullable(),
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['proposed', 'active', 'resolved', 'cancelled']).optional(),
  severity: z.enum(['sev1', 'sev2', 'sev3']).optional(),
  manager_id: z.string().uuid().optional().nullable(),
  business_impact: z.string().max(10000).optional().nullable(),
  summary: z.string().max(10000).optional().nullable(),
  war_room_url: z.string().max(500).optional().nullable(),
}).refine((d) => d.title || d.incident_id, { message: 'Either a title or a trigger incident is required' });

export const updateMajorIncidentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['proposed', 'active', 'resolved', 'cancelled']).optional(),
  severity: z.enum(['sev1', 'sev2', 'sev3']).optional(),
  manager_id: z.string().uuid().optional().nullable(),
  business_impact: z.string().max(10000).optional().nullable(),
  summary: z.string().max(10000).optional().nullable(),
  war_room_url: z.string().max(500).optional().nullable(),
});

export const postUpdateSchema = z.object({
  type: z.enum(['timeline', 'comms', 'status']).optional(),
  audience: z.enum(['internal', 'stakeholders']).optional(),
  message: z.string().min(1).max(10000),
});
