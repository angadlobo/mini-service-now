import { z } from 'zod';

export const createRequestSchema = z.object({
  catalog_item_id: z.string().uuid(),
  variables: z.record(z.unknown()).optional(),
});

export const createCatalogItemSchema = z.object({
  category_id: z.string().uuid().optional(),
  name: z.string().min(1).max(200),
  short_description: z.string().max(500).optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  price: z.number().min(0).optional(),
  delivery_days: z.number().int().min(0).optional(),
  approval_required: z.boolean().optional(),
  fulfillment_group_id: z.string().uuid().optional().nullable(),
});
