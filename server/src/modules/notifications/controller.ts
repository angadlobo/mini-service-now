import { Response, NextFunction } from 'express';
import { notificationService } from './service';
import { AuthRequest } from '../../types';

export class NotificationController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const notifications = await notificationService.listForUser(req.user!.id);
      const unreadCount = await notificationService.getUnreadCount(req.user!.id);
      res.json({ notifications, unreadCount });
    } catch (err) { next(err); }
  }

  async markRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAsRead(req.params.id, req.user!.id);
      res.json({ message: 'Marked as read' });
    } catch (err) { next(err); }
  }

  async markAllRead(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await notificationService.markAllRead(req.user!.id);
      res.json({ message: 'All marked as read' });
    } catch (err) { next(err); }
  }
}

export const notificationController = new NotificationController();
