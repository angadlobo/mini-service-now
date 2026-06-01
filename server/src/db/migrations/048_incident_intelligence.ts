import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Store similarity relationships between incidents
  await knex.schema.createTable('incident_similarity', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('incident_id').notNullable();
    t.uuid('similar_incident_id').notNullable();
    t.decimal('similarity_score', 5, 3).notNullable(); // 0.0-1.0
    t.text('reason').nullable(); // Why they're similar
    t.timestamps(true, true);
    t.foreign('incident_id').references('incidents.id').onDelete('CASCADE');
    t.foreign('similar_incident_id').references('incidents.id').onDelete('CASCADE');
    t.unique(['incident_id', 'similar_incident_id']);
    t.index('incident_id');
  });

  // Store solution history (resolved incidents with their solutions)
  await knex.schema.createTable('incident_solutions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('incident_id').notNullable();
    t.text('description').notNullable(); // incident short_description
    t.text('root_cause').nullable();
    t.text('resolution_notes').nullable();
    t.integer('resolution_time_minutes').nullable();
    t.jsonb('tags').defaultTo('[]'); // keywords for matching
    t.integer('application_count').defaultTo(0); // how many times this solution was used successfully
    t.integer('success_rate').defaultTo(0); // percentage success when applied
    t.timestamps(true, true);
    t.foreign('incident_id').references('incidents.id').onDelete('CASCADE');
    t.index('tags', 'gin');
  });

  // Store SLA risk predictions
  await knex.schema.createTable('sla_predictions', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.uuid('incident_id').notNullable();
    t.decimal('breach_probability', 5, 3).notNullable(); // 0.0-1.0
    t.string('risk_level', 20).notNullable(); // 'red', 'yellow', 'green'
    t.text('risk_reasons').nullable(); // JSON array of why it's at risk
    t.text('recommendations').nullable(); // JSON array of suggested actions
    t.timestamp('escalated_at').nullable();
    t.boolean('auto_escalated').defaultTo(false);
    t.timestamps(true, true);
    t.foreign('incident_id').references('incidents.id').onDelete('CASCADE');
    t.index('incident_id');
    t.index('risk_level');
  });

  // Store root cause patterns
  await knex.schema.createTable('root_cause_patterns', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('pattern_name', 255).notNullable();
    t.jsonb('keywords').notNullable().defaultTo('[]'); // JSON array of keywords that trigger this pattern
    t.text('root_cause').notNullable();
    t.text('suggested_resolution').nullable();
    t.integer('occurrence_count').defaultTo(0);
    t.decimal('confidence', 5, 3).defaultTo(0); // 0.0-1.0
    t.timestamps(true, true);
    t.unique('pattern_name');
  });

  // Add AI intelligence columns to incidents table
  await knex.schema.alterTable('incidents', (t) => {
    t.text('ai_similar_incidents').nullable(); // JSON array of {id, similarity_score}
    t.text('ai_root_cause_suggestions').nullable(); // JSON array of suggestions
    t.text('ai_resolution_suggestions').nullable(); // JSON array of past solutions
    t.string('ai_sla_risk', 20).nullable(); // 'red', 'yellow', 'green'
    t.integer('ai_last_analyzed_at').nullable(); // timestamp to avoid re-analyzing
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('incidents', (t) => {
    t.dropColumn('ai_similar_incidents');
    t.dropColumn('ai_root_cause_suggestions');
    t.dropColumn('ai_resolution_suggestions');
    t.dropColumn('ai_sla_risk');
    t.dropColumn('ai_last_analyzed_at');
  });

  await knex.schema.dropTable('root_cause_patterns');
  await knex.schema.dropTable('sla_predictions');
  await knex.schema.dropTable('incident_solutions');
  await knex.schema.dropTable('incident_similarity');
}
