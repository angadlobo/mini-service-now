import { z } from 'zod';

export const createChangeSchema = z.object({
  short_description: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  type: z.enum(['normal', 'standard', 'emergency']).optional(),
  risk: z.enum(['high', 'moderate', 'low']).optional(),
  impact: z.enum(['high', 'moderate', 'low']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  backout_plan: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  change_plan: z.string().optional().nullable(),
  implementation_plan: z.string().optional().nullable(),
  test_plan: z.string().optional().nullable(),
  communication_plan: z.string().optional().nullable(),
  rollback_plan: z.string().optional().nullable(),
  cab_required: z.boolean().optional(),
  template_id: z.string().uuid().optional().nullable(),
  related_incident_id: z.string().uuid().optional().nullable(),
  related_problem_id: z.string().uuid().optional().nullable(),
  affected_ci_ids: z.array(z.string().uuid()).optional(),
});

export const updateChangeSchema = z.object({
  short_description: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  state: z.string().optional(),
  type: z.enum(['normal', 'standard', 'emergency']).optional(),
  risk: z.enum(['high', 'moderate', 'low']).optional(),
  impact: z.enum(['high', 'moderate', 'low']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  assigned_to: z.string().uuid().optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  planned_start: z.string().optional().nullable(),
  planned_end: z.string().optional().nullable(),
  backout_plan: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  change_plan: z.string().optional().nullable(),
  implementation_plan: z.string().optional().nullable(),
  test_plan: z.string().optional().nullable(),
  communication_plan: z.string().optional().nullable(),
  rollback_plan: z.string().optional().nullable(),
  cab_required: z.boolean().optional(),
  close_code: z.enum(['successful', 'successful_with_issues', 'unsuccessful', 'cancelled']).optional().nullable(),
  close_notes: z.string().optional().nullable(),
  actual_start: z.string().optional().nullable(),
  actual_end: z.string().optional().nullable(),
  related_incident_id: z.string().uuid().optional().nullable(),
  related_problem_id: z.string().uuid().optional().nullable(),
  affected_ci_ids: z.array(z.string().uuid()).optional(),
});

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  type: z.enum(['normal', 'standard', 'emergency']).optional(),
  category: z.string().max(100).optional().nullable(),
  risk: z.enum(['high', 'moderate', 'low']).optional(),
  impact: z.enum(['high', 'moderate', 'low']).optional(),
  priority: z.number().int().min(1).max(5).optional(),
  change_plan: z.string().optional().nullable(),
  implementation_plan: z.string().optional().nullable(),
  test_plan: z.string().optional().nullable(),
  communication_plan: z.string().optional().nullable(),
  rollback_plan: z.string().optional().nullable(),
  backout_plan: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  default_assignment_group_id: z.string().uuid().optional().nullable(),
  default_approvers: z.array(z.string().uuid()).optional(),
  pre_approved: z.boolean().optional(),
  cab_required: z.boolean().optional(),
});

export const updateTemplateSchema = createTemplateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const createMaintenanceWindowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  recurrence: z.enum(['none', 'weekly', 'monthly', 'quarterly']).optional(),
  recurrence_config: z.record(z.unknown()).optional(),
});

export const createBlackoutWindowSchema = z.object({
  name: z.string().min(1).max(200),
  reason: z.string().optional().nullable(),
  start_time: z.string().min(1),
  end_time: z.string().min(1),
  severity: z.enum(['hard', 'soft']).optional(),
});

export const createCabMeetingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  scheduled_date: z.string().min(1),
  duration_minutes: z.number().int().min(15).max(480).optional(),
  attendees: z.array(z.string().uuid()).optional(),
  chair_id: z.string().uuid().optional().nullable(),
  location: z.string().max(255).optional().nullable(),
});

export const cabAgendaDecisionSchema = z.object({
  decision: z.enum(['approved', 'rejected', 'deferred', 'more_info']),
  discussion_notes: z.string().optional().nullable(),
});

export const createApprovalRuleSchema = z.object({
  name: z.string().min(1).max(200),
  change_type: z.enum(['normal', 'standard', 'emergency']),
  risk_level: z.enum(['high', 'moderate', 'low']).optional().nullable(),
  impact_level: z.enum(['high', 'moderate', 'low']).optional().nullable(),
  approver_ids: z.array(z.string().uuid()).optional(),
  approver_group_id: z.string().uuid().optional().nullable(),
  cab_required: z.boolean().optional(),
  approval_order: z.number().int().min(1).optional(),
  approval_type: z.enum(['all', 'any']).optional(),
});
