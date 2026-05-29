import { Knex } from 'knex';

/**
 * Seed the remaining chatbot platform credentials (Telegram was missing) and the
 * NLU toggle, all under a dedicated 'chatbot' settings category so the admin UI
 * can group them. Also normalises the existing chat keys into the 'chatbot' category.
 */
const CHATBOT_KEYS = [
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET',
  'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET',
  'TEAMS_APP_ID', 'TEAMS_APP_PASSWORD',
  'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN',
  'DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_PUBLIC_KEY',
  'CHATBOT_NLU_ENABLED',
];

const NEW_SETTINGS: Array<{ key: string; value: string; category: string; encrypted: boolean; description: string }> = [
  { key: 'TELEGRAM_BOT_TOKEN', value: '', category: 'chatbot', encrypted: false, description: 'Telegram bot token from @BotFather' },
  { key: 'TELEGRAM_WEBHOOK_SECRET', value: '', category: 'chatbot', encrypted: false, description: 'Optional Telegram webhook secret token (X-Telegram-Bot-Api-Secret-Token)' },
  { key: 'WHATSAPP_PHONE_NUMBER_ID', value: '', category: 'chatbot', encrypted: false, description: 'WhatsApp Cloud API phone number ID' },
  { key: 'WHATSAPP_ACCESS_TOKEN', value: '', category: 'chatbot', encrypted: false, description: 'WhatsApp Cloud API access token' },
  { key: 'CHATBOT_NLU_ENABLED', value: 'true', category: 'chatbot', encrypted: false, description: 'Enable natural-language understanding for the chatbot (requires an active AI provider)' },
];

export async function up(knex: Knex): Promise<void> {
  // Group all existing chat-related keys under the 'chatbot' category for the admin UI.
  await knex('sys_settings').whereIn('key', CHATBOT_KEYS).update({ category: 'chatbot' });

  const existing = await knex('sys_settings').whereIn('key', NEW_SETTINGS.map((s) => s.key)).pluck('key');
  const toInsert = NEW_SETTINGS.filter((s) => !existing.includes(s.key));
  if (toInsert.length > 0) {
    await knex('sys_settings').insert(toInsert);
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('sys_settings').whereIn('key', [
    'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET',
    'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN',
    'CHATBOT_NLU_ENABLED',
  ]).del();
}
