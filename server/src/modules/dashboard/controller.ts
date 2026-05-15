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
}

export const dashboardController = new DashboardController();
