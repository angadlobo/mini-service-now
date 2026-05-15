import { Response, NextFunction } from 'express';
import { catalogService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class CatalogController {
  async listCategories(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await catalogService.listCategories()); } catch (err) { next(err); }
  }

  async listItems(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const categoryId = req.query.category_id as string | undefined;
      res.json(await catalogService.listItems(categoryId));
    } catch (err) { next(err); }
  }

  async getItem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await catalogService.getItem(req.params.id);
      if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
      res.json(item);
    } catch (err) { next(err); }
  }

  async createRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const request = await catalogService.createRequest(req.body.catalog_item_id, req.body.variables || {}, req.user!.id);
      res.status(201).json(request);
    } catch (err) { next(err); }
  }

  async listRequests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const myOnly = req.query.my === 'true';
      const result = await catalogService.listRequests(options, myOnly ? req.user!.id : undefined);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getRequest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const request = await catalogService.getRequest(req.params.id);
      if (!request) { res.status(404).json({ error: 'Request not found' }); return; }
      res.json(request);
    } catch (err) { next(err); }
  }
}

export const catalogController = new CatalogController();
