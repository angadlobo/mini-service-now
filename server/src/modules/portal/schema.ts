import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().optional(),
  type: z.enum(['info', 'warning', 'critical', 'maintenance']).optional().default('info'),
  active: z.boolean().optional().default(true),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  priority: z.number().int().optional().default(0),
});

export const updateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().optional(),
  type: z.enum(['info', 'warning', 'critical', 'maintenance']).optional(),
  active: z.boolean().optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  priority: z.number().int().optional(),
});

export const createQuickLinkSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.string().min(1).max(500),
  icon: z.string().max(50).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  order_index: z.number().int().optional().default(0),
  active: z.boolean().optional().default(true),
});

export const updateQuickLinkSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  url: z.string().min(1).max(500).optional(),
  icon: z.string().max(50).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
  order_index: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const createThemeSchema = z.object({
  name: z.string().min(1).max(100),
  primary_color: z.string().max(20).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  banner_url: z.string().max(500).optional().nullable(),
  custom_css: z.string().optional().nullable(),
  active: z.boolean().optional().default(false),
});

export const updateThemeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  primary_color: z.string().max(20).optional().nullable(),
  logo_url: z.string().max(500).optional().nullable(),
  banner_url: z.string().max(500).optional().nullable(),
  custom_css: z.string().optional().nullable(),
  active: z.boolean().optional(),
});
