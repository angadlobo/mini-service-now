import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS ci_number_seq START 1000");

  await knex.schema.createTable('ci_types', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable().unique();
    t.text('description');
    t.string('icon').defaultTo('Server');
    t.uuid('parent_type_id').references('id').inTable('ci_types');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('cis', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number').unique().notNullable();
    t.uuid('ci_type_id').notNullable().references('id').inTable('ci_types');
    t.string('name').notNullable();
    t.string('serial_number');
    t.string('status').notNullable().defaultTo('inventory');
    t.uuid('owner_id').references('id').inTable('users');
    t.string('location');
    t.decimal('cost', 12, 2).defaultTo(0);
    t.jsonb('attributes').defaultTo('{}');
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ci_relationships', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('parent_ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.uuid('child_ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.string('type').notNullable().defaultTo('depends_on'); // depends_on, runs_on, connected_to
    t.timestamps(true, true);
    t.unique(['parent_ci_id', 'child_ci_id', 'type']);
  });

  // Add ci_id to incidents and changes
  await knex.schema.alterTable('incidents', (t) => {
    t.uuid('ci_id').references('id').inTable('cis');
  });
  await knex.schema.alterTable('changes', (t) => {
    t.uuid('ci_id').references('id').inTable('cis');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('changes', (t) => { t.dropColumn('ci_id'); });
  await knex.schema.alterTable('incidents', (t) => { t.dropColumn('ci_id'); });
  await knex.schema.dropTableIfExists('ci_relationships');
  await knex.schema.dropTableIfExists('cis');
  await knex.schema.dropTableIfExists('ci_types');
  await knex.raw("DROP SEQUENCE IF EXISTS ci_number_seq");
}
