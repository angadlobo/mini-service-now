import { Response, NextFunction } from 'express';
import { approvalService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ApprovalController {
  async listMine(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await approvalService.listForUser(req.user!.id, options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async decide(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await approvalService.decide(req.params.id, req.body.state, req.body.comments || null, req.user!.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getForRecord(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const approvals = await approvalService.getForRecord(req.params.tableName, req.params.recordId);
      res.json(approvals);
    } catch (err) { next(err); }
  }
}

export const approvalController = new ApprovalController();
