import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS vendor_number_seq START WITH 1 INCREMENT BY 1");
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS contract_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('vendors', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.string('type', 30).notNullable().defaultTo('service');
    t.string('status', 30).notNullable().defaultTo('active');
    t.string('contact_name', 200);
    t.string('email', 200);
    t.string('phone', 50);
    t.string('website', 500);
    t.text('address');
    t.integer('rating');
    t.text('notes');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('status');
    t.index('type');
  });

  await knex.schema.createTable('contracts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.uuid('vendor_id').references('id').inTable('vendors').onDelete('SET NULL');
    t.string('type', 30).notNullable().defaultTo('support');
    t.string('status', 30).notNullable().defaultTo('draft');
    t.string('short_description', 200).notNullable();
    t.date('start_date');
    t.date('end_date');
    t.decimal('value', 12, 2);
    t.string('currency', 10).notNullable().defaultTo('USD');
    t.boolean('auto_renew').notNullable().defaultTo(false);
    t.integer('renewal_period_days');
    t.string('payment_terms', 200);
    t.uuid('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.integer('notification_days_before_expiry');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('status');
    t.index('type');
    t.index('vendor_id');
    t.index('end_date');
  });

  await knex.schema.createTable('contract_line_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('contract_id').notNullable().references('id').inTable('contracts').onDelete('CASCADE');
    t.string('description', 500).notNullable();
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_cost', 12, 2).notNullable().defaultTo(0);
    t.decimal('total_cost', 12, 2).notNullable().defaultTo(0);
    t.string('item_type', 100);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('vendor_assessments', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('vendor_id').notNullable().references('id').inTable('vendors').onDelete('CASCADE');
    t.uuid('assessor_id').references('id').inTable('users').onDelete('SET NULL');
    t.date('date').notNullable();
    t.integer('score').notNullable();
    t.jsonb('criteria_scores');
    t.text('notes');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('vendor_assessments');
  await knex.schema.dropTableIfExists('contract_line_items');
  await knex.schema.dropTableIfExists('contracts');
  await knex.schema.dropTableIfExists('vendors');
  await knex.raw("DROP SEQUENCE IF EXISTS vendor_number_seq");
  await knex.raw("DROP SEQUENCE IF EXISTS contract_number_seq");
}
