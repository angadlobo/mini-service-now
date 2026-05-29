import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw("CREATE SEQUENCE IF NOT EXISTS survey_number_seq START WITH 1 INCREMENT BY 1");

  await knex.schema.createTable('surveys', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('number', 20).notNullable().unique();
    t.string('title', 200).notNullable();
    t.text('description');
    t.string('status', 20).notNullable().defaultTo('draft');
    t.string('type', 30).notNullable().defaultTo('satisfaction');
    t.string('trigger_table', 50);
    t.string('trigger_state', 30);
    t.boolean('anonymous').notNullable().defaultTo(false);
    t.uuid('created_by').notNullable().references('id').inTable('users');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('survey_questions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('survey_id').notNullable().references('id').inTable('surveys').onDelete('CASCADE');
    t.text('question_text').notNullable();
    t.string('type', 30).notNullable().defaultTo('rating_1_5');
    t.jsonb('options');
    t.boolean('required').notNullable().defaultTo(true);
    t.integer('order_index').notNullable().defaultTo(0);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('survey_responses', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('survey_id').notNullable().references('id').inTable('surveys').onDelete('CASCADE');
    t.uuid('respondent_id').references('id').inTable('users').onDelete('SET NULL');
    t.string('table_name', 50);
    t.uuid('record_id');
    t.timestamp('submitted_at').notNullable().defaultTo(knex.fn.now());
    t.decimal('overall_score', 5, 2);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('survey_answers', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.uuid('response_id').notNullable().references('id').inTable('survey_responses').onDelete('CASCADE');
    t.uuid('question_id').notNullable().references('id').inTable('survey_questions').onDelete('CASCADE');
    t.string('answer_value', 500);
    t.text('answer_text');
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('survey_answers');
  await knex.schema.dropTableIfExists('survey_responses');
  await knex.schema.dropTableIfExists('survey_questions');
  await knex.schema.dropTableIfExists('surveys');
  await knex.raw("DROP SEQUENCE IF EXISTS survey_number_seq");
}
