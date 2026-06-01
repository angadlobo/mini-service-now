import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Drop and recreate root_cause_patterns with correct schema
  await knex.schema.dropTableIfExists('root_cause_patterns');

  await knex.schema.createTable('root_cause_patterns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('pattern_name', 255).notNullable();
    t.jsonb('keywords').notNullable().defaultTo('[]');
    t.text('root_cause').notNullable();
    t.text('suggested_resolution').nullable();
    t.integer('occurrence_count').defaultTo(0);
    t.decimal('confidence', 5, 3).defaultTo(0);
    t.timestamps(true, true);
    t.unique('pattern_name');
  });

  // Create GIN index for JSONB search
  await knex.raw('CREATE INDEX root_cause_patterns_keywords_gin ON root_cause_patterns USING gin(keywords)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('root_cause_patterns');
}
