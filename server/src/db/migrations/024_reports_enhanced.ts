import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reports', (t) => {
    t.jsonb('config').defaultTo('{}'); // group_by, aggregate_function, aggregate_column, sort_by, sort_direction, row_limit
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('reports', (t) => {
    t.dropColumn('config');
  });
}
