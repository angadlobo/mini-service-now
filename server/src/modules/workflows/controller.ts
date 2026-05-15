import { Request, Response, NextFunction } from 'express';
import { workflowService } from './service';
import { parseQueryParams } from '../../core/query-builder';

export class WorkflowController {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.list(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await workflowService.getById(req.params.id);
      if (!rule) return res.status(404).json({ message: 'Workflow rule not found' });
      res.json(rule);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await workflowService.create(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.update(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await workflowService.delete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async getExecutions(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.getExecutions(parseQueryParams(req.query))); } catch (err) { next(err); }
  }
}

export const workflowController = new WorkflowController();
