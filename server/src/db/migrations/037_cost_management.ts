import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS cost_item_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('cost_centers', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('code', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.string('department', 100);
    t.uuid('manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.decimal('budget_annual', 14, 2).notNullable().defaultTo(0);
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index('code');
    t.index('active');
  });

  await knex.schema.createTable('cost_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.uuid('cost_center_id').notNullable().references('id').inTable('cost_centers').onDelete('CASCADE');
    t.string('category', 30).notNullable();
    t.text('description').notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.string('currency', 3).notNullable().defaultTo('USD');
    t.date('date').notNullable();
    t.boolean('recurring').notNullable().defaultTo(false);
    t.string('frequency', 20);
    t.uuid('asset_id');
    t.uuid('contract_id');
    t.uuid('project_id');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('cost_center_id');
    t.index('category');
    t.index('date');
  });

  await knex.schema.createTable('chargeback_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.string('source_type', 30).notNullable();
    t.string('allocation_method', 20).notNullable();
    t.decimal('rate', 12, 4).notNullable().defaultTo(0);
    t.string('unit', 50);
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index('active');
  });

  await knex.schema.createTable('chargeback_records', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('rule_id').references('id').inTable('chargeback_rules').onDelete('SET NULL');
    t.uuid('cost_center_id').notNullable().references('id').inTable('cost_centers').onDelete('CASCADE');
    t.string('period', 20).notNullable();
    t.decimal('amount', 12, 2).notNullable();
    t.jsonb('details');
    t.timestamp('created_at').defaultTo(knex.fn.now());
    t.index('cost_center_id');
    t.index('period');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chargeback_records');
  await knex.schema.dropTableIfExists('chargeback_rules');
  await knex.schema.dropTableIfExists('cost_items');
  await knex.schema.dropTableIfExists('cost_centers');
  await knex.raw("DROP SEQUENCE IF EXISTS cost_item_number_seq");
}
