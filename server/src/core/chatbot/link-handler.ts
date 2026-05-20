import bcrypt from 'bcryptjs';
import { db } from '../../config/database';
import { logger } from '../../config/logger';
import { InboundMessage, OutboundMessage } from './types';
import { formatLinkSuccess, formatLinkFailed, formatError } from './formatters';

/**
 * Handle /link <username> <password> command.
 * Verifies credentials and upserts a chat_user_links record.
 */
export async function handleLink(msg: InboundMessage, args: string): Promise<OutboundMessage> {
  const parts = args.trim().split(/\s+/);
  if (parts.length < 2) {
    return { text: formatError('Usage: /link <username> <password>') };
  }

  const [username, password] = parts;

  try {
    const user = await db('users').where('username', username).first();
    if (!user || !user.password_hash) {
      return { text: formatLinkFailed() };
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return { text: formatLinkFailed() };
    }

    // Upsert chat_user_links
    const existing = await db('chat_user_links')
      .where({ platform: msg.platform, platform_user_id: msg.platformUserId })
      .first();

    if (existing) {
      await db('chat_user_links')
        .where('id', existing.id)
        .update({
          user_id: user.id,
          platform_chat_id: msg.platformChatId,
          platform_username: msg.platformUsername || null,
          active: true,
          linked_at: new Date(),
          updated_at: new Date(),
        });
    } else {
      await db('chat_user_links').insert({
        platform: msg.platform,
        platform_user_id: msg.platformUserId,
        platform_chat_id: msg.platformChatId,
        platform_username: msg.platformUsername || null,
        user_id: user.id,
      });
    }

    logger.info(`Chat account linked: ${msg.platform}/${msg.platformUserId} → user ${username}`);
    return { text: formatLinkSuccess(username) };
  } catch (err) {
    logger.error('Link handler error', err);
    return { text: formatError('An error occurred while linking your account.') };
  }
}
