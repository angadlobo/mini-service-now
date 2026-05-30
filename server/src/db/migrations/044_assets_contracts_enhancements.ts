import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ══════════════════════════════════════════════════════════
  // CMDB / Assets Enhancements
  // ══════════════════════════════════════════════════════════

  // Add new columns to cis (assets) table
  await knex.schema.table('cis', (t) => {
    // Basic asset information
    t.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    t.text('description');
    t.text('image_url');

    // Assignment & Ownership
    t.uuid('assigned_to_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('assigned_to_department');

    // License Information
    t.string('license_key');
    t.timestamp('license_expiration');
    t.integer('license_count').defaultTo(1);

    // Warranty & Maintenance
    t.timestamp('warranty_expiration');
    t.timestamp('purchase_date');
    t.string('warranty_provider');

    // Lifecycle & Depreciation
    t.string('depreciation_status').defaultTo('active'); // active, deprecating, deprecated, retired
    t.decimal('current_value', 12, 2);
    t.decimal('original_value', 12, 2);
    t.integer('depreciation_months');

    // Tagging & Classification
    t.jsonb('tags').defaultTo('[]'); // For quick categorization
    t.string('business_unit');
    t.string('cost_center');
    t.string('asset_category');

    // Image storage (required field for assets - for photos/pictures of the asset)
    t.text('image_path'); // Relative path to uploaded image (e.g., "/uploads/abc123-photo.jpg")
    t.string('image_name'); // Original filename for display

    // Tracking
    t.uuid('assigned_by_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('assigned_at');
    t.uuid('last_maintenance_by_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('last_maintenance_date');
  });

  // Create asset_maintenance_logs table
  await knex.schema.createTable('asset_maintenance_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.string('maintenance_type'); // preventive, corrective, upgrade, inspection
    t.text('description');
    t.date('maintenance_date').notNullable();
    t.uuid('performed_by_id').references('id').inTable('users').onDelete('SET NULL');
    t.decimal('cost', 10, 2);
    t.timestamp('next_scheduled_date');
    t.text('notes');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Create asset_licenses table for tracking licenses across assets
  await knex.schema.createTable('asset_licenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.uuid('contract_id').references('id').inTable('contracts').onDelete('SET NULL');
    t.string('license_key').notNullable();
    t.string('license_type'); // perpetual, subscription, trial, educational, volume
    t.integer('license_count').notNullable().defaultTo(1);
    t.timestamp('activation_date');
    t.timestamp('expiration_date');
    t.boolean('is_active').defaultTo(true);
    t.string('status'); // active, expiring_soon, expired, suspended
    t.decimal('license_cost', 10, 2);
    t.text('notes');
    // Optional image for license certificate/document
    t.text('image_path');
    t.string('image_name');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Create asset_allocations table (track asset assignment history)
  await knex.schema.createTable('asset_allocations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.uuid('user_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('department');
    t.timestamp('allocated_at').notNullable();
    t.timestamp('deallocated_at');
    t.string('allocation_reason'); // new_hire, transfer, replacement, return
    t.text('notes');
    t.uuid('allocated_by_id').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // ══════════════════════════════════════════════════════════
  // Contracts Enhancements
  // ══════════════════════════════════════════════════════════

  // Add new columns to contracts table
  await knex.schema.table('contracts', (t) => {
    // License information
    t.integer('license_count');
    t.string('license_type'); // perpetual, subscription, trial, educational, volume
    t.string('license_key');
    t.timestamp('license_expiration');

    // Contract details
    t.text('terms_and_conditions');
    t.text('scope_of_work');
    t.string('contract_document_url');

    // Renewal & Expiration
    t.timestamp('renewal_date');
    t.integer('renewal_reminder_days').defaultTo(30);

    // Service Level & Support
    t.string('sla_response_time');
    t.string('sla_resolution_time');
    t.text('support_hours');
    t.string('support_channels'); // phone, email, ticket, onsite

    // Compliance & Approvals
    t.string('compliance_status'); // compliant, non_compliant, pending_review
    t.uuid('primary_contact_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('secondary_contact_id').references('id').inTable('users').onDelete('SET NULL');

    // Financial
    t.decimal('discount_percentage', 5, 2);
    t.decimal('actual_cost', 12, 2);
    t.string('payment_method'); // credit_card, bank_transfer, check, purchase_order
    t.string('invoice_frequency'); // monthly, quarterly, annual, one_time

    // Tracking
    t.text('internal_notes');
    t.text('external_notes');
    t.boolean('is_critical').defaultTo(false);
  });

  // Create contract_linked_assets table (track which assets are covered by contracts/licenses)
  await knex.schema.createTable('contract_linked_assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('contract_id').notNullable().references('id').inTable('contracts').onDelete('CASCADE');
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.string('license_type'); // support, maintenance, licensing, warranty
    t.timestamp('coverage_start');
    t.timestamp('coverage_end');
    t.text('coverage_notes');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.unique(['contract_id', 'ci_id', 'license_type']);
  });

  // Create contract_renewals table (track renewal history)
  await knex.schema.createTable('contract_renewals', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('contract_id').notNullable().references('id').inTable('contracts').onDelete('CASCADE');
    t.uuid('previous_contract_id').references('id').inTable('contracts').onDelete('SET NULL');
    t.timestamp('renewal_date').notNullable();
    t.timestamp('next_renewal_date');
    t.decimal('renewed_value', 12, 2);
    t.string('renewal_status'); // pending, approved, executed, declined
    t.text('renewal_notes');
    t.uuid('approved_by_id').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('approval_date');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Create contract_milestones table (for project-based contracts)
  await knex.schema.createTable('contract_milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('contract_id').notNullable().references('id').inTable('contracts').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.timestamp('due_date').notNullable();
    t.timestamp('completed_date');
    t.string('status').defaultTo('pending'); // pending, in_progress, completed, overdue, cancelled
    t.decimal('payment_due', 12, 2);
    t.decimal('payment_received', 12, 2);
    t.text('deliverables');
    t.text('notes');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Create vendor_service_levels table
  await knex.schema.createTable('vendor_service_levels', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('CASCADE');
    t.string('service_name').notNullable();
    t.string('response_time_hours').notNullable();
    t.string('resolution_time_hours').notNullable();
    t.string('availability_percentage');
    t.text('included_services');
    t.text('excluded_services');
    t.text('notes');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse order
  await knex.schema.dropTableIfExists('vendor_service_levels');
  await knex.schema.dropTableIfExists('contract_milestones');
  await knex.schema.dropTableIfExists('contract_renewals');
  await knex.schema.dropTableIfExists('contract_linked_assets');
  await knex.schema.dropTableIfExists('asset_allocations');
  await knex.schema.dropTableIfExists('asset_licenses');
  await knex.schema.dropTableIfExists('asset_maintenance_logs');

  await knex.schema.table('contracts', (t) => {
    t.dropColumn('license_count');
    t.dropColumn('license_type');
    t.dropColumn('license_key');
    t.dropColumn('license_expiration');
    t.dropColumn('terms_and_conditions');
    t.dropColumn('scope_of_work');
    t.dropColumn('contract_document_url');
    t.dropColumn('renewal_date');
    t.dropColumn('renewal_reminder_days');
    t.dropColumn('sla_response_time');
    t.dropColumn('sla_resolution_time');
    t.dropColumn('support_hours');
    t.dropColumn('support_channels');
    t.dropColumn('compliance_status');
    t.dropColumn('primary_contact_id');
    t.dropColumn('secondary_contact_id');
    t.dropColumn('discount_percentage');
    t.dropColumn('actual_cost');
    t.dropColumn('payment_method');
    t.dropColumn('invoice_frequency');
    t.dropColumn('internal_notes');
    t.dropColumn('external_notes');
    t.dropColumn('is_critical');
  });

  await knex.schema.table('cis', (t) => {
    t.dropColumn('vendor_id');
    t.dropColumn('description');
    t.dropColumn('image_path');
    t.dropColumn('image_name');
    t.dropColumn('assigned_to_id');
    t.dropColumn('assigned_to_department');
    t.dropColumn('license_key');
    t.dropColumn('license_expiration');
    t.dropColumn('license_count');
    t.dropColumn('warranty_expiration');
    t.dropColumn('purchase_date');
    t.dropColumn('warranty_provider');
    t.dropColumn('depreciation_status');
    t.dropColumn('current_value');
    t.dropColumn('original_value');
    t.dropColumn('depreciation_months');
    t.dropColumn('tags');
    t.dropColumn('business_unit');
    t.dropColumn('cost_center');
    t.dropColumn('asset_category');
    t.dropColumn('assigned_by_id');
    t.dropColumn('assigned_at');
    t.dropColumn('last_maintenance_by_id');
    t.dropColumn('last_maintenance_date');
  });
}
