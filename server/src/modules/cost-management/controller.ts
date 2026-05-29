import { Response, NextFunction } from 'express';
import { costCenterService, costItemService, chargebackService, getSummary } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class CostCenterController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await costCenterService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const center = await costCenterService.getById(req.params.id);
      if (!center) { res.status(404).json({ error: 'Cost center not found' }); return; }
      res.json(center);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const center = await costCenterService.create(req.body, req.user!.id);
      res.status(201).json(center);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const center = await costCenterService.update(req.params.id, req.body, req.user!.id);
      res.json(center);
    } catch (err) { next(err); }
  }
}

export class CostItemController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await costItemService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await costItemService.getById(req.params.id);
      if (!item) { res.status(404).json({ error: 'Cost item not found' }); return; }
      res.json(item);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await costItemService.create(req.body, req.user!.id);
      res.status(201).json(item);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await costItemService.update(req.params.id, req.body, req.user!.id);
      res.json(item);
    } catch (err) { next(err); }
  }
}

export class ChargebackController {
  async listRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rules = await chargebackService.listRules();
      res.json(rules);
    } catch (err) { next(err); }
  }

  async createRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await chargebackService.createRule(req.body);
      res.status(201).json(rule);
    } catch (err) { next(err); }
  }

  async updateRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await chargebackService.updateRule(req.params.id, req.body);
      res.json(rule);
    } catch (err) { next(err); }
  }

  async deleteRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await chargebackService.deleteRule(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async listRecords(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await chargebackService.listRecords(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async generateRecords(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const records = await chargebackService.generateRecords(req.body.period);
      res.status(201).json(records);
    } catch (err) { next(err); }
  }
}

export class SummaryController {
  async getSummary(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const summary = await getSummary();
      res.json(summary);
    } catch (err) { next(err); }
  }
}

export const costCenterController = new CostCenterController();
export const costItemController = new CostItemController();
export const chargebackController = new ChargebackController();
export const summaryController = new SummaryController();
