import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_rules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.string('table_name').notNullable();
    t.string('trigger_event').notNullable(); // record.created, record.updated, record.state_changed
    t.jsonb('conditions').defaultTo('{}');
    t.jsonb('actions').defaultTo('[]');
    t.boolean('active').defaultTo(true);
    t.integer('execution_order').defaultTo(100);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('workflow_executions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('rule_id').notNullable().references('id').inTable('workflow_rules').onDelete('CASCADE');
    t.string('table_name').notNullable();
    t.uuid('record_id').notNullable();
    t.string('status').notNullable().defaultTo('success'); // success, error
    t.text('error');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_executions');
  await knex.schema.dropTableIfExists('workflow_rules');
}
