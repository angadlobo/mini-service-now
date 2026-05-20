import { db } from '../../config/database';
import { sendEmail } from '../../core/channels/email-channel';
import { sendSlackMessage } from '../../core/channels/slack-channel';
import { sendTelegramMessage } from '../../core/channels/telegram-channel';
import { sendWhatsAppMessage } from '../../core/channels/whatsapp-channel';

export class NotificationPrefsService {
  async getChannels() {
    return db('notification_channels').orderBy('name');
  }

  async createChannel(data: Record<string, unknown>) {
    const [channel] = await db('notification_channels').insert(data).returning('*');
    return channel;
  }

  async updateChannel(id: string, data: Record<string, unknown>) {
    const [updated] = await db('notification_channels').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async deleteChannel(id: string) {
    await db('notification_channels').where('id', id).del();
  }

  async getUserPreferences(userId: string) {
    return db('notification_preferences')
      .join('notification_channels', 'notification_channels.id', 'notification_preferences.channel_id')
      .where('notification_preferences.user_id', userId)
      .select('notification_preferences.*', 'notification_channels.name as channel_name', 'notification_channels.type as channel_type');
  }

  async setUserPreference(userId: string, channelId: string, events: string[], active: boolean) {
    const existing = await db('notification_preferences')
      .where({ user_id: userId, channel_id: channelId })
      .first();

    if (existing) {
      await db('notification_preferences')
        .where('id', existing.id)
        .update({ events: JSON.stringify(events), active, updated_at: new Date() });
    } else {
      await db('notification_preferences')
        .insert({ user_id: userId, channel_id: channelId, events: JSON.stringify(events), active });
    }
  }
  async testChannel(id: string): Promise<{ success: boolean; message: string }> {
    const channel = await db('notification_channels').where('id', id).first();
    if (!channel) throw new Error('Channel not found');

    const config = typeof channel.config === 'string' ? JSON.parse(channel.config) : (channel.config || {});
    const testMessage = 'Test notification from Mini ServiceNow';

    try {
      switch (channel.type) {
        case 'email': {
          const to = config.test_email || config.to || 'test@example.com';
          const ok = await sendEmail(to, 'Test Notification', testMessage);
          return { success: ok, message: ok ? `Test email sent to ${to}` : 'Email send failed — check SMTP settings' };
        }
        case 'slack': {
          const ok = await sendSlackMessage(testMessage);
          return { success: ok, message: ok ? 'Test message sent to Slack' : 'Slack send failed — check webhook URL' };
        }
        case 'telegram': {
          const chatId = config.chat_id || config.default_chat_id;
          if (!chatId) return { success: false, message: 'No chat_id configured' };
          const ok = await sendTelegramMessage(chatId, testMessage);
          return { success: ok, message: ok ? `Test message sent to Telegram chat ${chatId}` : 'Telegram send failed — check bot token and chat ID' };
        }
        case 'whatsapp': {
          const phone = config.test_phone || config.phone_number;
          if (!phone) return { success: false, message: 'No phone_number configured' };
          const ok = await sendWhatsAppMessage(phone, testMessage);
          return { success: ok, message: ok ? `Test message sent to WhatsApp ${phone}` : 'WhatsApp send failed — check API credentials' };
        }
        default:
          return { success: false, message: `Unsupported channel type: ${channel.type}` };
      }
    } catch (err: any) {
      return { success: false, message: err.message || 'Test failed' };
    }
  }
}

export const notificationPrefsService = new NotificationPrefsService();
