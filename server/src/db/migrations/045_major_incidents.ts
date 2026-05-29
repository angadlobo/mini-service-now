import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw('CREATE SEQUENCE IF NOT EXISTS major_incident_number_seq START WITH 1 INCREMENT BY 1');

  await knex.schema.createTable('major_incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.uuid('incident_id').references('id').inTable('incidents').onDelete('SET NULL'); // trigger incident
    t.string('title', 255).notNullable();
    t.string('status', 30).notNullable().defaultTo('active'); // proposed|active|resolved|cancelled
    t.string('severity', 10).notNullable().defaultTo('sev1'); // sev1|sev2|sev3
    t.uuid('manager_id').references('id').inTable('users').onDelete('SET NULL'); // major incident manager
    t.text('business_impact');
    t.text('summary');
    t.string('war_room_url', 500);
    t.uuid('declared_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('declared_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('resolved_at');
    t.timestamps(true, true);
    t.index(['status']);
  });

  await knex.schema.createTable('major_incident_updates', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('major_incident_id').notNullable().references('id').inTable('major_incidents').onDelete('CASCADE');
    t.string('type', 20).notNullable().defaultTo('timeline'); // timeline|comms|status
    t.string('audience', 20).notNullable().defaultTo('internal'); // internal|stakeholders
    t.text('message').notNullable();
    t.uuid('posted_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    t.index(['major_incident_id', 'created_at']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('major_incident_updates');
  await knex.schema.dropTableIfExists('major_incidents');
  await knex.raw('DROP SEQUENCE IF EXISTS major_incident_number_seq');
}
