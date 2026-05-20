import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add new columns to workflow_rules (idempotent)
  const hasDescription = await knex.schema.hasColumn('workflow_rules', 'description');
  if (!hasDescription) {
    await knex.schema.alterTable('workflow_rules', (t) => {
      t.text('description').nullable();
    });
  }
  const hasVersion = await knex.schema.hasColumn('workflow_rules', 'version');
  if (!hasVersion) {
    await knex.schema.alterTable('workflow_rules', (t) => {
      t.integer('version').defaultTo(1);
    });
  }
  const hasFlowLayout = await knex.schema.hasColumn('workflow_rules', 'flow_layout');
  if (!hasFlowLayout) {
    await knex.schema.alterTable('workflow_rules', (t) => {
      t.jsonb('flow_layout').defaultTo('{}');
    });
  }

  // Add resume_at and action_index to workflow_executions
  const hasResumeAt = await knex.schema.hasColumn('workflow_executions', 'resume_at');
  if (!hasResumeAt) {
    await knex.schema.alterTable('workflow_executions', (t) => {
      t.timestamp('resume_at').nullable();
    });
  }
  const hasActionIndex = await knex.schema.hasColumn('workflow_executions', 'action_index');
  if (!hasActionIndex) {
    await knex.schema.alterTable('workflow_executions', (t) => {
      t.integer('action_index').nullable();
    });
  }

  // Create workflow_form_tasks table
  const hasTable = await knex.schema.hasTable('workflow_form_tasks');
  if (!hasTable) {
    await knex.schema.createTable('workflow_form_tasks', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('workflow_rule_id').notNullable().references('id').inTable('workflow_rules').onDelete('CASCADE');
      t.uuid('execution_id').notNullable().references('id').inTable('workflow_executions').onDelete('CASCADE');
      t.uuid('form_template_id').notNullable().references('id').inTable('form_templates').onDelete('CASCADE');
      t.string('table_name').notNullable();
      t.uuid('record_id').notNullable();
      t.uuid('assigned_to').notNullable().references('id').inTable('users');
      t.string('state').notNullable().defaultTo('pending');
      t.jsonb('submitted_data').nullable();
      t.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_form_tasks');

  const hasResumeAt = await knex.schema.hasColumn('workflow_executions', 'resume_at');
  if (hasResumeAt) {
    await knex.schema.alterTable('workflow_executions', (t) => {
      t.dropColumn('resume_at');
      t.dropColumn('action_index');
    });
  }

  const hasDescription = await knex.schema.hasColumn('workflow_rules', 'description');
  if (hasDescription) {
    await knex.schema.alterTable('workflow_rules', (t) => {
      t.dropColumn('description');
      t.dropColumn('version');
      t.dropColumn('flow_layout');
    });
  }
}
