import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sys_settings', (t) => {
    t.uuid('id').primary().defaultTo(knex.fn.uuid());
    t.string('key').notNullable().unique();
    t.text('value');
    t.string('category').notNullable().defaultTo('general');
    t.boolean('encrypted').defaultTo(false);
    t.text('description');
    t.timestamps(true, true);
  });

  // Seed default settings
  await knex('sys_settings').insert([
    { key: 'ALLOW_SELF_REGISTRATION', value: 'true', category: 'auth', description: 'Allow new users to self-register' },
    { key: 'APP_NAME', value: 'Mini ServiceNow', category: 'general', description: 'Application display name' },
    { key: 'SMTP_HOST', value: '', category: 'email', description: 'SMTP server host' },
    { key: 'SMTP_PORT', value: '587', category: 'email', description: 'SMTP server port' },
    { key: 'SMTP_USER', value: '', category: 'email', description: 'SMTP username' },
    { key: 'SMTP_PASSWORD', value: '', category: 'email', encrypted: true, description: 'SMTP password' },
    { key: 'SMTP_FROM', value: 'noreply@miniservicenow.local', category: 'email', description: 'Default from email address' },
    { key: 'SLACK_WEBHOOK_URL', value: '', category: 'slack', description: 'Slack incoming webhook URL' },
    { key: 'AI_ENABLED', value: 'true', category: 'ai', description: 'Enable AI features' },
    { key: 'AI_ENCRYPTION_KEY', value: '', category: 'ai', encrypted: true, description: 'Key for encrypting AI provider API keys' },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sys_settings');
}
