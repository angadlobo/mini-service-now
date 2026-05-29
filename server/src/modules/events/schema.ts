import { z } from 'zod';

export const createEventSchema = z.object({
  source: z.enum(['datadog', 'grafana', 'pagerduty', 'custom', 'email']),
  severity: z.enum(['critical', 'major', 'minor', 'warning', 'info', 'clear']).optional(),
  node: z.string().max(200).optional(),
  type: z.enum(['availability', 'performance', 'security', 'capacity']).optional(),
  metric_name: z.string().max(100).optional(),
  metric_value: z.string().max(100).optional(),
  threshold: z.string().max(100).optional(),
  message_key: z.string().max(200).optional(),
  description: z.string().max(10000).optional(),
  ci_id: z.string().uuid().optional().nullable(),
  alert_rule_id: z.string().uuid().optional().nullable(),
});

export const updateEventSchema = z.object({
  severity: z.enum(['critical', 'major', 'minor', 'warning', 'info', 'clear']).optional(),
  status: z.enum(['open', 'acknowledged', 'resolved', 'closed']).optional(),
  node: z.string().max(200).optional(),
  type: z.enum(['availability', 'performance', 'security', 'capacity']).optional(),
  metric_name: z.string().max(100).optional(),
  metric_value: z.string().max(100).optional(),
  threshold: z.string().max(100).optional(),
  description: z.string().max(10000).optional(),
  ci_id: z.string().uuid().optional().nullable(),
  incident_id: z.string().uuid().optional().nullable(),
});

export const createAlertRuleSchema = z.object({
  name: z.string().min(1).max(200),
  enabled: z.boolean().optional(),
  source: z.enum(['datadog', 'grafana', 'pagerduty', 'custom', 'email']),
  conditions: z.record(z.any()).optional(),
  actions: z.record(z.any()).optional(),
  severity_override: z.enum(['critical', 'major', 'minor', 'warning', 'info', 'clear']).optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  cooldown_minutes: z.number().int().min(0).optional(),
});

export const updateAlertRuleSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  enabled: z.boolean().optional(),
  source: z.enum(['datadog', 'grafana', 'pagerduty', 'custom', 'email']).optional(),
  conditions: z.record(z.any()).optional(),
  actions: z.record(z.any()).optional(),
  severity_override: z.enum(['critical', 'major', 'minor', 'warning', 'info', 'clear']).optional().nullable(),
  assignment_group_id: z.string().uuid().optional().nullable(),
  cooldown_minutes: z.number().int().min(0).optional(),
});
