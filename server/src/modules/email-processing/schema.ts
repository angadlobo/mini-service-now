import { z } from 'zod';

export const inboundEmailSchema = z.object({
  account_id: z.string().uuid().optional(),
  from: z.string().min(1),
  subject: z.string().default(''),
  body: z.string().optional(),
  message_id: z.string().optional(),
});

export const createAccountSchema = z.object({
  address: z.string().email(),
  protocol: z.enum(['imap', 'pop3']).optional(),
  host: z.string().min(1),
  port: z.number().int().optional(),
  username: z.string().min(1),
  password: z.string().optional(),
  ssl: z.boolean().optional(),
  active: z.boolean().optional(),
  polling_interval_seconds: z.number().int().optional(),
  default_assignment_group_id: z.string().uuid().optional().nullable(),
});

export const createRuleSchema = z.object({
  email_account_id: z.string().uuid(),
  priority: z.number().int().optional(),
  conditions: z.record(z.any()).optional(),
  action: z.enum(['create_incident', 'create_request', 'add_comment', 'ignore']),
});
