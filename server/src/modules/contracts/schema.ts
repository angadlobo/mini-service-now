import { z } from 'zod';

export const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['hardware', 'software', 'service', 'consulting']).optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
  contact_name: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  address: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateVendorSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['hardware', 'software', 'service', 'consulting']).optional(),
  status: z.enum(['active', 'inactive', 'blacklisted']).optional(),
  contact_name: z.string().max(200).optional().nullable(),
  email: z.string().email().max(200).optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  address: z.string().optional().nullable(),
  rating: z.number().int().min(1).max(5).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const createContractSchema = z.object({
  vendor_id: z.string().uuid().optional().nullable(),
  type: z.enum(['lease', 'maintenance', 'support', 'subscription', 'nda', 'msa']).optional(),
  short_description: z.string().min(1).max(200),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  value: z.number().min(0).optional().nullable(),
  currency: z.string().max(10).optional(),
  auto_renew: z.boolean().optional(),
  renewal_period_days: z.number().int().min(1).optional().nullable(),
  payment_terms: z.string().max(200).optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  notification_days_before_expiry: z.number().int().min(1).optional().nullable(),
});

export const updateContractSchema = z.object({
  vendor_id: z.string().uuid().optional().nullable(),
  type: z.enum(['lease', 'maintenance', 'support', 'subscription', 'nda', 'msa']).optional(),
  status: z.enum(['draft', 'active', 'expired', 'cancelled', 'renewed']).optional(),
  short_description: z.string().min(1).max(200).optional(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  value: z.number().min(0).optional().nullable(),
  currency: z.string().max(10).optional(),
  auto_renew: z.boolean().optional(),
  renewal_period_days: z.number().int().min(1).optional().nullable(),
  payment_terms: z.string().max(200).optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  notification_days_before_expiry: z.number().int().min(1).optional().nullable(),
});
