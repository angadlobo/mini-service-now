import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('form_templates', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.text('description');
    t.string('table_name');
    t.jsonb('schema').defaultTo('{}');
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('form_fields', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('template_id').notNullable().references('id').inTable('form_templates').onDelete('CASCADE');
    t.string('field_type').notNullable(); // text, textarea, number, date, select, multi_select, checkbox, radio, file, reference, section
    t.string('label').notNullable();
    t.string('name').notNullable();
    t.jsonb('config').defaultTo('{}'); // options, placeholder, default, min, max, etc.
    t.integer('sort_order').defaultTo(0);
    t.boolean('required').defaultTo(false);
    t.jsonb('conditional_logic').defaultTo('{}');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('form_submissions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('template_id').notNullable().references('id').inTable('form_templates').onDelete('CASCADE');
    t.uuid('record_id');
    t.jsonb('data').defaultTo('{}');
    t.uuid('submitted_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('form_submissions');
  await knex.schema.dropTableIfExists('form_fields');
  await knex.schema.dropTableIfExists('form_templates');
}
