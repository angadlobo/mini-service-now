import { Response, NextFunction } from 'express';
import { bcPlanService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class BCPlanController {
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await bcPlanService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plan = await bcPlanService.getById(req.params.id);
      if (!plan) { res.status(404).json({ error: 'BC plan not found' }); return; }
      res.json(plan);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plan = await bcPlanService.create(req.body, req.user!.id);
      res.status(201).json(plan);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const plan = await bcPlanService.update(req.params.id, req.body, req.user!.id);
      res.json(plan);
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await bcPlanService.delete(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Tasks ──

  async getTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tasks = await bcPlanService.getTasks(req.params.id);
      res.json(tasks);
    } catch (err) { next(err); }
  }

  async addTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await bcPlanService.addTask(req.params.id, req.body);
      res.status(201).json(task);
    } catch (err) { next(err); }
  }

  async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await bcPlanService.updateTask(req.params.taskId, req.body);
      res.json(task);
    } catch (err) { next(err); }
  }

  async deleteTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await bcPlanService.deleteTask(req.params.taskId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Tests ──

  async getTests(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const tests = await bcPlanService.getTests(req.params.id);
      res.json(tests);
    } catch (err) { next(err); }
  }

  async addTest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const test = await bcPlanService.addTest(req.params.id, req.body);
      res.status(201).json(test);
    } catch (err) { next(err); }
  }

  async updateTest(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const test = await bcPlanService.updateTest(req.params.testId, req.body);
      res.json(test);
    } catch (err) { next(err); }
  }
}

export const bcPlanController = new BCPlanController();
