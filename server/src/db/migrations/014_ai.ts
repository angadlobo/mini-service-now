import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('ai_providers', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable();
    t.string('provider_type').notNullable(); // openai, anthropic, ollama, custom
    t.text('api_key_encrypted');
    t.string('model').notNullable();
    t.string('base_url');
    t.jsonb('config').defaultTo('{}');
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ai_prompts', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('name').notNullable().unique();
    t.string('use_case').notNullable();
    t.text('system_prompt').notNullable();
    t.text('user_prompt_template').notNullable();
    t.uuid('provider_id').references('id').inTable('ai_providers');
    t.boolean('active').defaultTo(true);
    t.uuid('created_by').references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('ai_usage_log', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('prompt_id').references('id').inTable('ai_prompts');
    t.uuid('provider_id').references('id').inTable('ai_providers');
    t.string('table_name');
    t.uuid('record_id');
    t.integer('input_tokens').defaultTo(0);
    t.integer('output_tokens').defaultTo(0);
    t.text('response_text');
    t.string('feedback'); // helpful, not_helpful
    t.uuid('user_id').references('id').inTable('users');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ai_usage_log');
  await knex.schema.dropTableIfExists('ai_prompts');
  await knex.schema.dropTableIfExists('ai_providers');
}
