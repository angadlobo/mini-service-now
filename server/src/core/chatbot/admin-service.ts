import { db } from '../../config/database';
import { setupTelegramWebhook, registerDiscordCommands } from './setup';
import { Platform } from './types';

/** Which sys_settings keys belong to each chat platform. */
export const PLATFORM_KEYS: Record<Platform, string[]> = {
  telegram: ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET'],
  slack: ['SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET'],
  teams: ['TEAMS_APP_ID', 'TEAMS_APP_PASSWORD'],
  whatsapp: ['WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'],
  discord: ['DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_PUBLIC_KEY'],
};

/** Keys whose values must never be returned to the client. */
const SECRET_KEYS = new Set([
  'TELEGRAM_BOT_TOKEN', 'TELEGRAM_WEBHOOK_SECRET',
  'SLACK_BOT_TOKEN', 'SLACK_SIGNING_SECRET',
  'TEAMS_APP_PASSWORD',
  'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_ACCESS_TOKEN',
  'DISCORD_BOT_TOKEN', 'DISCORD_PUBLIC_KEY',
]);

async function getBaseUrl(): Promise<string> {
  const setting = await db('sys_settings').where('key', 'SERVER_PUBLIC_URL').first();
  return setting?.value || process.env.SERVER_PUBLIC_URL || process.env.CLIENT_URL || 'http://localhost:3001';
}

export const chatbotAdminService = {
  /**
   * Return per-platform key status (set/unset, non-secret values), webhook URLs,
   * and the NLU toggle. Secret values are never returned — only whether they're set.
   */
  async getConfig() {
    const allKeys = Object.values(PLATFORM_KEYS).flat();
    const rows = await db('sys_settings').whereIn('key', allKeys);
    const byKey: Record<string, any> = {};
    rows.forEach((r: any) => { byKey[r.key] = r; });

    const baseUrl = await getBaseUrl();

    const platforms = (Object.keys(PLATFORM_KEYS) as Platform[]).map((platform) => {
      const keys = PLATFORM_KEYS[platform].map((key) => {
        const row = byKey[key];
        const value = row?.value || '';
        return {
          key,
          set: !!value,
          secret: SECRET_KEYS.has(key),
          // Non-secret values are echoed back so admins can see/edit them.
          value: SECRET_KEYS.has(key) ? '' : value,
          description: row?.description || '',
        };
      });
      return {
        platform,
        configured: keys.every((k) => k.set),
        anySet: keys.some((k) => k.set),
        webhookUrl: `${baseUrl}/api/chatbot/${platform}`,
        keys,
      };
    });

    const nluRow = await db('sys_settings').where('key', 'CHATBOT_NLU_ENABLED').first();
    const aiProvider = await db('ai_providers').where('active', true).first();

    return {
      platforms,
      nluEnabled: !nluRow || String(nluRow.value).toLowerCase() !== 'false',
      aiProviderActive: !!aiProvider,
      baseUrl,
    };
  },

  /**
   * Upsert chatbot settings. Only keys with a non-empty value (or explicit toggles)
   * are written, so leaving a secret field blank preserves the existing value.
   */
  async saveConfig(settings: Array<{ key: string; value: string }>) {
    const allowed = new Set([...Object.values(PLATFORM_KEYS).flat(), 'CHATBOT_NLU_ENABLED', 'SERVER_PUBLIC_URL']);
    for (const s of settings) {
      if (!allowed.has(s.key)) continue;
      // Toggles and non-secret keys may be set to empty/false; secrets only when provided.
      const isToggle = s.key === 'CHATBOT_NLU_ENABLED';
      if (SECRET_KEYS.has(s.key) && (s.value === '' || s.value === undefined)) continue;
      const existing = await db('sys_settings').where('key', s.key).first();
      if (existing) {
        await db('sys_settings').where('key', s.key).update({ value: s.value, updated_at: new Date() });
      } else {
        await db('sys_settings').insert({ key: s.key, value: s.value, category: 'chatbot', encrypted: false });
      }
      void isToggle;
    }
    return { message: 'Chatbot settings saved' };
  },

  async setupTelegram(baseUrl?: string) {
    const url = baseUrl || (await getBaseUrl());
    if (baseUrl) {
      // Persist the provided public URL for future webhook setups.
      const existing = await db('sys_settings').where('key', 'SERVER_PUBLIC_URL').first();
      if (existing) await db('sys_settings').where('key', 'SERVER_PUBLIC_URL').update({ value: baseUrl, updated_at: new Date() });
      else await db('sys_settings').insert({ key: 'SERVER_PUBLIC_URL', value: baseUrl, category: 'chatbot' });
    }
    const ok = await setupTelegramWebhook(url);
    return { success: ok, webhookUrl: `${url}/api/chatbot/telegram` };
  },

  async setupDiscord() {
    const ok = await registerDiscordCommands();
    return { success: ok };
  },

  async listLinks() {
    return db('chat_user_links')
      .leftJoin('users', 'users.id', 'chat_user_links.user_id')
      .select(
        'chat_user_links.*',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
        'users.username as username',
        'users.email as email',
      )
      .orderBy('chat_user_links.linked_at', 'desc');
  },

  async deactivateLink(id: string) {
    await db('chat_user_links').where('id', id).update({ active: false, updated_at: new Date() });
    return { message: 'Link deactivated' };
  },

  async listSessions() {
    return db('chat_sessions')
      .leftJoin('users', 'users.id', 'chat_sessions.user_id')
      .select(
        'chat_sessions.id',
        'chat_sessions.platform',
        'chat_sessions.platform_user_id',
        'chat_sessions.command',
        'chat_sessions.current_step',
        'chat_sessions.expires_at',
        'chat_sessions.updated_at',
        db.raw("CONCAT(users.first_name, ' ', users.last_name) as user_name"),
      )
      .where('chat_sessions.expires_at', '>', new Date())
      .orderBy('chat_sessions.updated_at', 'desc');
  },
};
