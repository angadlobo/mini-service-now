import { db } from '../../config/database';

export class NotificationService {
  async listForUser(userId: string, limit = 20) {
    return db('sys_notification')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db('sys_notification')
      .where({ user_id: userId, read: false })
      .count('* as count')
      .first();
    return Number(result?.count || 0);
  }

  async markAsRead(id: string, userId: string) {
    await db('sys_notification')
      .where({ id, user_id: userId })
      .update({ read: true });
  }

  async markAllRead(userId: string) {
    await db('sys_notification')
      .where({ user_id: userId, read: false })
      .update({ read: true });
  }
}

export const notificationService = new NotificationService();
