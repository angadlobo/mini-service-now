import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS change_number_seq START 1000");

  await knex.schema.createTable('changes', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('uuid_generate_v4()'));
    t.string('number', 20).notNullable().unique();
    t.string('short_description', 200).notNullable();
    t.text('description');
    t.string('state', 20).notNullable().defaultTo('new');
    t.string('type', 20).notNullable().defaultTo('normal');
    t.string('risk', 20).notNullable().defaultTo('moderate');
    t.integer('priority').notNullable().defaultTo(4);
    t.uuid('assigned_to').references('id').inTable('users');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups');
    t.timestamp('planned_start');
    t.timestamp('planned_end');
    t.text('backout_plan');
    t.text('justification');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('state');
    t.index('assigned_to');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('changes');
  await knex.raw("DROP SEQUENCE IF EXISTS change_number_seq");
}
