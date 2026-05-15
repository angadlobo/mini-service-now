import { Response, NextFunction } from 'express';
import { incidentService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class IncidentController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await incidentService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.getById(req.params.id);
      if (!incident) { res.status(404).json({ error: 'Incident not found' }); return; }
      res.json(incident);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.create(req.body, req.user!.id);
      res.status(201).json(incident);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const incident = await incidentService.update(req.params.id, req.body, req.user!.id);
      res.json(incident);
    } catch (err) { next(err); }
  }
}

export const incidentController = new IncidentController();
