import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('integrations', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.string('type').notNullable().defaultTo('webhook'); // webhook, rest_api
    t.string('url').notNullable();
    t.string('auth_type').defaultTo('none'); // none, bearer, basic, api_key
    t.jsonb('auth_config').defaultTo('{}');
    t.specificType('events', 'text[]').defaultTo('{}');
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('integration_logs', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('integration_id').notNullable().references('id').inTable('integrations').onDelete('CASCADE');
    t.string('event').notNullable();
    t.string('status').notNullable(); // success, error
    t.jsonb('request_body').defaultTo('{}');
    t.jsonb('response_body').defaultTo('{}');
    t.integer('status_code');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('integration_logs');
  await knex.schema.dropTableIfExists('integrations');
}
