import { Request, Response, NextFunction } from 'express';
import { dynamicCrudService } from './dynamic-crud.service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class DynamicCrudController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await dynamicCrudService.list(req.params.tableName, options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await dynamicCrudService.getById(req.params.tableName, req.params.id);
      res.json(record);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await dynamicCrudService.create(req.params.tableName, req.body, req.user!.id);
      res.status(201).json(record);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const record = await dynamicCrudService.update(req.params.tableName, req.params.id, req.body, req.user!.id);
      res.json(record);
    } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await dynamicCrudService.delete(req.params.tableName, req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getTransitions(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await dynamicCrudService.getTransitions(req.params.tableName, req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }
}

export const dynamicCrudController = new DynamicCrudController();
