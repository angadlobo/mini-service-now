import crypto from 'crypto';
import { db } from '../../../config/database';
import { logger } from '../../../config/logger';
import { PlatformAdapter, InboundMessage, OutboundMessage } from '../types';

async function getWhatsAppConfig(): Promise<Record<string, string>> {
  const settings = await db('sys_settings').whereIn('key', [
    'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_VERIFY_TOKEN',
  ]);
  const map: Record<string, string> = {};
  settings.forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

export const whatsappAdapter: PlatformAdapter = {
  platform: 'whatsapp',

  parseWebhook(body: any): InboundMessage | null {
    // WhatsApp Cloud API webhook structure
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const message = value?.messages?.[0];

    if (!message?.text?.body || !message?.from) return null;

    return {
      platform: 'whatsapp',
      platformUserId: message.from,
      platformChatId: message.from, // WhatsApp uses phone number as chat ID
      platformUsername: value?.contacts?.[0]?.profile?.name || undefined,
      text: message.text.body,
      raw: body,
    };
  },

  async verifySignature(body: unknown, headers: Record<string, string>): Promise<boolean> {
    const signature = headers['x-hub-signature-256'];
    if (!signature) return true; // Some setups don't require verification

    const config = await getWhatsAppConfig();
    const appSecret = config.WHATSAPP_ACCESS_TOKEN;
    if (!appSecret) return true;

    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const hmac = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
    const expected = `sha256=${hmac}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  async sendMessage(chatId: string, message: OutboundMessage): Promise<boolean> {
    try {
      const config = await getWhatsAppConfig();
      if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_ACCESS_TOKEN) {
        logger.debug('WhatsApp chatbot: credentials not configured');
        return false;
      }

      let payload: Record<string, unknown>;

      // Use interactive message if extras specify it
      if (message.extras?.interactive) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: chatId,
          type: 'interactive',
          interactive: message.extras.interactive,
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: chatId,
          type: 'text',
          text: { body: message.text },
        };
      }

      const res = await fetch(
        `https://graph.facebook.com/v21.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) {
        const body = await res.text();
        logger.error('WhatsApp chatbot send failed', { status: res.status, body });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('WhatsApp chatbot send failed', err);
      return false;
    }
  },
};

/**
 * Verify WhatsApp webhook subscription (GET request).
 * Returns the challenge string if the verify token matches.
 */
export async function verifyWhatsAppWebhook(query: Record<string, string>): Promise<string | null> {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode !== 'subscribe' || !token || !challenge) return null;

  const config = await getWhatsAppConfig();
  if (token === config.WHATSAPP_VERIFY_TOKEN) {
    return challenge;
  }

  return null;
}
