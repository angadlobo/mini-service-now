import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

// ── Asset Service ────────────────────────────────────

export class AssetService {
  async list(options: QueryOptions) {
    const query = db('assets')
      .select(
        'assets.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = assets.assigned_to) as assigned_to_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = assets.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'assets', {
      ...options,
      searchFields: ['number', 'name', 'serial_number', 'asset_tag'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const asset = await db('assets')
      .select(
        'assets.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = assets.assigned_to) as assigned_to_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = assets.created_by) as created_by_name"),
        db.raw("(SELECT name FROM asset_models WHERE asset_models.id = assets.model_id) as model_name"),
      )
      .where('assets.id', id)
      .orWhere('assets.number', id)
      .first();

    return asset;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('asset_number_seq') as seq")).rows[0];
    const number = `AST${String(seqResult.seq).padStart(7, '0')}`;

    const [asset] = await db('assets')
      .insert({
        number,
        name: data.name,
        type: data.type || 'hardware',
        status: data.status || 'in_stock',
        model: data.model || null,
        manufacturer: data.manufacturer || null,
        serial_number: data.serial_number || null,
        asset_tag: data.asset_tag || null,
        purchase_date: data.purchase_date || null,
        purchase_cost: data.purchase_cost || null,
        warranty_expiry: data.warranty_expiry || null,
        depreciation_method: data.depreciation_method || 'straight_line',
        salvage_value: data.salvage_value || null,
        location: data.location || null,
        department: data.department || null,
        description: data.description || null,
        assigned_to: data.assigned_to || null,
        ci_id: data.ci_id || null,
        model_id: data.model_id || null,
        parent_asset_id: data.parent_asset_id || null,
        created_by: userId,
      })
      .returning('*');

    // Add lifecycle event for procurement
    await db('asset_lifecycle_events').insert({
      asset_id: asset.id,
      event_type: 'procured',
      event_date: new Date().toISOString(),
      notes: 'Asset created',
      performed_by: userId,
    });

    eventBus.emitRecordCreated('assets', asset.id, asset, userId);
    return asset;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('assets').where('id', id).first();
    if (!existing) throw new AppError(404, 'Asset not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('assets').where('id', id).update(updateData).returning('*');

    // Audit
    const changes = diffRecords(existing, updateData);
    await recordAudit('assets', id, changes, userId);

    // If status changed, add lifecycle event
    if (data.status && data.status !== existing.status) {
      const statusToEvent: Record<string, string> = {
        in_use: 'deployed',
        in_repair: 'repaired',
        retired: 'retired',
        disposed: 'disposed',
      };
      const eventType = statusToEvent[data.status as string];
      if (eventType) {
        await db('asset_lifecycle_events').insert({
          asset_id: id,
          event_type: eventType,
          event_date: new Date().toISOString(),
          notes: `Status changed from ${existing.status} to ${data.status}`,
          performed_by: userId,
        });
      }
      eventBus.emitStateChanged('assets', id, updated, userId, existing);
    } else {
      eventBus.emitRecordUpdated('assets', id, updated, userId, existing);
    }

    return updated;
  }

  // ── Lifecycle Events ──────────────────────────────

  async getLifecycleEvents(assetId: string) {
    return db('asset_lifecycle_events')
      .select(
        'asset_lifecycle_events.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = asset_lifecycle_events.performed_by) as performed_by_name"),
      )
      .where('asset_id', assetId)
      .orderBy('event_date', 'desc');
  }

  async addLifecycleEvent(assetId: string, data: Record<string, unknown>, userId: string) {
    const asset = await db('assets').where('id', assetId).first();
    if (!asset) throw new AppError(404, 'Asset not found');

    const [event] = await db('asset_lifecycle_events')
      .insert({
        asset_id: assetId,
        event_type: data.event_type,
        event_date: data.event_date || new Date().toISOString(),
        notes: data.notes || null,
        performed_by: userId,
      })
      .returning('*');

    return event;
  }

  // ── Installations ─────────────────────────────────

  async getInstallations(assetId: string) {
    return db('software_installations')
      .select(
        'software_installations.*',
        db.raw("(SELECT product_name FROM software_licenses WHERE software_licenses.id = software_installations.license_id) as product_name"),
        db.raw("(SELECT number FROM software_licenses WHERE software_licenses.id = software_installations.license_id) as license_number"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = software_installations.installed_by) as installed_by_name"),
      )
      .where('asset_id', assetId)
      .orderBy('installed_date', 'desc');
  }

  async addInstallation(assetId: string, data: Record<string, unknown>, userId: string) {
    const asset = await db('assets').where('id', assetId).first();
    if (!asset) throw new AppError(404, 'Asset not found');

    const license = await db('software_licenses').where('id', String(data.license_id)).first();
    if (!license) throw new AppError(404, 'License not found');

    // Check entitlement
    if (license.allocated_count >= license.total_entitlements) {
      throw new AppError(400, 'No available entitlements for this license');
    }

    const [installation] = await db('software_installations')
      .insert({
        license_id: data.license_id,
        asset_id: assetId,
        ci_id: data.ci_id || null,
        installed_date: data.installed_date || new Date().toISOString(),
        version: data.version || null,
        installed_by: userId,
      })
      .returning('*');

    // Increment allocated count and update compliance
    const newCount = license.allocated_count + 1;
    const complianceStatus = newCount > license.total_entitlements ? 'under_licensed'
      : newCount < license.total_entitlements ? 'over_licensed'
      : 'compliant';

    await db('software_licenses').where('id', String(data.license_id)).update({
      allocated_count: newCount,
      compliance_status: complianceStatus,
    });

    return installation;
  }

  async removeInstallation(assetId: string, installationId: string) {
    const installation = await db('software_installations')
      .where({ id: installationId, asset_id: assetId })
      .first();
    if (!installation) throw new AppError(404, 'Installation not found');

    await db('software_installations').where('id', installationId).del();

    // Decrement allocated count and update compliance
    const license = await db('software_licenses').where('id', installation.license_id).first();
    if (license) {
      const newCount = Math.max(0, license.allocated_count - 1);
      const complianceStatus = newCount > license.total_entitlements ? 'under_licensed'
        : newCount < license.total_entitlements ? 'over_licensed'
        : 'compliant';

      await db('software_licenses').where('id', installation.license_id).update({
        allocated_count: newCount,
        compliance_status: complianceStatus,
      });
    }

    return { message: 'Installation removed' };
  }

  // ── Models ────────────────────────────────────────

  async listModels() {
    return db('asset_models').orderBy('name', 'asc');
  }
}

// ── License Service ──────────────────────────────────

export class LicenseService {
  async list(options: QueryOptions) {
    const query = db('software_licenses')
      .select('software_licenses.*');

    const { dataQuery, countQuery } = applyQueryOptions(query, 'software_licenses', {
      ...options,
      searchFields: ['number', 'product_name'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const license = await db('software_licenses')
      .select(
        'software_licenses.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = software_licenses.created_by) as created_by_name"),
      )
      .where('software_licenses.id', id)
      .orWhere('software_licenses.number', id)
      .first();

    return license;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('license_number_seq') as seq")).rows[0];
    const number = `LIC${String(seqResult.seq).padStart(7, '0')}`;

    const [license] = await db('software_licenses')
      .insert({
        number,
        product_name: data.product_name,
        license_type: data.license_type || 'per_seat',
        total_entitlements: data.total_entitlements || 1,
        allocated_count: 0,
        cost_per_unit: data.cost_per_unit || null,
        start_date: data.start_date || null,
        expiry_date: data.expiry_date || null,
        vendor_id: data.vendor_id || null,
        compliance_status: 'compliant',
        description: data.description || null,
        license_key: data.license_key || null,
        created_by: userId,
      })
      .returning('*');

    eventBus.emitRecordCreated('software_licenses', license.id, license, userId);
    return license;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('software_licenses').where('id', id).first();
    if (!existing) throw new AppError(404, 'License not found');

    const updateData = { ...data, updated_at: new Date() };

    // Recalculate compliance if entitlements changed
    if (data.total_entitlements) {
      const total = Number(data.total_entitlements);
      if (existing.allocated_count > total) {
        (updateData as any).compliance_status = 'under_licensed';
      } else if (existing.allocated_count < total) {
        (updateData as any).compliance_status = 'over_licensed';
      } else {
        (updateData as any).compliance_status = 'compliant';
      }
    }

    const [updated] = await db('software_licenses').where('id', id).update(updateData).returning('*');

    // Audit
    const changes = diffRecords(existing, updateData);
    await recordAudit('software_licenses', id, changes, userId);

    eventBus.emitRecordUpdated('software_licenses', id, updated, userId, existing);
    return updated;
  }
}

export const assetService = new AssetService();
export const licenseService = new LicenseService();
