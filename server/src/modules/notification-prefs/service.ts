import { db } from '../../config/database';

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
}

export const notificationPrefsService = new NotificationPrefsService();
