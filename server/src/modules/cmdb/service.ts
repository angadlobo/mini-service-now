import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { validateStateTransition } from '../../core/state-machine';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

export class CmdbService {
  // CI Types
  async listTypes() {
    return db('ci_types').orderBy('name');
  }

  async createType(data: Record<string, unknown>) {
    const [type] = await db('ci_types').insert(data).returning('*');
    return type;
  }

  async updateType(id: string, data: Record<string, unknown>) {
    const [type] = await db('ci_types').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return type;
  }

  // CIs
  async listCis(options: QueryOptions) {
    const query = db('cis')
      .select(
        'cis.*',
        db.raw("(SELECT name FROM ci_types WHERE ci_types.id = cis.ci_type_id) as ci_type_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cis.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cis.assigned_to_id) as assigned_to_name"),
        db.raw("(SELECT name FROM vendors WHERE vendors.id = cis.vendor_id) as vendor_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'cis', {
      ...options,
      searchFields: ['number', 'name', 'serial_number', 'asset_category', 'tags'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getCiById(id: string) {
    const ci = await db('cis')
      .select(
        'cis.*',
        db.raw("(SELECT name FROM ci_types WHERE ci_types.id = cis.ci_type_id) as ci_type_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cis.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = cis.assigned_to_id) as assigned_to_name"),
        db.raw("(SELECT name FROM vendors WHERE vendors.id = cis.vendor_id) as vendor_name"),
      )
      .where('cis.id', id)
      .orWhere('cis.number', id)
      .first();

    if (!ci) return null;

    // Get related data
    const licenses = await db('asset_licenses').where('ci_id', ci.id).orderBy('expiration_date', 'desc');
    const maintenanceLogs = await db('asset_maintenance_logs').where('ci_id', ci.id).orderBy('maintenance_date', 'desc').limit(10);
    const allocationHistory = await db('asset_allocations')
      .select(
        'asset_allocations.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = asset_allocations.user_id) as user_name"),
      )
      .where('ci_id', ci.id)
      .orderBy('allocated_at', 'desc');

    return {
      ...ci,
      licenses,
      maintenanceLogs,
      allocationHistory,
    };
  }

  async createCi(data: Record<string, unknown>, userId: string) {
    const seqRaw = await db.raw("SELECT nextval('ci_number_seq') as seq");
    const seqResult = seqRaw.rows?.[0] || seqRaw[0];
    const number = `CI${seqResult.seq}`;

    const [ci] = await db('cis')
      .insert({
        number,
        ci_type_id: data.ci_type_id,
        name: data.name,
        description: data.description || null,
        serial_number: data.serial_number || null,
        status: 'inventory',
        owner_id: data.owner_id || null,
        assigned_to_id: data.assigned_to_id || null,
        assigned_to_department: data.assigned_to_department || null,
        assigned_by_id: userId,
        assigned_at: data.assigned_to_id ? new Date() : null,
        location: data.location || null,
        cost: data.cost || 0,
        original_value: data.original_value || data.cost || 0,
        current_value: data.current_value || data.cost || 0,
        vendor_id: data.vendor_id || null,
        license_key: data.license_key || null,
        license_expiration: data.license_expiration || null,
        license_count: data.license_count || 1,
        warranty_expiration: data.warranty_expiration || null,
        warranty_provider: data.warranty_provider || null,
        purchase_date: data.purchase_date || null,
        depreciation_status: data.depreciation_status || 'active',
        depreciation_months: data.depreciation_months || null,
        image_url: data.image_url || null,
        tags: JSON.stringify(data.tags || []),
        business_unit: data.business_unit || null,
        cost_center: data.cost_center || null,
        asset_category: data.asset_category || null,
        attributes: data.attributes || {},
        created_by: userId,
      })
      .returning('*');

    eventBus.emitRecordCreated('cis', ci.id, ci, userId);
    return ci;
  }

  async updateCi(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('cis').where('id', id).first();
    if (!existing) throw new AppError(404, 'CI not found');

    if (data.status && data.status !== existing.status) {
      validateStateTransition('cis', existing.status, data.status as string);
    }

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('cis').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('cis', id, changes, userId);

    eventBus.emitRecordUpdated('cis', id, updated, userId, existing);
    return updated;
  }

  // Relationships
  async getRelationships(ciId: string) {
    const outgoing = await db('ci_relationships')
      .join('cis', 'cis.id', 'ci_relationships.child_ci_id')
      .where('ci_relationships.parent_ci_id', ciId)
      .select('ci_relationships.*', 'cis.name as child_name', 'cis.number as child_number');

    const incoming = await db('ci_relationships')
      .join('cis', 'cis.id', 'ci_relationships.parent_ci_id')
      .where('ci_relationships.child_ci_id', ciId)
      .select('ci_relationships.*', 'cis.name as parent_name', 'cis.number as parent_number');

    return { outgoing, incoming };
  }

  async addRelationship(parentCiId: string, childCiId: string, type: string) {
    const [rel] = await db('ci_relationships')
      .insert({ parent_ci_id: parentCiId, child_ci_id: childCiId, type })
      .returning('*');
    return rel;
  }

  async removeRelationship(id: string) {
    await db('ci_relationships').where('id', id).del();
  }

  // Impact analysis - find all CIs affected by this CI (recursive downstream)
  async getImpactedCis(ciId: string) {
    const result = await db.raw(`
      WITH RECURSIVE impacted AS (
        SELECT child_ci_id as id, 1 as depth
        FROM ci_relationships WHERE parent_ci_id = ?
        UNION ALL
        SELECT cr.child_ci_id, impacted.depth + 1
        FROM ci_relationships cr
        INNER JOIN impacted ON cr.parent_ci_id = impacted.id
        WHERE impacted.depth < 10
      )
      SELECT DISTINCT cis.*, impacted.depth
      FROM impacted
      JOIN cis ON cis.id = impacted.id
      ORDER BY impacted.depth
    `, [ciId]);
    return result.rows || result;
  }

  // ══════════════════════════════════════════════════════════
  // Asset Maintenance Logs
  // ══════════════════════════════════════════════════════════

  async getMaintenanceLogs(ciId: string) {
    return db('asset_maintenance_logs')
      .select(
        'asset_maintenance_logs.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = asset_maintenance_logs.performed_by_id) as performed_by_name"),
      )
      .where('ci_id', ciId)
      .orderBy('maintenance_date', 'desc');
  }

  async addMaintenanceLog(ciId: string, data: Record<string, unknown>, userId: string) {
    const ci = await db('cis').where('id', ciId).first();
    if (!ci) throw new AppError(404, 'Asset not found');

    const [log] = await db('asset_maintenance_logs')
      .insert({
        ci_id: ciId,
        maintenance_type: data.maintenance_type,
        description: data.description,
        maintenance_date: data.maintenance_date,
        performed_by_id: data.performed_by_id || userId,
        cost: data.cost || null,
        next_scheduled_date: data.next_scheduled_date || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .returning('*');

    // Update asset's last maintenance tracking
    await db('cis').where('id', ciId).update({
      last_maintenance_date: data.maintenance_date,
      last_maintenance_by_id: data.performed_by_id || userId,
      updated_at: new Date(),
    });

    return log;
  }

  // ══════════════════════════════════════════════════════════
  // Asset Licenses
  // ══════════════════════════════════════════════════════════

  async getLicenses(ciId: string) {
    return db('asset_licenses')
      .where('ci_id', ciId)
      .orderBy('expiration_date', 'desc');
  }

  async addLicense(ciId: string, data: Record<string, unknown>, userId: string) {
    const ci = await db('cis').where('id', ciId).first();
    if (!ci) throw new AppError(404, 'Asset not found');

    const [license] = await db('asset_licenses')
      .insert({
        ci_id: ciId,
        contract_id: data.contract_id || null,
        license_key: data.license_key,
        license_type: data.license_type,
        license_count: data.license_count || 1,
        activation_date: data.activation_date || null,
        expiration_date: data.expiration_date || null,
        is_active: data.is_active !== false,
        status: data.status || 'active',
        license_cost: data.license_cost || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .returning('*');

    return license;
  }

  async removeLicense(licenseId: string) {
    await db('asset_licenses').where('id', licenseId).del();
  }

  // ══════════════════════════════════════════════════════════
  // Asset Allocation History
  // ══════════════════════════════════════════════════════════

  async getAllocationHistory(ciId: string) {
    return db('asset_allocations')
      .select(
        'asset_allocations.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = asset_allocations.user_id) as user_name"),
      )
      .where('ci_id', ciId)
      .orderBy('allocated_at', 'desc');
  }

  async allocateAsset(ciId: string, userId: string, data: Record<string, unknown>) {
    const ci = await db('cis').where('id', ciId).first();
    if (!ci) throw new AppError(404, 'Asset not found');

    // Deallocate previous allocation if exists
    const activeAllocation = await db('asset_allocations')
      .where({ ci_id: ciId })
      .whereNull('deallocated_at')
      .first();

    if (activeAllocation) {
      await db('asset_allocations')
        .where('id', activeAllocation.id)
        .update({
          deallocated_at: new Date(),
          updated_at: new Date(),
        });
    }

    // Create new allocation
    const [allocation] = await db('asset_allocations')
      .insert({
        ci_id: ciId,
        user_id: userId,
        department: data.department || null,
        allocated_at: new Date(),
        allocation_reason: data.allocation_reason || null,
        notes: data.notes || null,
        allocated_by_id: userId,
      })
      .returning('*');

    // Update CI assignment
    await db('cis').where('id', ciId).update({
      assigned_to_id: userId,
      assigned_to_department: data.department || null,
      assigned_by_id: userId,
      assigned_at: new Date(),
      updated_at: new Date(),
    });

    return allocation;
  }

  async deallocateAsset(ciId: string) {
    const allocation = await db('asset_allocations')
      .where({ ci_id: ciId })
      .whereNull('deallocated_at')
      .first();

    if (allocation) {
      await db('asset_allocations')
        .where('id', allocation.id)
        .update({
          deallocated_at: new Date(),
          updated_at: new Date(),
        });
    }

    // Clear CI assignment
    await db('cis').where('id', ciId).update({
      assigned_to_id: null,
      assigned_to_department: null,
      updated_at: new Date(),
    });
  }
}

export const cmdbService = new CmdbService();
