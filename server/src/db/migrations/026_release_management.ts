import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Auto-increment sequence for release numbers
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS release_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('releases', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('short_description', 200).notNullable();
    t.text('description');
    t.string('state', 30).notNullable().defaultTo('planning');
    t.string('release_type', 20).notNullable().defaultTo('minor');
    t.integer('priority').notNullable().defaultTo(4);
    t.string('risk', 20).defaultTo('moderate');
    t.string('impact', 20).defaultTo('moderate');
    t.integer('risk_score').defaultTo(0);
    t.timestamp('scheduled_start');
    t.timestamp('scheduled_end');
    t.timestamp('actual_start');
    t.timestamp('actual_end');
    t.text('implementation_plan');
    t.text('test_plan');
    t.text('rollback_plan');
    t.text('communication_plan');
    t.string('deployed_version', 100);
    t.string('previous_version', 100);
    t.string('build_number', 100);
    t.uuid('release_manager_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('release_changes', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('release_id').notNullable().references('id').inTable('releases').onDelete('CASCADE');
    t.uuid('change_id').notNullable().references('id').inTable('changes').onDelete('CASCADE');
    t.integer('sequence_order').defaultTo(0);
    t.string('deployment_status', 30).defaultTo('pending');
    t.timestamps(true, true);
    t.unique(['release_id', 'change_id']);
  });

  await knex.schema.createTable('release_cis', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('release_id').notNullable().references('id').inTable('releases').onDelete('CASCADE');
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.timestamps(true, true);
    t.unique(['release_id', 'ci_id']);
  });

  await knex.schema.createTable('release_stakeholders', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('release_id').notNullable().references('id').inTable('releases').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role', 50).defaultTo('stakeholder');
    t.timestamps(true, true);
    t.unique(['release_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('release_stakeholders');
  await knex.schema.dropTableIfExists('release_cis');
  await knex.schema.dropTableIfExists('release_changes');
  await knex.schema.dropTableIfExists('releases');
  await knex.raw("DROP SEQUENCE IF EXISTS release_number_seq");
}
