import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to surveys table
  await knex.schema.table('surveys', (t) => {
    t.boolean('is_active').notNullable().defaultTo(true);
    t.timestamp('active_from');
    t.timestamp('active_until');
  });

  // Create survey_shares table for tracking email shares
  await knex.schema.createTable('survey_shares', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('survey_id').notNullable().references('id').inTable('surveys').onDelete('CASCADE');
    t.integer('recipient_count').notNullable().defaultTo(1);
    t.timestamp('shared_at').notNullable().defaultTo(knex.fn.now());
    t.unique(['survey_id', 'shared_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('survey_shares');
  await knex.schema.table('surveys', (t) => {
    t.dropColumn('is_active');
    t.dropColumn('active_from');
    t.dropColumn('active_until');
  });
}
