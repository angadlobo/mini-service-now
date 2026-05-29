import { Response, NextFunction } from 'express';
import { demandService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class DemandController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await demandService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const demand = await demandService.getById(req.params.id);
      if (!demand) { res.status(404).json({ error: 'Demand not found' }); return; }
      res.json(demand);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const demand = await demandService.create(req.body, req.user!.id);
      res.status(201).json(demand);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const demand = await demandService.update(req.params.id, req.body, req.user!.id);
      res.json(demand);
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await demandService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async getPipeline(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pipeline = await demandService.getPipeline();
      res.json(pipeline);
    } catch (err) { next(err); }
  }

  // ── Scores ──

  async getScores(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const scores = await demandService.getScores(req.params.id);
      res.json(scores);
    } catch (err) { next(err); }
  }

  async setScore(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const score = await demandService.setScore(req.params.id, req.body, req.user!.id);
      res.status(201).json(score);
    } catch (err) { next(err); }
  }
}

export const demandController = new DemandController();
