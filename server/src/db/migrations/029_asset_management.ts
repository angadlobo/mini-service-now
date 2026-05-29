import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Auto-increment sequences for asset and license numbers
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS asset_number_seq START WITH 1 INCREMENT BY 1");
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS license_number_seq START WITH 1 INCREMENT BY 1");

  // Asset models / catalog
  await knex.schema.createTable('asset_models', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.string('manufacturer', 200).notNullable();
    t.string('model_number', 100).notNullable();
    t.string('category', 50).notNullable().defaultTo('hardware');
    t.text('description');
    t.date('end_of_life');
    t.date('end_of_sale');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // Assets
  await knex.schema.createTable('assets', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.string('type', 30).notNullable().defaultTo('hardware');
    t.string('status', 30).notNullable().defaultTo('in_stock');
    t.string('model', 200);
    t.string('manufacturer', 200);
    t.string('serial_number', 200);
    t.string('asset_tag', 100);
    t.date('purchase_date');
    t.decimal('purchase_cost', 12, 2);
    t.date('warranty_expiry');
    t.string('depreciation_method', 30).defaultTo('straight_line');
    t.decimal('salvage_value', 12, 2);
    t.string('location', 200);
    t.string('department', 200);
    t.text('description');
    t.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('ci_id').references('id').inTable('cis').onDelete('SET NULL');
    t.uuid('model_id').references('id').inTable('asset_models').onDelete('SET NULL');
    t.uuid('parent_asset_id').references('id').inTable('assets').onDelete('SET NULL');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Software licenses
  await knex.schema.createTable('software_licenses', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('product_name', 200).notNullable();
    t.string('license_type', 30).notNullable().defaultTo('per_seat');
    t.integer('total_entitlements').notNullable().defaultTo(1);
    t.integer('allocated_count').notNullable().defaultTo(0);
    t.decimal('cost_per_unit', 12, 2);
    t.date('start_date');
    t.date('expiry_date');
    t.uuid('vendor_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('compliance_status', 30).notNullable().defaultTo('compliant');
    t.text('description');
    t.string('license_key', 500);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Software installations (join between licenses, assets, and CIs)
  await knex.schema.createTable('software_installations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('license_id').notNullable().references('id').inTable('software_licenses').onDelete('CASCADE');
    t.uuid('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    t.uuid('ci_id').references('id').inTable('cis').onDelete('SET NULL');
    t.date('installed_date');
    t.string('version', 100);
    t.uuid('installed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  // Asset lifecycle events
  await knex.schema.createTable('asset_lifecycle_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('asset_id').notNullable().references('id').inTable('assets').onDelete('CASCADE');
    t.string('event_type', 30).notNullable();
    t.timestamp('event_date').notNullable().defaultTo(knex.fn.now());
    t.text('notes');
    t.uuid('performed_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('asset_lifecycle_events');
  await knex.schema.dropTableIfExists('software_installations');
  await knex.schema.dropTableIfExists('software_licenses');
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('asset_models');
  await knex.raw("DROP SEQUENCE IF EXISTS asset_number_seq");
  await knex.raw("DROP SEQUENCE IF EXISTS license_number_seq");
}
