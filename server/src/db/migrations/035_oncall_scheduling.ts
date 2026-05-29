import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('oncall_schedules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.string('timezone', 50).notNullable().defaultTo('UTC');
    t.string('rotation_type', 20).notNullable().defaultTo('weekly');
    t.string('handoff_time', 10).notNullable().defaultTo('09:00');
    t.timestamps(true, true);
    t.index('assignment_group_id');
  });

  await knex.schema.createTable('oncall_rotations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('schedule_id').notNullable().references('id').inTable('oncall_schedules').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.date('start_date').notNullable();
    t.date('end_date').notNullable();
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
    t.index('schedule_id');
    t.index('user_id');
  });

  await knex.schema.createTable('oncall_overrides', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('schedule_id').notNullable().references('id').inTable('oncall_schedules').onDelete('CASCADE');
    t.uuid('user_id').notNullable().references('id').inTable('users');
    t.uuid('override_user_id').notNullable().references('id').inTable('users');
    t.timestamp('start_date').notNullable();
    t.timestamp('end_date').notNullable();
    t.text('reason');
    t.timestamps(true, true);
    t.index('schedule_id');
    t.index(['start_date', 'end_date']);
  });

  await knex.schema.createTable('escalation_policies', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.boolean('enabled').notNullable().defaultTo(true);
    t.timestamps(true, true);
    t.index('assignment_group_id');
  });

  await knex.schema.createTable('escalation_levels', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('policy_id').notNullable().references('id').inTable('escalation_policies').onDelete('CASCADE');
    t.integer('level').notNullable();
    t.integer('delay_minutes').notNullable().defaultTo(15);
    t.boolean('notify_oncall').notNullable().defaultTo(true);
    t.uuid('notify_user_id').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('notify_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.string('action', 20).notNullable().defaultTo('notify');
    t.timestamps(true, true);
    t.index('policy_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('escalation_levels');
  await knex.schema.dropTableIfExists('escalation_policies');
  await knex.schema.dropTableIfExists('oncall_overrides');
  await knex.schema.dropTableIfExists('oncall_rotations');
  await knex.schema.dropTableIfExists('oncall_schedules');
}
