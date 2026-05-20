import { Response, NextFunction } from 'express';
import { releaseService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ReleaseController {
  // ── Core CRUD ──
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await releaseService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const release = await releaseService.getById(req.params.id);
      if (!release) { res.status(404).json({ error: 'Release not found' }); return; }
      res.json(release);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const release = await releaseService.create(req.body, req.user!.id);
      res.status(201).json(release);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const release = await releaseService.update(req.params.id, req.body, req.user!.id);
      res.json(release);
    } catch (err) { next(err); }
  }

  // ── Changes ──
  async listChanges(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const changes = await releaseService.listChanges(req.params.id);
      res.json(changes);
    } catch (err) { next(err); }
  }

  async addChange(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await releaseService.addChange(req.params.id, req.body.change_id, req.body.sequence_order);
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async removeChange(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await releaseService.removeChange(req.params.id, req.params.changeId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── CIs ──
  async addCi(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await releaseService.addCi(req.params.id, req.body.ci_id);
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async removeCi(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await releaseService.removeCi(req.params.id, req.params.ciId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Stakeholders ──
  async addStakeholder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await releaseService.addStakeholder(req.params.id, req.body.user_id, req.body.role);
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async removeStakeholder(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await releaseService.removeStakeholder(req.params.id, req.params.userId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Deployment Actions ──
  async startDeployment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const release = await releaseService.startDeployment(req.params.id, req.user!.id);
      res.json(release);
    } catch (err) { next(err); }
  }

  async completeDeployment(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const release = await releaseService.completeDeployment(req.params.id, req.user!.id, req.body.notes);
      res.json(release);
    } catch (err) { next(err); }
  }

  async rollback(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const release = await releaseService.rollback(req.params.id, req.user!.id, req.body.reason);
      res.json(release);
    } catch (err) { next(err); }
  }

  // ── Calendar & Metrics ──
  async getCalendar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { start_date, end_date } = req.query;
      if (!start_date || !end_date) { res.status(400).json({ error: 'start_date and end_date required' }); return; }
      const result = await releaseService.getCalendar(start_date as string, end_date as string);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { start_date, end_date } = req.query;
      const metrics = await releaseService.getMetrics(start_date as string, end_date as string);
      res.json(metrics);
    } catch (err) { next(err); }
  }
}

export const releaseController = new ReleaseController();
