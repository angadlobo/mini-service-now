import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Alter workflow_rules ──────────────────────────────
  const hasTriggerConfig = await knex.schema.hasColumn('workflow_rules', 'trigger_config');
  if (!hasTriggerConfig) {
    await knex.schema.alterTable('workflow_rules', (t) => {
      t.jsonb('trigger_config').nullable();
      t.jsonb('error_handling').nullable();
      t.jsonb('tags').nullable();
    });
  }

  // ── Alter workflow_executions ─────────────────────────
  const hasDuration = await knex.schema.hasColumn('workflow_executions', 'duration_ms');
  if (!hasDuration) {
    await knex.schema.alterTable('workflow_executions', (t) => {
      t.integer('duration_ms').nullable();
      t.string('trigger_type').nullable();
      t.jsonb('context').nullable();
    });
  }

  // ── workflow_triggers ─────────────────────────────────
  const hasTriggersTable = await knex.schema.hasTable('workflow_triggers');
  if (!hasTriggersTable) {
    await knex.schema.createTable('workflow_triggers', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('workflow_rule_id').notNullable().references('id').inTable('workflow_rules').onDelete('CASCADE');
      t.string('type').notNullable(); // scheduled, webhook, sla_breach, approval_decided, inbound_email
      t.jsonb('config').defaultTo('{}');
      t.boolean('active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // ── workflow_webhooks ─────────────────────────────────
  const hasWebhooksTable = await knex.schema.hasTable('workflow_webhooks');
  if (!hasWebhooksTable) {
    await knex.schema.createTable('workflow_webhooks', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('workflow_rule_id').notNullable().references('id').inTable('workflow_rules').onDelete('CASCADE');
      t.string('secret').notNullable();
      t.string('path_slug').notNullable().unique();
      t.boolean('active').defaultTo(true);
      t.timestamps(true, true);
    });
  }

  // ── workflow_action_logs ──────────────────────────────
  const hasActionLogsTable = await knex.schema.hasTable('workflow_action_logs');
  if (!hasActionLogsTable) {
    await knex.schema.createTable('workflow_action_logs', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('execution_id').notNullable().references('id').inTable('workflow_executions').onDelete('CASCADE');
      t.integer('action_index').notNullable();
      t.string('action_type').notNullable();
      t.string('status').notNullable().defaultTo('success'); // success, error, skipped
      t.integer('duration_ms').nullable();
      t.jsonb('input').nullable();
      t.jsonb('output').nullable();
      t.text('error').nullable();
      t.timestamps(true, true);
    });
  }

  // ── workflow_scheduled_runs ───────────────────────────
  const hasScheduledRunsTable = await knex.schema.hasTable('workflow_scheduled_runs');
  if (!hasScheduledRunsTable) {
    await knex.schema.createTable('workflow_scheduled_runs', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('trigger_id').notNullable().references('id').inTable('workflow_triggers').onDelete('CASCADE');
      t.timestamp('next_run_at').nullable();
      t.timestamp('last_run_at').nullable();
      t.string('status').notNullable().defaultTo('pending');
      t.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_scheduled_runs');
  await knex.schema.dropTableIfExists('workflow_action_logs');
  await knex.schema.dropTableIfExists('workflow_webhooks');
  await knex.schema.dropTableIfExists('workflow_triggers');

  const hasDuration = await knex.schema.hasColumn('workflow_executions', 'duration_ms');
  if (hasDuration) {
    await knex.schema.alterTable('workflow_executions', (t) => {
      t.dropColumn('duration_ms');
      t.dropColumn('trigger_type');
      t.dropColumn('context');
    });
  }

  const hasTriggerConfig = await knex.schema.hasColumn('workflow_rules', 'trigger_config');
  if (hasTriggerConfig) {
    await knex.schema.alterTable('workflow_rules', (t) => {
      t.dropColumn('trigger_config');
      t.dropColumn('error_handling');
      t.dropColumn('tags');
    });
  }
}
