import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('reports', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.text('description');
    t.string('table_name').notNullable();
    t.jsonb('filters').defaultTo('{}');
    t.jsonb('columns').defaultTo('[]');
    t.string('chart_type').defaultTo('table'); // table, bar, pie, line
    t.boolean('is_public').defaultTo(false);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('report_schedules', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('report_id').notNullable().references('id').inTable('reports').onDelete('CASCADE');
    t.string('cron').notNullable();
    t.string('format').notNullable().defaultTo('csv'); // csv, xlsx, pdf
    t.specificType('recipients', 'text[]').defaultTo('{}');
    t.timestamp('last_run');
    t.timestamp('next_run');
    t.boolean('active').defaultTo(true);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('report_schedules');
  await knex.schema.dropTableIfExists('reports');
}
