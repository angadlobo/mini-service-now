import { db } from '../../../config/database';
import { logger } from '../../../config/logger';
import { PlatformAdapter, InboundMessage, OutboundMessage } from '../types';

export const telegramAdapter: PlatformAdapter = {
  platform: 'telegram',

  parseWebhook(body: any): InboundMessage | null {
    const message = body?.message;
    if (!message?.text || !message?.from?.id) return null;

    return {
      platform: 'telegram',
      platformUserId: String(message.from.id),
      platformChatId: String(message.chat.id),
      platformUsername: message.from.username || undefined,
      text: message.text,
      raw: body,
    };
  },

  async verifySignature(_body: unknown, headers: Record<string, string>): Promise<boolean> {
    // Telegram supports optional secret_token header verification
    const secretToken = headers['x-telegram-bot-api-secret-token'];
    if (!secretToken) return true; // No secret configured, allow

    const setting = await db('sys_settings').where('key', 'TELEGRAM_WEBHOOK_SECRET').first();
    if (!setting?.value) return true; // No secret configured server-side

    return secretToken === setting.value;
  },

  async sendMessage(chatId: string, message: OutboundMessage): Promise<boolean> {
    try {
      const setting = await db('sys_settings').where('key', 'TELEGRAM_BOT_TOKEN').first();
      const botToken = setting?.value;
      if (!botToken) {
        logger.debug('Telegram chatbot: bot token not configured');
        return false;
      }

      const payload: Record<string, unknown> = {
        chat_id: chatId,
        text: message.text,
        parse_mode: 'HTML',
      };

      // Add reply_markup if provided (inline keyboard)
      if (message.extras?.reply_markup) {
        payload.reply_markup = message.extras.reply_markup;
      }

      const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error('Telegram chatbot send failed', { status: res.status, body });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Telegram chatbot send failed', err);
      return false;
    }
  },
};
