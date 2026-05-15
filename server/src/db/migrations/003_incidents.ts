import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS incident_number_seq START 1000");

  await knex.schema.createTable('incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('number', 20).notNullable().unique();
    t.string('short_description', 200).notNullable();
    t.text('description');
    t.string('state', 20).notNullable().defaultTo('new');
    t.integer('priority').notNullable().defaultTo(4);
    t.integer('urgency').notNullable().defaultTo(3);
    t.integer('impact').notNullable().defaultTo(3);
    t.uuid('caller_id').references('id').inTable('users');
    t.uuid('assigned_to').references('id').inTable('users');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups');
    t.timestamp('sla_due');
    t.timestamp('resolved_at');
    t.timestamp('closed_at');
    t.text('resolution_notes');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('state');
    t.index('priority');
    t.index('assigned_to');
    t.index('assignment_group_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('incidents');
  await knex.raw("DROP SEQUENCE IF EXISTS incident_number_seq");
}
