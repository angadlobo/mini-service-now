import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS event_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('alert_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.boolean('enabled').notNullable().defaultTo(true);
    t.string('source', 30).notNullable();
    t.jsonb('conditions').notNullable().defaultTo('{}');
    t.jsonb('actions').notNullable().defaultTo('{}');
    t.string('severity_override', 20);
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.integer('cooldown_minutes').notNullable().defaultTo(5);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('monitoring_events', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('source', 30).notNullable();
    t.string('severity', 20).notNullable().defaultTo('info');
    t.string('status', 20).notNullable().defaultTo('open');
    t.string('node', 200);
    t.string('type', 30);
    t.string('metric_name', 100);
    t.string('metric_value', 100);
    t.string('threshold', 100);
    t.string('message_key', 200);
    t.text('description');
    t.uuid('ci_id').references('id').inTable('cis').onDelete('SET NULL');
    t.uuid('alert_rule_id').references('id').inTable('alert_rules').onDelete('SET NULL');
    t.uuid('correlation_id');
    t.uuid('incident_id').references('id').inTable('incidents').onDelete('SET NULL');
    t.uuid('acknowledged_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('acknowledged_at');
    t.uuid('created_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('event_correlations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('parent_event_id').notNullable().references('id').inTable('monitoring_events').onDelete('CASCADE');
    t.uuid('child_event_id').notNullable().references('id').inTable('monitoring_events').onDelete('CASCADE');
    t.string('correlation_type', 30).notNullable().defaultTo('related');
    t.timestamps(true, true);
    t.unique(['parent_event_id', 'child_event_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('event_correlations');
  await knex.schema.dropTableIfExists('monitoring_events');
  await knex.schema.dropTableIfExists('alert_rules');
  await knex.raw("DROP SEQUENCE IF EXISTS event_number_seq");
}
