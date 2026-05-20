import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_dashboards', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.unique(['user_id']);
    t.jsonb('layout').notNullable().defaultTo('[]');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_dashboards');
}
