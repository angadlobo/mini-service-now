import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('saved_views', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('table_name', 50).notNullable();
    t.string('name', 100).notNullable();
    t.boolean('is_default').defaultTo(false);
    t.jsonb('filters').defaultTo('{}');
    t.jsonb('columns').defaultTo('[]');
    t.string('sort_by', 50);
    t.string('sort_order', 4).defaultTo('desc');
    t.boolean('is_shared').defaultTo(false);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('saved_views');
}
