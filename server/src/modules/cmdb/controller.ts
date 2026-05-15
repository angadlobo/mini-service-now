import { Request, Response, NextFunction } from 'express';
import { cmdbService } from './service';
import { parseQueryParams } from '../../core/query-builder';

export class CmdbController {
  async listTypes(req: Request, res: Response, next: NextFunction) {
    try { res.json(await cmdbService.listTypes()); } catch (err) { next(err); }
  }

  async createType(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await cmdbService.createType(req.body)); } catch (err) { next(err); }
  }

  async updateType(req: Request, res: Response, next: NextFunction) {
    try { res.json(await cmdbService.updateType(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async listCis(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query);
      res.json(await cmdbService.listCis(options));
    } catch (err) { next(err); }
  }

  async getCiById(req: Request, res: Response, next: NextFunction) {
    try {
      const ci = await cmdbService.getCiById(req.params.id);
      if (!ci) return res.status(404).json({ message: 'CI not found' });
      res.json(ci);
    } catch (err) { next(err); }
  }

  async createCi(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await cmdbService.createCi(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async updateCi(req: Request, res: Response, next: NextFunction) {
    try { res.json(await cmdbService.updateCi(req.params.id, req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async getRelationships(req: Request, res: Response, next: NextFunction) {
    try { res.json(await cmdbService.getRelationships(req.params.id)); } catch (err) { next(err); }
  }

  async addRelationship(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await cmdbService.addRelationship(req.params.id, req.body.child_ci_id, req.body.type || 'depends_on')); } catch (err) { next(err); }
  }

  async removeRelationship(req: Request, res: Response, next: NextFunction) {
    try { await cmdbService.removeRelationship(req.params.relId); res.json({ message: 'Removed' }); } catch (err) { next(err); }
  }

  async getImpact(req: Request, res: Response, next: NextFunction) {
    try { res.json(await cmdbService.getImpactedCis(req.params.id)); } catch (err) { next(err); }
  }
}

export const cmdbController = new CmdbController();
