import { Request, Response, NextFunction } from 'express';
import { settingsService } from './service';

export class SettingsController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getAll();
      // Mask encrypted values
      const masked = settings.map((s: any) => ({
        ...s,
        value: s.encrypted && s.value ? '••••••••' : s.value,
      }));
      res.json(masked);
    } catch (err) { next(err); }
  }

  async getByCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getByCategory(req.params.category);
      const masked = settings.map((s: any) => ({
        ...s,
        value: s.encrypted && s.value ? '••••••••' : s.value,
      }));
      res.json(masked);
    } catch (err) { next(err); }
  }

  async getBranding(_req: Request, res: Response, next: NextFunction) {
    try {
      const settings = await settingsService.getByCategory('branding');
      const result: Record<string, string> = {};
      settings.forEach((s: any) => { result[s.key] = s.value; });
      res.json(result);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      await settingsService.bulkUpdate(req.body.settings);
      res.json({ message: 'Settings updated' });
    } catch (err) { next(err); }
  }
}

export const settingsController = new SettingsController();
