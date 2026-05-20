import { db } from '../../config/database';
import { logger } from '../../config/logger';

/**
 * Set up Telegram webhook and bot commands.
 * Call this after deploying or when changing the base URL.
 */
export async function setupTelegramWebhook(baseUrl: string): Promise<boolean> {
  const setting = await db('sys_settings').where('key', 'TELEGRAM_BOT_TOKEN').first();
  const botToken = setting?.value;
  if (!botToken) {
    logger.error('setupTelegramWebhook: TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const webhookUrl = `${baseUrl}/api/chatbot/telegram`;

  // Set webhook
  const webhookRes = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: webhookUrl }),
  });

  if (!webhookRes.ok) {
    logger.error('Failed to set Telegram webhook', { status: webhookRes.status });
    return false;
  }

  // Register bot commands
  const commands = [
    { command: 'incident', description: 'Create a new incident' },
    { command: 'change', description: 'Create a new change request' },
    { command: 'problem', description: 'Create a new problem record' },
    { command: 'request', description: 'Create a catalog request' },
    { command: 'status', description: 'Check ticket status' },
    { command: 'link', description: 'Link your chat account' },
    { command: 'cancel', description: 'Cancel current operation' },
    { command: 'help', description: 'Show available commands' },
  ];

  const cmdRes = await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commands }),
  });

  if (!cmdRes.ok) {
    logger.warn('Failed to set Telegram bot commands', { status: cmdRes.status });
  }

  logger.info(`Telegram webhook set to ${webhookUrl}`);
  return true;
}

/**
 * Register Discord global slash commands.
 * Call this once when setting up the Discord bot.
 */
export async function registerDiscordCommands(): Promise<boolean> {
  const settings = await db('sys_settings').whereIn('key', [
    'DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID',
  ]);
  const config: Record<string, string> = {};
  settings.forEach((s: any) => { config[s.key] = s.value; });

  if (!config.DISCORD_BOT_TOKEN || !config.DISCORD_APPLICATION_ID) {
    logger.error('registerDiscordCommands: Discord credentials not configured');
    return false;
  }

  const commands = [
    { name: 'incident', description: 'Create a new incident', type: 1 },
    { name: 'change', description: 'Create a new change request', type: 1 },
    { name: 'problem', description: 'Create a new problem record', type: 1 },
    { name: 'request', description: 'Create a catalog request', type: 1 },
    {
      name: 'status',
      description: 'Check ticket status',
      type: 1,
      options: [{
        name: 'number',
        description: 'Ticket number (e.g. INC1001)',
        type: 3, // STRING
        required: true,
      }],
    },
    {
      name: 'link',
      description: 'Link your chat account',
      type: 1,
      options: [
        { name: 'username', description: 'Your platform username', type: 3, required: true },
        { name: 'password', description: 'Your platform password', type: 3, required: true },
      ],
    },
    { name: 'cancel', description: 'Cancel current operation', type: 1 },
    { name: 'help', description: 'Show available commands', type: 1 },
  ];

  const url = `https://discord.com/api/v10/applications/${config.DISCORD_APPLICATION_ID}/commands`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bot ${config.DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify(commands),
  });

  if (!res.ok) {
    const body = await res.text();
    logger.error('Failed to register Discord commands', { status: res.status, body });
    return false;
  }

  logger.info('Discord slash commands registered');
  return true;
}
