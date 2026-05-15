import { Response, NextFunction } from 'express';
import { changeService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ChangeController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await changeService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.getById(req.params.id);
      if (!change) { res.status(404).json({ error: 'Change not found' }); return; }
      res.json(change);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.create(req.body, req.user!.id);
      res.status(201).json(change);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.update(req.params.id, req.body, req.user!.id);
      res.json(change);
    } catch (err) { next(err); }
  }
}

export const changeController = new ChangeController();
