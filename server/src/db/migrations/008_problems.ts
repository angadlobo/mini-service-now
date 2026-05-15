import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS problem_number_seq START 1000");

  await knex.schema.createTable('problems', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number').unique().notNullable();
    t.string('short_description').notNullable();
    t.text('description');
    t.string('state').notNullable().defaultTo('new');
    t.integer('priority').defaultTo(4);
    t.text('root_cause');
    t.text('workaround');
    t.text('permanent_solution');
    t.uuid('assigned_to').references('id').inTable('users');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('problem_incidents', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('problem_id').notNullable().references('id').inTable('problems').onDelete('CASCADE');
    t.uuid('incident_id').notNullable().references('id').inTable('incidents').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['problem_id', 'incident_id']);
  });

  await knex.schema.createTable('problem_changes', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('problem_id').notNullable().references('id').inTable('problems').onDelete('CASCADE');
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['problem_id', 'change_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('problem_changes');
  await knex.schema.dropTableIfExists('problem_incidents');
  await knex.schema.dropTableIfExists('problems');
  await knex.raw("DROP SEQUENCE IF EXISTS problem_number_seq");
}
