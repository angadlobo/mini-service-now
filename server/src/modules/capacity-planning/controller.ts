import { Response, NextFunction } from 'express';
import { resourcePoolService, allocationService, forecastService, getDashboard } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ResourcePoolController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await resourcePoolService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pool = await resourcePoolService.getById(req.params.id);
      if (!pool) { res.status(404).json({ error: 'Resource pool not found' }); return; }
      res.json(pool);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pool = await resourcePoolService.create(req.body, req.user!.id);
      res.status(201).json(pool);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const pool = await resourcePoolService.update(req.params.id, req.body, req.user!.id);
      res.json(pool);
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await resourcePoolService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export class AllocationController {
  async listByPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const allocations = await allocationService.listByPool(req.params.id);
      res.json(allocations);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const allocation = await allocationService.create(req.params.id, req.body, req.user!.id);
      res.status(201).json(allocation);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const allocation = await allocationService.update(req.params.id, req.body, req.user!.id);
      res.json(allocation);
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await allocationService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export class ForecastController {
  async listByPool(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const forecasts = await forecastService.listByPool(req.params.id);
      res.json(forecasts);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const forecast = await forecastService.create(req.params.id, req.body, req.user!.id);
      res.status(201).json(forecast);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const forecast = await forecastService.update(req.params.id, req.body, req.user!.id);
      res.json(forecast);
    } catch (err) { next(err); }
  }
}

export class DashboardController {
  async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dashboard = await getDashboard();
      res.json(dashboard);
    } catch (err) { next(err); }
  }
}

export const resourcePoolController = new ResourcePoolController();
export const allocationController = new AllocationController();
export const forecastController = new ForecastController();
export const dashboardController = new DashboardController();
