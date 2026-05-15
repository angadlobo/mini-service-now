import { Request, Response, NextFunction } from 'express';
import { integrationService } from './service';
import { parseQueryParams } from '../../core/query-builder';

export class IntegrationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.list(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const i = await integrationService.getById(req.params.id);
      if (!i) return res.status(404).json({ message: 'Integration not found' });
      res.json(i);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await integrationService.create(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.update(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await integrationService.delete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.getLogs(req.params.id, parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async test(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.testWebhook(req.params.id)); } catch (err) { next(err); }
  }
}

export const integrationController = new IntegrationController();
