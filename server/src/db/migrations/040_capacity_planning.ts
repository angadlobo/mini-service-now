import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('resource_pools', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.string('type', 30).notNullable().defaultTo('team');
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.decimal('total_capacity_hours', 10, 2).notNullable().defaultTo(0);
    t.string('period', 20).notNullable().defaultTo('monthly');
    t.timestamps(true, true);
    t.index('type');
  });

  await knex.schema.createTable('capacity_allocations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('pool_id').notNullable().references('id').inTable('resource_pools').onDelete('CASCADE');
    t.string('allocated_to_type', 30).notNullable();
    t.uuid('allocated_to_id');
    t.decimal('hours', 10, 2).notNullable();
    t.date('period_start').notNullable();
    t.date('period_end').notNullable();
    t.string('status', 20).notNullable().defaultTo('planned');
    t.timestamps(true, true);
    t.index('pool_id');
    t.index('allocated_to_type');
    t.index(['period_start', 'period_end']);
  });

  await knex.schema.createTable('capacity_forecasts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('pool_id').notNullable().references('id').inTable('resource_pools').onDelete('CASCADE');
    t.date('period_start').notNullable();
    t.decimal('forecasted_demand_hours', 10, 2).notNullable().defaultTo(0);
    t.decimal('available_hours', 10, 2).notNullable().defaultTo(0);
    t.decimal('gap_hours', 10, 2).notNullable().defaultTo(0);
    t.text('notes');
    t.timestamps(true, true);
    t.index('pool_id');
    t.index('period_start');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('capacity_forecasts');
  await knex.schema.dropTableIfExists('capacity_allocations');
  await knex.schema.dropTableIfExists('resource_pools');
}
