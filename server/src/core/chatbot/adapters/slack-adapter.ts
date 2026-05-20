import crypto from 'crypto';
import { db } from '../../../config/database';
import { logger } from '../../../config/logger';
import { PlatformAdapter, InboundMessage, OutboundMessage } from '../types';

export const slackAdapter: PlatformAdapter = {
  platform: 'slack',

  parseWebhook(body: any): InboundMessage | null {
    // Events API
    if (body?.event?.type === 'message' && body.event.text && !body.event.bot_id) {
      return {
        platform: 'slack',
        platformUserId: body.event.user,
        platformChatId: body.event.channel,
        text: body.event.text,
        raw: body,
      };
    }

    // Slash commands (form-encoded, parsed by express)
    if (body?.command && body?.user_id) {
      const text = body.command + (body.text ? ' ' + body.text : '');
      return {
        platform: 'slack',
        platformUserId: body.user_id,
        platformChatId: body.channel_id,
        platformUsername: body.user_name,
        text,
        raw: body,
      };
    }

    return null;
  },

  async verifySignature(body: unknown, headers: Record<string, string>): Promise<boolean> {
    const setting = await db('sys_settings').where('key', 'SLACK_SIGNING_SECRET').first();
    const signingSecret = setting?.value;
    if (!signingSecret) return true; // Not configured, skip verification

    const timestamp = headers['x-slack-request-timestamp'];
    const signature = headers['x-slack-signature'];
    if (!timestamp || !signature) return false;

    // Reject if timestamp is more than 5 minutes old
    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - parseInt(timestamp, 10)) > 300) return false;

    const rawBody = typeof body === 'string' ? body : JSON.stringify(body);
    const baseString = `v0:${timestamp}:${rawBody}`;
    const hmac = crypto.createHmac('sha256', signingSecret).update(baseString).digest('hex');
    const computed = `v0=${hmac}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature));
    } catch {
      return false;
    }
  },

  async sendMessage(chatId: string, message: OutboundMessage): Promise<boolean> {
    try {
      const setting = await db('sys_settings').where('key', 'SLACK_BOT_TOKEN').first();
      const botToken = setting?.value;
      if (!botToken) {
        logger.debug('Slack chatbot: bot token not configured');
        return false;
      }

      const payload: Record<string, unknown> = {
        channel: chatId,
        text: message.text,
      };

      // Add Block Kit blocks if provided
      if (message.extras?.blocks) {
        payload.blocks = message.extras.blocks;
      }

      const res = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${botToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.text();
        logger.error('Slack chatbot send failed', { status: res.status, body });
        return false;
      }

      const result = await res.json() as any;
      if (!result.ok) {
        logger.error('Slack API error', { error: result.error });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('Slack chatbot send failed', err);
      return false;
    }
  },
};
