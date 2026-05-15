import { z } from 'zod';

export const createArticleSchema = z.object({
  title: z.string().min(1).max(300),
  body: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  body: z.string().optional(),
  category_id: z.string().uuid().optional().nullable(),
  state: z.enum(['draft', 'review', 'published', 'retired']).optional(),
});
