import { Request, Response, NextFunction } from 'express';
import { problemService } from './service';
import { parseQueryParams } from '../../core/query-builder';

export class ProblemController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query);
      const result = await problemService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const problem = await problemService.getById(req.params.id);
      if (!problem) return res.status(404).json({ message: 'Problem not found' });
      res.json(problem);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const problem = await problemService.create(req.body, (req as any).user.id);
      res.status(201).json(problem);
    } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const problem = await problemService.update(req.params.id, req.body, (req as any).user.id);
      res.json(problem);
    } catch (err) { next(err); }
  }

  async linkIncident(req: Request, res: Response, next: NextFunction) {
    try {
      await problemService.linkIncident(req.params.id, req.params.incidentId);
      res.json({ message: 'Linked' });
    } catch (err) { next(err); }
  }

  async unlinkIncident(req: Request, res: Response, next: NextFunction) {
    try {
      await problemService.unlinkIncident(req.params.id, req.params.incidentId);
      res.json({ message: 'Unlinked' });
    } catch (err) { next(err); }
  }

  async getLinkedIncidents(req: Request, res: Response, next: NextFunction) {
    try {
      const incidents = await problemService.getLinkedIncidents(req.params.id);
      res.json(incidents);
    } catch (err) { next(err); }
  }

  async linkChange(req: Request, res: Response, next: NextFunction) {
    try {
      await problemService.linkChange(req.params.id, req.params.changeId);
      res.json({ message: 'Linked' });
    } catch (err) { next(err); }
  }

  async unlinkChange(req: Request, res: Response, next: NextFunction) {
    try {
      await problemService.unlinkChange(req.params.id, req.params.changeId);
      res.json({ message: 'Unlinked' });
    } catch (err) { next(err); }
  }

  async getLinkedChanges(req: Request, res: Response, next: NextFunction) {
    try {
      const changes = await problemService.getLinkedChanges(req.params.id);
      res.json(changes);
    } catch (err) { next(err); }
  }
}

export const problemController = new ProblemController();
