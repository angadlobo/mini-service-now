import { db } from '../../config/database';
import { logger } from '../../config/logger';

async function getWhatsAppConfig() {
  const settings = await db('sys_settings').whereIn('key', [
    'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN',
  ]);
  const map: Record<string, string> = {};
  settings.forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

export async function sendWhatsAppInteractiveMessage(
  phoneNumber: string,
  interactive: Record<string, unknown>,
): Promise<boolean> {
  try {
    const config = await getWhatsAppConfig();
    if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_ACCESS_TOKEN) {
      logger.debug('WhatsApp not sent: API credentials not configured');
      return false;
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'interactive',
          interactive,
        }),
      },
    );

    if (!res.ok) {
      const body = await res.text();
      logger.error('WhatsApp interactive send failed', { status: res.status, body });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('WhatsApp interactive send failed', err);
    return false;
  }
}

export async function sendWhatsAppMessage(phoneNumber: string, text: string): Promise<boolean> {
  try {
    const config = await getWhatsAppConfig();
    if (!config.WHATSAPP_PHONE_NUMBER_ID || !config.WHATSAPP_ACCESS_TOKEN) {
      logger.debug('WhatsApp not sent: API credentials not configured');
      return false;
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${config.WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: phoneNumber,
          type: 'text',
          text: { body: text },
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      logger.error('WhatsApp send failed', { status: res.status, body });
      return false;
    }

    return true;
  } catch (err) {
    logger.error('WhatsApp send failed', err);
    return false;
  }
}
