import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS demand_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('demands', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('title', 200).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('submitted');
    t.string('type', 30).notNullable().defaultTo('enhancement');
    t.text('business_justification');
    t.uuid('requested_by').references('id').inTable('users').onDelete('SET NULL');
    t.string('business_unit', 100);
    t.integer('priority').notNullable().defaultTo(3);
    t.integer('estimated_effort_days');
    t.decimal('estimated_cost', 12, 2);
    t.decimal('expected_value', 12, 2);
    t.decimal('roi_score', 8, 2);
    t.string('target_quarter', 10);
    t.uuid('approved_by').references('id').inTable('users').onDelete('SET NULL');
    t.uuid('project_id');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
    t.index('status');
    t.index('type');
    t.index('priority');
    t.index('requested_by');
  });

  await knex.schema.createTable('demand_scores', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('demand_id').notNullable().references('id').inTable('demands').onDelete('CASCADE');
    t.string('criterion', 50).notNullable();
    t.integer('score').notNullable();
    t.decimal('weight', 5, 2).notNullable().defaultTo(1.0);
    t.uuid('scored_by').references('id').inTable('users').onDelete('SET NULL');
    t.timestamps(true, true);
    t.unique(['demand_id', 'criterion']);
    t.index('demand_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('demand_scores');
  await knex.schema.dropTableIfExists('demands');
  await knex.raw("DROP SEQUENCE IF EXISTS demand_number_seq");
}
