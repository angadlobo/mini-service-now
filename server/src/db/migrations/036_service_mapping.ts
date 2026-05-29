import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS business_service_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('business_services', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('name', 200).notNullable();
    t.text('description');
    t.uuid('owner_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('status', 20).notNullable().defaultTo('active');
    t.string('criticality', 20).notNullable().defaultTo('medium');
    t.string('portfolio', 100);
    t.uuid('sla_definition_id');
    t.timestamps(true, true);
    t.index('status');
    t.index('criticality');
  });

  await knex.schema.createTable('service_offerings', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('business_service_id').notNullable().references('id').inTable('business_services').onDelete('CASCADE');
    t.string('name', 200).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('active');
    t.decimal('availability_target', 5, 2);
    t.timestamps(true, true);
    t.index('business_service_id');
  });

  await knex.schema.createTable('service_dependencies', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('service_id').notNullable().references('id').inTable('business_services').onDelete('CASCADE');
    t.uuid('depends_on_service_id').notNullable().references('id').inTable('business_services').onDelete('CASCADE');
    t.string('dependency_type', 20).notNullable().defaultTo('hard');
    t.text('description');
    t.timestamps(true, true);
    t.unique(['service_id', 'depends_on_service_id']);
    t.index('service_id');
    t.index('depends_on_service_id');
  });

  await knex.schema.createTable('service_ci_map', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('service_id').notNullable().references('id').inTable('business_services').onDelete('CASCADE');
    t.uuid('ci_id').notNullable().references('id').inTable('cis').onDelete('CASCADE');
    t.string('role', 30).notNullable().defaultTo('provides');
    t.timestamps(true, true);
    t.unique(['service_id', 'ci_id']);
    t.index('service_id');
    t.index('ci_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('service_ci_map');
  await knex.schema.dropTableIfExists('service_dependencies');
  await knex.schema.dropTableIfExists('service_offerings');
  await knex.schema.dropTableIfExists('business_services');
  await knex.raw("DROP SEQUENCE IF EXISTS business_service_number_seq");
}
