import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS incident_task_number_seq START WITH 1 INCREMENT BY 1");

  // ── Incident Tasks ──────────────────────────────────────
  await knex.schema.createTable('incident_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.uuid('incident_id').notNullable().references('id').inTable('incidents').onDelete('CASCADE');
    t.uuid('parent_task_id').references('id').inTable('incident_tasks');
    t.string('short_description', 200).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('pending');
    t.integer('priority').notNullable().defaultTo(3);
    t.uuid('assigned_to').references('id').inTable('users');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups');
    t.timestamp('planned_start');
    t.timestamp('planned_end');
    t.timestamp('actual_start');
    t.timestamp('actual_end');
    t.decimal('estimated_hours', 8, 2);
    t.decimal('actual_hours', 8, 2);
    t.integer('percent_complete').notNullable().defaultTo(0);
    t.integer('order_index').notNullable().defaultTo(0);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('incident_id');
    t.index('status');
    t.index('assigned_to');
    t.index('parent_task_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('incident_tasks');
  await knex.raw("DROP SEQUENCE IF EXISTS incident_task_number_seq");
}
