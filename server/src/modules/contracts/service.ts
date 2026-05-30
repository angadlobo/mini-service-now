import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { recordAudit, diffRecords } from '../../core/audit-trail';
import { eventBus } from '../../core/event-bus';
import { AppError } from '../../middleware/error';

// ══════════════════════════════════════════════════════════
// Vendor Service
// ══════════════════════════════════════════════════════════

export class VendorService {
  async list(options: QueryOptions) {
    const query = db('vendors')
      .select(
        'vendors.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = vendors.created_by) as created_by_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'vendors', {
      ...options,
      searchFields: ['number', 'name', 'contact_name', 'email'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const vendor = await db('vendors')
      .select(
        'vendors.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = vendors.created_by) as created_by_name"),
      )
      .where('vendors.id', id)
      .orWhere('vendors.number', id)
      .first();

    return vendor;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('vendor_number_seq') as seq")).rows[0];
    const number = `VND${String(seqResult.seq).padStart(4, '0')}`;

    const [vendor] = await db('vendors')
      .insert({
        number,
        name: data.name,
        type: data.type || 'service',
        status: data.status || 'active',
        contact_name: data.contact_name || null,
        email: data.email || null,
        phone: data.phone || null,
        website: data.website || null,
        address: data.address || null,
        rating: data.rating || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .returning('*');

    eventBus.emitRecordCreated('vendors', vendor.id, vendor, userId);
    return vendor;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('vendors').where('id', id).first();
    if (!existing) throw new AppError(404, 'Vendor not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('vendors').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('vendors', id, changes, userId);

    eventBus.emitRecordUpdated('vendors', id, updated, userId, existing);
    return updated;
  }

  async getAssessments(vendorId: string) {
    return db('vendor_assessments')
      .select(
        'vendor_assessments.*',
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = vendor_assessments.assessor_id) as assessor_name"),
      )
      .where('vendor_id', vendorId)
      .orderBy('date', 'desc');
  }

  async addAssessment(vendorId: string, data: Record<string, unknown>, userId: string) {
    const vendor = await db('vendors').where('id', vendorId).first();
    if (!vendor) throw new AppError(404, 'Vendor not found');

    const [assessment] = await db('vendor_assessments')
      .insert({
        vendor_id: vendorId,
        assessor_id: userId,
        date: data.date || new Date().toISOString().split('T')[0],
        score: data.score,
        criteria_scores: data.criteria_scores ? JSON.stringify(data.criteria_scores) : null,
        notes: data.notes || null,
      })
      .returning('*');

    return assessment;
  }
}

// ══════════════════════════════════════════════════════════
// Contract Service
// ══════════════════════════════════════════════════════════

export class ContractService {
  async list(options: QueryOptions) {
    const query = db('contracts')
      .select(
        'contracts.*',
        db.raw("(SELECT name FROM vendors WHERE vendors.id = contracts.vendor_id) as vendor_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = contracts.owner_id) as owner_name"),
      );

    const { dataQuery, countQuery } = applyQueryOptions(query, 'contracts', {
      ...options,
      searchFields: ['number', 'short_description'],
    });

    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    const contract = await db('contracts')
      .select(
        'contracts.*',
        db.raw("(SELECT name FROM vendors WHERE vendors.id = contracts.vendor_id) as vendor_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = contracts.owner_id) as owner_name"),
        db.raw("(SELECT CONCAT(first_name, ' ', last_name) FROM users WHERE users.id = contracts.created_by) as created_by_name"),
      )
      .where('contracts.id', id)
      .orWhere('contracts.number', id)
      .first();

    return contract;
  }

  async create(data: Record<string, unknown>, userId: string) {
    const seqResult = (await db.raw("SELECT nextval('contract_number_seq') as seq")).rows[0];
    const number = `CON${String(seqResult.seq).padStart(4, '0')}`;

    const [contract] = await db('contracts')
      .insert({
        number,
        vendor_id: data.vendor_id || null,
        type: data.type || 'support',
        status: 'draft',
        short_description: data.short_description,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        value: data.value || null,
        currency: data.currency || 'USD',
        auto_renew: data.auto_renew || false,
        renewal_period_days: data.renewal_period_days || null,
        renewal_date: data.renewal_date || null,
        renewal_reminder_days: data.renewal_reminder_days || 30,
        payment_terms: data.payment_terms || null,
        owner_id: data.owner_id || userId,
        notification_days_before_expiry: data.notification_days_before_expiry || null,
        // License fields
        license_count: data.license_count || null,
        license_type: data.license_type || null,
        license_key: data.license_key || null,
        license_expiration: data.license_expiration || null,
        // Contract details
        terms_and_conditions: data.terms_and_conditions || null,
        scope_of_work: data.scope_of_work || null,
        contract_document_url: data.contract_document_url || null,
        // SLA & Support
        sla_response_time: data.sla_response_time || null,
        sla_resolution_time: data.sla_resolution_time || null,
        support_hours: data.support_hours || null,
        support_channels: data.support_channels || null,
        // Contacts
        primary_contact_id: data.primary_contact_id || null,
        secondary_contact_id: data.secondary_contact_id || null,
        // Financial
        discount_percentage: data.discount_percentage || null,
        actual_cost: data.actual_cost || data.value || null,
        payment_method: data.payment_method || null,
        invoice_frequency: data.invoice_frequency || null,
        // Compliance
        compliance_status: data.compliance_status || 'pending_review',
        is_critical: data.is_critical || false,
        // Notes
        internal_notes: data.internal_notes || null,
        external_notes: data.external_notes || null,
        created_by: userId,
      })
      .returning('*');

    eventBus.emitRecordCreated('contracts', contract.id, contract, userId);
    return contract;
  }

  async update(id: string, data: Record<string, unknown>, userId: string) {
    const existing = await db('contracts').where('id', id).first();
    if (!existing) throw new AppError(404, 'Contract not found');

    const updateData = { ...data, updated_at: new Date() };
    const [updated] = await db('contracts').where('id', id).update(updateData).returning('*');

    const changes = diffRecords(existing, updateData);
    await recordAudit('contracts', id, changes, userId);

    eventBus.emitRecordUpdated('contracts', id, updated, userId, existing);
    return updated;
  }

  async getLineItems(contractId: string) {
    return db('contract_line_items')
      .where('contract_id', contractId)
      .orderBy('created_at', 'asc');
  }

  async addLineItem(contractId: string, data: Record<string, unknown>) {
    const contract = await db('contracts').where('id', contractId).first();
    if (!contract) throw new AppError(404, 'Contract not found');

    const quantity = Number(data.quantity) || 1;
    const unitCost = Number(data.unit_cost) || 0;
    const totalCost = quantity * unitCost;

    const [item] = await db('contract_line_items')
      .insert({
        contract_id: contractId,
        description: data.description,
        quantity,
        unit_cost: unitCost,
        total_cost: totalCost,
        item_type: data.item_type || null,
      })
      .returning('*');

    return item;
  }

  async removeLineItem(contractId: string, lineItemId: string) {
    const item = await db('contract_line_items')
      .where({ id: lineItemId, contract_id: contractId })
      .first();
    if (!item) throw new AppError(404, 'Line item not found');

    await db('contract_line_items').where('id', lineItemId).del();
  }

  // ══════════════════════════════════════════════════════════
  // Contract Linked Assets (which assets are covered by contract)
  // ══════════════════════════════════════════════════════════

  async getLinkedAssets(contractId: string) {
    return db('contract_linked_assets')
      .join('cis', 'cis.id', 'contract_linked_assets.ci_id')
      .where('contract_linked_assets.contract_id', contractId)
      .select('contract_linked_assets.*', 'cis.number as ci_number', 'cis.name as ci_name');
  }

  async linkAsset(contractId: string, ciId: string, data: Record<string, unknown>) {
    const contract = await db('contracts').where('id', contractId).first();
    if (!contract) throw new AppError(404, 'Contract not found');

    const ci = await db('cis').where('id', ciId).first();
    if (!ci) throw new AppError(404, 'Asset not found');

    const [link] = await db('contract_linked_assets')
      .insert({
        contract_id: contractId,
        ci_id: ciId,
        license_type: data.license_type || 'support',
        coverage_start: data.coverage_start || null,
        coverage_end: data.coverage_end || null,
        coverage_notes: data.coverage_notes || null,
        created_by: data.created_by,
      })
      .returning('*');

    return link;
  }

  async unlinkAsset(linkId: string) {
    await db('contract_linked_assets').where('id', linkId).del();
  }

  // ══════════════════════════════════════════════════════════
  // Contract Renewals
  // ══════════════════════════════════════════════════════════

  async getRenewals(contractId: string) {
    return db('contract_renewals')
      .where('contract_id', contractId)
      .orderBy('renewal_date', 'desc');
  }

  async addRenewal(contractId: string, data: Record<string, unknown>, userId: string) {
    const contract = await db('contracts').where('id', contractId).first();
    if (!contract) throw new AppError(404, 'Contract not found');

    const [renewal] = await db('contract_renewals')
      .insert({
        contract_id: contractId,
        previous_contract_id: data.previous_contract_id || null,
        renewal_date: data.renewal_date,
        next_renewal_date: data.next_renewal_date || null,
        renewed_value: data.renewed_value || null,
        renewal_status: data.renewal_status || 'pending',
        renewal_notes: data.renewal_notes || null,
        approved_by_id: data.approved_by_id || null,
        approval_date: data.approved_by_id ? new Date() : null,
        created_by: userId,
      })
      .returning('*');

    return renewal;
  }

  // ══════════════════════════════════════════════════════════
  // Contract Milestones (for project-based contracts)
  // ══════════════════════════════════════════════════════════

  async getMilestones(contractId: string) {
    return db('contract_milestones')
      .where('contract_id', contractId)
      .orderBy('due_date', 'asc');
  }

  async addMilestone(contractId: string, data: Record<string, unknown>, userId: string) {
    const contract = await db('contracts').where('id', contractId).first();
    if (!contract) throw new AppError(404, 'Contract not found');

    const [milestone] = await db('contract_milestones')
      .insert({
        contract_id: contractId,
        name: data.name,
        description: data.description || null,
        due_date: data.due_date,
        completed_date: data.completed_date || null,
        status: data.status || 'pending',
        payment_due: data.payment_due || null,
        payment_received: data.payment_received || null,
        deliverables: data.deliverables || null,
        notes: data.notes || null,
        created_by: userId,
      })
      .returning('*');

    return milestone;
  }

  async updateMilestone(milestoneId: string, data: Record<string, unknown>) {
    const milestone = await db('contract_milestones').where('id', milestoneId).first();
    if (!milestone) throw new AppError(404, 'Milestone not found');

    const [updated] = await db('contract_milestones')
      .where('id', milestoneId)
      .update({ ...data, updated_at: new Date() })
      .returning('*');

    return updated;
  }
}

export const vendorService = new VendorService();
export const contractService = new ContractService();
