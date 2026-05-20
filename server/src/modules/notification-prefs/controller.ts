import { Request, Response, NextFunction } from 'express';
import { notificationPrefsService } from './service';

export class NotificationPrefsController {
  async getChannels(req: Request, res: Response, next: NextFunction) {
    try { res.json(await notificationPrefsService.getChannels()); } catch (err) { next(err); }
  }

  async createChannel(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await notificationPrefsService.createChannel(req.body)); } catch (err) { next(err); }
  }

  async updateChannel(req: Request, res: Response, next: NextFunction) {
    try { res.json(await notificationPrefsService.updateChannel(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async deleteChannel(req: Request, res: Response, next: NextFunction) {
    try { await notificationPrefsService.deleteChannel(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async getUserPreferences(req: Request, res: Response, next: NextFunction) {
    try { res.json(await notificationPrefsService.getUserPreferences((req as any).user.id)); } catch (err) { next(err); }
  }

  async setPreference(req: Request, res: Response, next: NextFunction) {
    try {
      await notificationPrefsService.setUserPreference(
        (req as any).user.id,
        req.body.channel_id,
        req.body.events,
        req.body.active ?? true,
      );
      res.json({ message: 'Preference updated' });
    } catch (err) { next(err); }
  }

  async testChannel(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await notificationPrefsService.testChannel(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const notificationPrefsController = new NotificationPrefsController();
