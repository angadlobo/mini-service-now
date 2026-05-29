import { z } from 'zod';

export const createSurveySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(10000).optional(),
  type: z.enum(['satisfaction', 'feedback', 'assessment']).optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  trigger_table: z.string().max(50).optional().nullable(),
  trigger_state: z.string().max(30).optional().nullable(),
  anonymous: z.boolean().optional(),
});

export const updateSurveySchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(10000).optional(),
  type: z.enum(['satisfaction', 'feedback', 'assessment']).optional(),
  status: z.enum(['draft', 'active', 'closed']).optional(),
  trigger_table: z.string().max(50).optional().nullable(),
  trigger_state: z.string().max(30).optional().nullable(),
  anonymous: z.boolean().optional(),
});

export const createQuestionSchema = z.object({
  question_text: z.string().min(1),
  type: z.enum(['rating_1_5', 'rating_1_10', 'yes_no', 'text', 'multiple_choice', 'nps']),
  options: z.array(z.string()).optional().nullable(),
  required: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const updateQuestionSchema = z.object({
  question_text: z.string().min(1).optional(),
  type: z.enum(['rating_1_5', 'rating_1_10', 'yes_no', 'text', 'multiple_choice', 'nps']).optional(),
  options: z.array(z.string()).optional().nullable(),
  required: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
});

export const submitResponseSchema = z.object({
  answers: z.array(z.object({
    question_id: z.string().uuid(),
    answer_value: z.string().max(500).optional().nullable(),
    answer_text: z.string().optional().nullable(),
  })).min(1),
  table_name: z.string().max(50).optional().nullable(),
  record_id: z.string().uuid().optional().nullable(),
});
