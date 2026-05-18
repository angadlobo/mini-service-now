import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // ── Extend integrations table ──────────────────────────
  const hasProvider = await knex.schema.hasColumn('integrations', 'provider');
  if (!hasProvider) {
    await knex.schema.alterTable('integrations', (t) => {
      t.string('provider').nullable(); // github|gitlab|jira|pagerduty|teams|azure_devops|datadog|grafana
      t.jsonb('provider_config').defaultTo('{}');
      t.jsonb('oauth_tokens').nullable();
      t.string('webhook_secret').nullable();
      t.string('inbound_webhook_id').nullable().unique();
      t.string('status').defaultTo('connected');
      t.text('status_message').nullable();
      t.timestamp('last_sync_at').nullable();
    });
  }

  // ── integration_links ──────────────────────────────────
  const hasLinksTable = await knex.schema.hasTable('integration_links');
  if (!hasLinksTable) {
    await knex.schema.createTable('integration_links', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.uuid('integration_id').notNullable().references('id').inTable('integrations').onDelete('CASCADE');
      t.string('table_name').notNullable();
      t.uuid('record_id').notNullable();
      t.string('provider').notNullable();
      t.string('external_type').notNullable(); // issue, pull_request, work_item, alert, pipeline
      t.string('external_id').notNullable();
      t.string('external_url').nullable();
      t.string('external_key').nullable(); // e.g. PROJ-123, owner/repo#45
      t.string('title').nullable();
      t.string('status').nullable();
      t.jsonb('metadata').defaultTo('{}');
      t.string('direction').notNullable().defaultTo('outbound'); // outbound|inbound
      t.timestamps(true, true);

      t.index(['table_name', 'record_id']);
      t.unique(['integration_id', 'external_type', 'external_id']);
    });
  }

  // ── integration_oauth_sessions ─────────────────────────
  const hasOAuthSessions = await knex.schema.hasTable('integration_oauth_sessions');
  if (!hasOAuthSessions) {
    await knex.schema.createTable('integration_oauth_sessions', (t) => {
      t.uuid('id').primary().defaultTo(knex.fn.uuid());
      t.string('state').notNullable().unique();
      t.string('provider').notNullable();
      t.uuid('integration_id').notNullable().references('id').inTable('integrations').onDelete('CASCADE');
      t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      t.string('redirect_uri').nullable();
      t.timestamp('expires_at').notNullable();
      t.timestamps(true, true);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('integration_oauth_sessions');
  await knex.schema.dropTableIfExists('integration_links');

  const hasProvider = await knex.schema.hasColumn('integrations', 'provider');
  if (hasProvider) {
    await knex.schema.alterTable('integrations', (t) => {
      t.dropColumn('provider');
      t.dropColumn('provider_config');
      t.dropColumn('oauth_tokens');
      t.dropColumn('webhook_secret');
      t.dropColumn('inbound_webhook_id');
      t.dropColumn('status');
      t.dropColumn('status_message');
      t.dropColumn('last_sync_at');
    });
  }
}
