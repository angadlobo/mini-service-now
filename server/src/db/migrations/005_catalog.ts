import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS request_number_seq START 1000");

  await knex.schema.createTable('sc_categories', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('name', 100).notNullable();
    t.text('description');
    t.string('icon', 50).defaultTo('IconFolder');
    t.integer('sort_order').defaultTo(0);
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sc_catalog_items', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('category_id').references('id').inTable('sc_categories');
    t.string('name', 200).notNullable();
    t.string('short_description', 500);
    t.text('description');
    t.string('icon', 50).defaultTo('IconBox');
    t.decimal('price', 10, 2).defaultTo(0);
    t.integer('delivery_days').defaultTo(3);
    t.boolean('approval_required').defaultTo(false);
    t.uuid('fulfillment_group_id').references('id').inTable('assignment_groups');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sc_item_variables', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.uuid('catalog_item_id').notNullable().references('id').inTable('sc_catalog_items').onDelete('CASCADE');
    t.string('name', 50).notNullable();
    t.string('label', 200).notNullable();
    t.string('type', 20).notNullable().defaultTo('text');
    t.boolean('required').defaultTo(false);
    t.integer('sort_order').defaultTo(0);
    t.jsonb('options');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('sc_requests', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('number', 20).notNullable().unique();
    t.uuid('catalog_item_id').notNullable().references('id').inTable('sc_catalog_items');
    t.uuid('requested_by').notNullable().references('id').inTable('users');
    t.string('state', 20).notNullable().defaultTo('pending');
    t.jsonb('variables').defaultTo('{}');
    t.timestamps(true, true);
    t.index('state');
    t.index('requested_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sc_requests');
  await knex.schema.dropTableIfExists('sc_item_variables');
  await knex.schema.dropTableIfExists('sc_catalog_items');
  await knex.schema.dropTableIfExists('sc_categories');
  await knex.raw("DROP SEQUENCE IF EXISTS request_number_seq");
}
