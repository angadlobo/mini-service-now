import { z } from 'zod';

export const createAssetSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['hardware', 'software', 'consumable']).optional(),
  status: z.enum(['on_order', 'in_stock', 'in_use', 'in_repair', 'retired', 'disposed']).optional(),
  model: z.string().max(200).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  serial_number: z.string().max(200).optional().nullable(),
  asset_tag: z.string().max(100).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_cost: z.number().optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  depreciation_method: z.enum(['straight_line', 'declining_balance', 'none']).optional(),
  salvage_value: z.number().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  ci_id: z.string().uuid().optional().nullable(),
  model_id: z.string().uuid().optional().nullable(),
  parent_asset_id: z.string().uuid().optional().nullable(),
});

export const updateAssetSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.enum(['hardware', 'software', 'consumable']).optional(),
  status: z.enum(['on_order', 'in_stock', 'in_use', 'in_repair', 'retired', 'disposed']).optional(),
  model: z.string().max(200).optional().nullable(),
  manufacturer: z.string().max(200).optional().nullable(),
  serial_number: z.string().max(200).optional().nullable(),
  asset_tag: z.string().max(100).optional().nullable(),
  purchase_date: z.string().optional().nullable(),
  purchase_cost: z.number().optional().nullable(),
  warranty_expiry: z.string().optional().nullable(),
  depreciation_method: z.enum(['straight_line', 'declining_balance', 'none']).optional(),
  salvage_value: z.number().optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  department: z.string().max(200).optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  assigned_to: z.string().uuid().optional().nullable(),
  ci_id: z.string().uuid().optional().nullable(),
  model_id: z.string().uuid().optional().nullable(),
  parent_asset_id: z.string().uuid().optional().nullable(),
});

export const createLicenseSchema = z.object({
  product_name: z.string().min(1).max(200),
  license_type: z.enum(['per_seat', 'per_device', 'site', 'enterprise', 'subscription']).optional(),
  total_entitlements: z.number().int().min(1).optional(),
  cost_per_unit: z.number().optional().nullable(),
  start_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  license_key: z.string().max(500).optional().nullable(),
});

export const updateLicenseSchema = z.object({
  product_name: z.string().min(1).max(200).optional(),
  license_type: z.enum(['per_seat', 'per_device', 'site', 'enterprise', 'subscription']).optional(),
  total_entitlements: z.number().int().min(1).optional(),
  cost_per_unit: z.number().optional().nullable(),
  start_date: z.string().optional().nullable(),
  expiry_date: z.string().optional().nullable(),
  vendor_id: z.string().uuid().optional().nullable(),
  compliance_status: z.enum(['compliant', 'over_licensed', 'under_licensed']).optional(),
  description: z.string().max(10000).optional().nullable(),
  license_key: z.string().max(500).optional().nullable(),
});

export const addLifecycleEventSchema = z.object({
  event_type: z.enum(['procured', 'deployed', 'transferred', 'repaired', 'retired', 'disposed']),
  event_date: z.string().optional(),
  notes: z.string().max(5000).optional().nullable(),
});

export const addInstallationSchema = z.object({
  license_id: z.string().uuid(),
  ci_id: z.string().uuid().optional().nullable(),
  installed_date: z.string().optional().nullable(),
  version: z.string().max(100).optional().nullable(),
});
