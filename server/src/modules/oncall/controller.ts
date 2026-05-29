import { Response, NextFunction } from 'express';
import { onCallService, escalationService } from './service';
import { AuthRequest } from '../../types';

export class OnCallController {
  async listSchedules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.listSchedules();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.getSchedule(req.params.id);
      if (!result) { res.status(404).json({ error: 'Schedule not found' }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async createSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.createSchedule(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.updateSchedule(req.params.id, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteSchedule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await onCallService.deleteSchedule(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  async getRotations(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.getRotations(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async addRotation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.addRotation(req.params.id, req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateRotation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.updateRotation(req.params.id, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteRotation(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await onCallService.deleteRotation(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  async addOverride(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.addOverride(req.params.id, req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async deleteOverride(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await onCallService.deleteOverride(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  async getWhosOnCall(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await onCallService.getWhosOnCall();
      res.json(result);
    } catch (err) { next(err); }
  }

  // Escalation policies
  async listPolicies(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await escalationService.listPolicies();
      res.json(result);
    } catch (err) { next(err); }
  }

  async getPolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await escalationService.getPolicy(req.params.id);
      if (!result) { res.status(404).json({ error: 'Policy not found' }); return; }
      res.json(result);
    } catch (err) { next(err); }
  }

  async createPolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await escalationService.createPolicy(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updatePolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await escalationService.updatePolicy(req.params.id, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }

  async deletePolicy(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await escalationService.deletePolicy(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  async addLevel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await escalationService.addLevel(req.params.id, req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  }

  async updateLevel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await escalationService.updateLevel(req.params.id, req.body);
      res.json(result);
    } catch (err) { next(err); }
  }

  async deleteLevel(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await escalationService.deleteLevel(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }
}

export const onCallController = new OnCallController();
