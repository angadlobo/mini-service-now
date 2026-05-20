import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('chat_user_links', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('platform', 20).notNullable(); // telegram|slack|teams|whatsapp|discord
    t.string('platform_user_id', 100).notNullable();
    t.string('platform_chat_id', 100).nullable();
    t.string('platform_username', 100).nullable();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.timestamp('linked_at').notNullable().defaultTo(knex.fn.now());
    t.boolean('active').notNullable().defaultTo(true);
    t.unique(['platform', 'platform_user_id']);
    t.timestamps(true, true);
  });

  await knex.schema.createTable('chat_sessions', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('platform', 20).notNullable();
    t.string('platform_user_id', 100).notNullable();
    t.string('platform_chat_id', 100).nullable();
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('command', 30).notNullable(); // incident|change|problem|request|link|status
    t.integer('current_step').notNullable().defaultTo(0);
    t.jsonb('form_data').notNullable().defaultTo('{}');
    t.timestamp('expires_at').notNullable();
    t.timestamps(true, true);
    t.index(['platform', 'platform_user_id', 'platform_chat_id']);
  });

  // Seed new sys_settings keys for chat platform credentials
  const existing = await knex('sys_settings').whereIn('key', [
    'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET',
    'TEAMS_APP_ID', 'TEAMS_APP_PASSWORD',
    'WHATSAPP_VERIFY_TOKEN',
    'DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_PUBLIC_KEY',
  ]).pluck('key');

  const newSettings = [
    { key: 'SLACK_BOT_TOKEN', value: '', description: 'Slack Bot OAuth token for chatbot integration' },
    { key: 'SLACK_SIGNING_SECRET', value: '', description: 'Slack signing secret for webhook verification' },
    { key: 'TEAMS_APP_ID', value: '', description: 'Microsoft Teams app/bot ID' },
    { key: 'TEAMS_APP_PASSWORD', value: '', description: 'Microsoft Teams app password (client secret)' },
    { key: 'WHATSAPP_VERIFY_TOKEN', value: '', description: 'WhatsApp webhook verification token' },
    { key: 'DISCORD_BOT_TOKEN', value: '', description: 'Discord bot token' },
    { key: 'DISCORD_APPLICATION_ID', value: '', description: 'Discord application ID' },
    { key: 'DISCORD_PUBLIC_KEY', value: '', description: 'Discord public key for interaction verification' },
  ].filter((s) => !existing.includes(s.key));

  if (newSettings.length > 0) {
    await knex('sys_settings').insert(newSettings);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('chat_sessions');
  await knex.schema.dropTableIfExists('chat_user_links');
  await knex('sys_settings').whereIn('key', [
    'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET',
    'TEAMS_APP_ID', 'TEAMS_APP_PASSWORD',
    'WHATSAPP_VERIFY_TOKEN',
    'DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_PUBLIC_KEY',
  ]).del();
}
