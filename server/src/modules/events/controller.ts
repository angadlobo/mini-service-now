import { Response, NextFunction } from 'express';
import { eventService, alertRuleService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class EventController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await eventService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await eventService.getById(req.params.id);
      if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
      res.json(event);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await eventService.create(req.body, req.user?.id);
      res.status(201).json(event);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await eventService.update(req.params.id, req.body, req.user!.id);
      res.json(event);
    } catch (err) { next(err); }
  }

  async acknowledge(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await eventService.acknowledge(req.params.id, req.user!.id);
      res.json(event);
    } catch (err) { next(err); }
  }

  async resolve(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const event = await eventService.resolve(req.params.id, req.user!.id);
      res.json(event);
    } catch (err) { next(err); }
  }

  async getCorrelations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const correlations = await eventService.getCorrelations(req.params.id);
      res.json(correlations);
    } catch (err) { next(err); }
  }

  async addCorrelation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const correlation = await eventService.addCorrelation(
        req.params.id,
        req.body.child_event_id,
        req.body.correlation_type,
      );
      res.status(201).json(correlation);
    } catch (err) { next(err); }
  }
}

export class AlertRuleController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rules = await alertRuleService.list();
      res.json(rules);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await alertRuleService.getById(req.params.id);
      if (!rule) { res.status(404).json({ error: 'Alert rule not found' }); return; }
      res.json(rule);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await alertRuleService.create(req.body);
      res.status(201).json(rule);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await alertRuleService.update(req.params.id, req.body);
      res.json(rule);
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await alertRuleService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }
}

export const eventController = new EventController();
export const alertRuleController = new AlertRuleController();
