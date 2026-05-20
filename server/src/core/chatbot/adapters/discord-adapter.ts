import crypto from 'crypto';
import { db } from '../../../config/database';
import { logger } from '../../../config/logger';
import { PlatformAdapter, InboundMessage, OutboundMessage } from '../types';

async function getDiscordConfig(): Promise<Record<string, string>> {
  const settings = await db('sys_settings').whereIn('key', [
    'DISCORD_BOT_TOKEN', 'DISCORD_APPLICATION_ID', 'DISCORD_PUBLIC_KEY',
  ]);
  const map: Record<string, string> = {};
  settings.forEach((s: any) => { map[s.key] = s.value; });
  return map;
}

export const discordAdapter: PlatformAdapter = {
  platform: 'discord',

  parseWebhook(body: any): InboundMessage | null {
    // Type 2 = APPLICATION_COMMAND (slash command)
    if (body?.type === 2) {
      const commandName = body.data?.name || '';
      const options = body.data?.options || [];
      // Build text from command name + options
      let text = `/${commandName}`;
      for (const opt of options) {
        text += ` ${opt.value || ''}`;
      }

      return {
        platform: 'discord',
        platformUserId: body.member?.user?.id || body.user?.id || '',
        platformChatId: body.channel_id || '',
        platformUsername: body.member?.user?.username || body.user?.username,
        text: text.trim(),
        raw: body,
      };
    }

    // Type 3 = MESSAGE_COMPONENT (button click)
    if (body?.type === 3) {
      return {
        platform: 'discord',
        platformUserId: body.member?.user?.id || body.user?.id || '',
        platformChatId: body.channel_id || '',
        platformUsername: body.member?.user?.username || body.user?.username,
        text: body.data?.custom_id || '',
        raw: body,
      };
    }

    return null;
  },

  async verifySignature(body: unknown, headers: Record<string, string>): Promise<boolean> {
    const config = await getDiscordConfig();
    const publicKey = config.DISCORD_PUBLIC_KEY;
    if (!publicKey) return true; // Not configured

    const signature = headers['x-signature-ed25519'];
    const timestamp = headers['x-signature-timestamp'];
    if (!signature || !timestamp) return false;

    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const message = Buffer.from(timestamp + rawBody);

    try {
      return crypto.verify(
        null,
        message,
        { key: Buffer.from(publicKey, 'hex'), format: 'der', type: 'spki' },
        Buffer.from(signature, 'hex'),
      );
    } catch {
      // Ed25519 verification can fail with invalid key format
      // Fallback: try using subtle crypto
      try {
        const key = await crypto.subtle.importKey(
          'raw',
          Buffer.from(publicKey, 'hex'),
          { name: 'Ed25519' },
          false,
          ['verify'],
        );
        return await crypto.subtle.verify(
          'Ed25519',
          key,
          Buffer.from(signature, 'hex'),
          message,
        );
      } catch {
        logger.error('Discord signature verification failed');
        return false;
      }
    }
  },

  async sendMessage(chatId: string, message: OutboundMessage): Promise<boolean> {
    try {
      const config = await getDiscordConfig();
      const botToken = config.DISCORD_BOT_TOKEN;
      if (!botToken) {
        logger.debug('Discord chatbot: bot token not configured');
        return false;
      }

      const payload: Record<string, unknown> = {
        content: message.text,
      };

      if (message.extras?.embeds) {
        payload.embeds = message.extras.embeds;
      }
      if (message.extras?.components) {
        payload.components = message.extras.components;
      }

      const res = await fetch(`https://discord.com/api/v10/channels/${chatId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bot ${botToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error('Discord chatbot send failed', { status: res.status, body });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Discord chatbot send failed', err);
      return false;
    }
  },
};

/**
 * Build a Discord interaction response (returned directly in HTTP body).
 */
export function buildInteractionResponse(type: number, content?: string, extras?: Record<string, unknown>): object {
  if (type === 1) {
    // PONG response
    return { type: 1 };
  }

  // Type 4 = CHANNEL_MESSAGE_WITH_SOURCE
  const data: Record<string, unknown> = {};
  if (content) data.content = content;
  if (extras?.embeds) data.embeds = extras.embeds;
  if (extras?.components) data.components = extras.components;

  return { type, data };
}
