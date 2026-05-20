import { db } from '../../../config/database';
import { logger } from '../../../config/logger';
import { PlatformAdapter, InboundMessage, OutboundMessage } from '../types';

/** Cache for Microsoft OAuth token */
let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTeamsConfig(): Promise<Record<string, string>> {
  const settings = await db('sys_settings').whereIn('key', [
    'TEAMS_APP_ID', 'TEAMS_APP_PASSWORD',
  ]);
  const map: Record<string, string> = {};
  settings.forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

/**
 * Get a Bot Framework OAuth token using client credentials.
 * Caches the token until near expiry.
 */
async function getBotFrameworkToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const config = await getTeamsConfig();
  if (!config.TEAMS_APP_ID || !config.TEAMS_APP_PASSWORD) return null;

  try {
    const res = await fetch('https://login.microsoftonline.com/botframework.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: config.TEAMS_APP_ID,
        client_secret: config.TEAMS_APP_PASSWORD,
        scope: 'https://api.botframework.com/.default',
      }).toString(),
    });

    if (!res.ok) {
      logger.error('Teams OAuth token failed', { status: res.status });
      return null;
    }

    const data = await res.json() as any;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };
    return data.access_token;
  } catch (err) {
    logger.error('Teams OAuth token error', err);
    return null;
  }
}

export const teamsAdapter: PlatformAdapter = {
  platform: 'teams',

  parseWebhook(body: any): InboundMessage | null {
    if (!body?.type || body.type !== 'message') return null;
    if (!body.text || !body.from?.id) return null;

    // Strip the bot mention tag if present (e.g. "<at>BotName</at> /help")
    const text = body.text.replace(/<at>.*?<\/at>\s*/g, '').trim();

    return {
      platform: 'teams',
      platformUserId: body.from.id,
      platformChatId: body.conversation.id,
      platformUsername: body.from.name || undefined,
      text,
      raw: body,
    };
  },

  async verifySignature(_body: unknown, headers: Record<string, string>): Promise<boolean> {
    // Full JWT validation against Bot Framework JWKS is complex.
    // For now, check that Authorization header is present.
    // Production should validate the JWT properly.
    const auth = headers['authorization'];
    if (!auth) return false;
    return auth.startsWith('Bearer ');
  },

  async sendMessage(chatId: string, message: OutboundMessage): Promise<boolean> {
    try {
      const token = await getBotFrameworkToken();
      if (!token) {
        logger.debug('Teams chatbot: could not obtain bot token');
        return false;
      }

      // The raw payload contains serviceUrl needed for replies
      const serviceUrl = (message.extras?.serviceUrl as string) || 'https://smba.trafficmanager.net/teams/';

      const payload = {
        type: 'message',
        text: message.text,
        ...(message.extras?.adaptiveCard ? {
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: message.extras.adaptiveCard,
          }],
        } : {}),
      };

      const url = `${serviceUrl.replace(/\/$/, '')}/v3/conversations/${chatId}/activities`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error('Teams chatbot send failed', { status: res.status, body });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Teams chatbot send failed', err);
      return false;
    }
  },
};
