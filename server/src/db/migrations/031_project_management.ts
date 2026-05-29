import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS project_number_seq START WITH 1 INCREMENT BY 1");
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS project_task_number_seq START WITH 1 INCREMENT BY 1");

  // ── Projects ─────────────────────────────────────────
  await knex.schema.createTable('projects', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('planning');
    t.integer('priority').notNullable().defaultTo(3);
    t.string('type', 20).notNullable().defaultTo('waterfall');
    t.date('start_date');
    t.date('end_date');
    t.date('actual_start');
    t.date('actual_end');
    t.decimal('budget', 12, 2);
    t.decimal('actual_cost', 12, 2);
    t.uuid('owner_id').references('id').inTable('users');
    t.string('portfolio', 100);
    t.integer('percent_complete').notNullable().defaultTo(0);
    t.string('phase', 20).notNullable().defaultTo('initiation');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('status');
    t.index('priority');
    t.index('owner_id');
    t.index('type');
  });

  // ── Project Tasks ────────────────────────────────────
  await knex.schema.createTable('project_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('parent_task_id').references('id').inTable('project_tasks');
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
    t.index('project_id');
    t.index('status');
    t.index('assigned_to');
    t.index('parent_task_id');
  });

  // ── Project Milestones ───────────────────────────────
  await knex.schema.createTable('project_milestones', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.string('name', 200).notNullable();
    t.date('due_date');
    t.date('completed_date');
    t.string('status', 20).notNullable().defaultTo('pending');
    t.timestamps(true, true);
    t.index('project_id');
  });

  // ── Project Members ──────────────────────────────────
  await knex.schema.createTable('project_members', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('project_id').notNullable().references('id').inTable('projects').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('role', 20).notNullable().defaultTo('member');
    t.timestamps(true, true);
    t.unique(['project_id', 'user_id']);
  });

  // ── Time Entries ─────────────────────────────────────
  await knex.schema.createTable('time_entries', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('user_id').notNullable().references('id').inTable('users');
    t.uuid('task_id').references('id').inTable('project_tasks').onDelete('CASCADE');
    t.string('table_name', 100);
    t.uuid('record_id');
    t.date('date').notNullable();
    t.decimal('hours', 6, 2).notNullable();
    t.text('notes');
    t.boolean('billable').notNullable().defaultTo(false);
    t.timestamps(true, true);
    t.index('user_id');
    t.index('task_id');
    t.index('date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('time_entries');
  await knex.schema.dropTableIfExists('project_members');
  await knex.schema.dropTableIfExists('project_milestones');
  await knex.schema.dropTableIfExists('project_tasks');
  await knex.schema.dropTableIfExists('projects');
  await knex.raw("DROP SEQUENCE IF EXISTS project_task_number_seq");
  await knex.raw("DROP SEQUENCE IF EXISTS project_number_seq");
}
