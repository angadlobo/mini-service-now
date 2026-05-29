import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../types';
import { majorIncidentService } from './service';

export class MajorIncidentController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await majorIncidentService.list(req.query.status as string | undefined)); } catch (err) { next(err); }
  }

  async dashboard(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await majorIncidentService.getDashboard()); } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await majorIncidentService.getById(req.params.id)); } catch (err) { next(err); }
  }

  async declare(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await majorIncidentService.declare(req.body, req.user!.id)); } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await majorIncidentService.update(req.params.id, req.body, req.user!.id)); } catch (err) { next(err); }
  }

  async postUpdate(req: AuthRequest, res: Response, next: NextFunction) {
    try { res.status(201).json(await majorIncidentService.postUpdate(req.params.id, req.body, req.user!.id)); } catch (err) { next(err); }
  }
}

export const majorIncidentController = new MajorIncidentController();
