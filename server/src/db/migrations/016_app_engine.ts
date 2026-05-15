import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // App definitions
  await knex.schema.createTable('app_engine_apps', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.string('slug').notNullable().unique();
    t.text('description');
    t.string('icon').defaultTo('IconApps');
    t.string('color').defaultTo('blue');
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Custom table definitions (metadata)
  await knex.schema.createTable('app_engine_tables', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('app_id').references('id').inTable('app_engine_apps').onDelete('CASCADE');
    t.string('name').notNullable().unique(); // e.g. x_asset_tracker_assets
    t.string('label').notNullable();
    t.string('number_prefix').notNullable();
    t.jsonb('columns').notNullable().defaultTo('[]');
    t.jsonb('states'); // StateConfig | null
    t.string('icon').defaultTo('IconTable');
    t.boolean('active').defaultTo(true);
    t.boolean('db_table_created').defaultTo(false);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Page definitions for custom tables
  await knex.schema.createTable('app_engine_pages', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('app_id').notNullable().references('id').inTable('app_engine_apps').onDelete('CASCADE');
    t.uuid('table_id').references('id').inTable('app_engine_tables').onDelete('SET NULL');
    t.string('title').notNullable();
    t.string('type').notNullable().defaultTo('list'); // list | form | dashboard
    t.jsonb('config').notNullable().defaultTo('{}');
    t.integer('sort_order').defaultTo(0);
    t.timestamps(true, true);
  });

  // Dashboard definitions
  await knex.schema.createTable('app_engine_dashboards', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('app_id').references('id').inTable('app_engine_apps').onDelete('CASCADE');
    t.string('name').notNullable();
    t.text('description');
    t.jsonb('layout').notNullable().defaultTo('[]');
    t.boolean('is_default').defaultTo(false);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  // Generic number sequences for custom tables
  await knex.schema.createTable('app_engine_sequences', (t) => {
    t.string('table_name').primary();
    t.bigInteger('current_value').defaultTo(0);
  });

  // Add flow_layout to workflow_rules for visual builder
  await knex.schema.alterTable('workflow_rules', (t) => {
    t.jsonb('flow_layout');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('workflow_rules', (t) => {
    t.dropColumn('flow_layout');
  });
  await knex.schema.dropTableIfExists('app_engine_sequences');
  await knex.schema.dropTableIfExists('app_engine_dashboards');
  await knex.schema.dropTableIfExists('app_engine_pages');
  await knex.schema.dropTableIfExists('app_engine_tables');
  await knex.schema.dropTableIfExists('app_engine_apps');
}
