import { db } from '../config/database';
import { logger } from '../config/logger';
import { sendEmail } from './channels/email-channel';
import { sendSlackMessage } from './channels/slack-channel';
import { sendTelegramMessage } from './channels/telegram-channel';
import { sendWhatsAppMessage } from './channels/whatsapp-channel';

export async function notify(
  userId: string,
  title: string,
  body: string,
  link?: string,
  eventType?: string
): Promise<void> {
  try {
    // Always create in-app notification
    await db('sys_notification').insert({
      user_id: userId,
      title,
      body,
      link: link || null,
    });

    // Dispatch to external channels if event type provided
    if (eventType) {
      await dispatchToChannels(userId, title, body, eventType);
    }
  } catch (err) {
    logger.error('Failed to create notification', err);
  }
}

async function dispatchToChannels(
  userId: string,
  title: string,
  body: string,
  eventType: string
): Promise<void> {
  try {
    // Get user's active channel preferences that match this event
    const preferences = await db('notification_preferences')
      .join('notification_channels', 'notification_channels.id', 'notification_preferences.channel_id')
      .where('notification_preferences.user_id', userId)
      .where('notification_preferences.active', true)
      .where('notification_channels.active', true)
      .select(
        'notification_channels.type',
        'notification_channels.config',
        'notification_preferences.events'
      );

    const message = `${title}\n${body}`;

    for (const pref of preferences) {
      const events = typeof pref.events === 'string' ? JSON.parse(pref.events) : pref.events;
      if (!Array.isArray(events) || !events.includes(eventType)) continue;

      const config = typeof pref.config === 'string' ? JSON.parse(pref.config) : (pref.config || {});

      switch (pref.type) {
        case 'email':
          if (config.to) {
            await sendEmail(config.to, title, body);
          } else {
            // Try to get user email
            const user = await db('users').where('id', userId).first();
            if (user?.email) {
              await sendEmail(user.email, title, body);
            }
          }
          break;

        case 'slack':
          await sendSlackMessage(message);
          break;

        case 'telegram':
          if (config.chat_id) {
            await sendTelegramMessage(config.chat_id, message);
          }
          break;

        case 'whatsapp':
          if (config.phone_number) {
            await sendWhatsAppMessage(config.phone_number, message);
          }
          break;

        default:
          break;
      }
    }
  } catch (err) {
    logger.error('Failed to dispatch to channels', err);
  }
}

export async function notifyAssignment(
  userId: string,
  tableName: string,
  recordNumber: string,
  description: string
): Promise<void> {
  await notify(
    userId,
    `Assigned: ${recordNumber}`,
    description,
    `/${tableName}/${recordNumber}`,
    'record.assigned'
  );
}

export async function notifyApprovalRequest(
  approverId: string,
  tableName: string,
  recordNumber: string,
  description: string
): Promise<void> {
  await notify(
    approverId,
    `Approval Required: ${recordNumber}`,
    description,
    '/approvals',
    'approval.requested'
  );
}
