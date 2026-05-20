import { Response, NextFunction } from 'express';
import { dashboardService } from './service';
import { AuthRequest } from '../../types';

export class DashboardController {
  async getStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = await dashboardService.getStats();
      res.json(stats);
    } catch (err) { next(err); }
  }

  async getMyWork(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const work = await dashboardService.getMyWork(req.user!.id);
      res.json(work);
    } catch (err) { next(err); }
  }

  async getLayout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const layout = await dashboardService.getUserLayout(req.user!.id);
      res.json(layout);
    } catch (err) { next(err); }
  }

  async saveLayout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const layout = await dashboardService.saveUserLayout(req.user!.id, req.body.layout);
      res.json(layout);
    } catch (err) { next(err); }
  }

  async getWidgetData(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getWidgetData(req.body.widget);
      res.json(data);
    } catch (err) { next(err); }
  }
}

export const dashboardController = new DashboardController();
