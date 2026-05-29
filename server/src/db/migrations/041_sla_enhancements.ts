import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ola_definitions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name', 200).notNullable();
    t.uuid('assignment_group_id').references('id').inTable('assignment_groups').onDelete('SET NULL');
    t.integer('target_minutes').notNullable();
    t.string('metric', 30).notNullable(); // response/resolution/update
    t.jsonb('conditions').defaultTo('{}');
    t.boolean('active').defaultTo(true);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ola_instances', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('ola_definition_id').notNullable().references('id').inTable('ola_definitions').onDelete('CASCADE');
    t.string('table_name', 50).notNullable();
    t.uuid('record_id').notNullable();
    t.timestamp('start_time').notNullable();
    t.timestamp('target_time').notNullable();
    t.timestamp('actual_time');
    t.boolean('breached').defaultTo(false);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ola_instances');
  await knex.schema.dropTableIfExists('ola_definitions');
}
