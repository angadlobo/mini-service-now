import { db } from '../../config/database';
import { logger } from '../../config/logger';

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: string = 'HTML',
  replyMarkup?: Record<string, unknown>,
): Promise<boolean> {
  try {
    const setting = await db('sys_settings').where('key', 'TELEGRAM_BOT_TOKEN').first();
    const botToken = setting?.value;
    if (!botToken) {
      logger.debug('Telegram not sent: bot token not configured');
      return false;
    }

    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: parseMode,
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error('Telegram send failed', { status: res.status, body });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('Telegram send failed', err);
    return false;
  }
}
