import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS bc_plan_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('bc_plans', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('draft');
    t.string('type', 30).notNullable().defaultTo('business_continuity');
    t.uuid('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.date('last_tested');
    t.date('next_test_due');
    t.integer('rpo_hours');
    t.integer('rto_hours');
    t.uuid('business_service_id');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('status');
    t.index('type');
    t.index('owner_id');
  });

  await knex.schema.createTable('bc_plan_tasks', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('plan_id').notNullable().references('id').inTable('bc_plans').onDelete('CASCADE');
    t.integer('order_index').notNullable().defaultTo(0);
    t.text('description').notNullable();
    t.uuid('assigned_to').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.integer('estimated_minutes');
    t.string('category', 30).notNullable().defaultTo('recovery');
    t.timestamps(true, true);
    t.index('plan_id');
  });

  await knex.schema.createTable('bc_tests', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('plan_id').notNullable().references('id').inTable('bc_plans').onDelete('CASCADE');
    t.date('test_date').notNullable();
    t.string('test_type', 20).notNullable().defaultTo('tabletop');
    t.string('status', 20).notNullable().defaultTo('planned');
    t.decimal('actual_rto_hours', 8, 2);
    t.decimal('actual_rpo_hours', 8, 2);
    t.text('findings');
    t.uuid('conducted_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.index('plan_id');
    t.index('test_date');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('bc_tests');
  await knex.schema.dropTableIfExists('bc_plan_tasks');
  await knex.schema.dropTableIfExists('bc_plans');
  await knex.raw("DROP SEQUENCE IF EXISTS bc_plan_number_seq");
}
