import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('portal_announcements', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('title', 200).notNullable();
    t.text('body');
    t.string('type', 20).notNullable().defaultTo('info');
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamp('start_date');
    t.timestamp('end_date');
    t.integer('priority').notNullable().defaultTo(0);
    t.uuid('created_by').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('portal_quick_links', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('label', 100).notNullable();
    t.string('url', 500).notNullable();
    t.string('icon', 50);
    t.string('category', 50);
    t.integer('order_index').notNullable().defaultTo(0);
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('portal_themes', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 100).notNullable();
    t.string('primary_color', 20);
    t.string('logo_url', 500);
    t.string('banner_url', 500);
    t.text('custom_css');
    t.boolean('active').notNullable().defaultTo(false);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('portal_themes');
  await knex.schema.dropTableIfExists('portal_quick_links');
  await knex.schema.dropTableIfExists('portal_announcements');
}
