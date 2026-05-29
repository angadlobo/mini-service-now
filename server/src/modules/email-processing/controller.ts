import { Request, Response, NextFunction } from 'express';
import { emailProcessingService } from './service';

export class EmailProcessingController {
  // Public inbound webhook (called by an email provider's inbound-parse / route).
  async inbound(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await emailProcessingService.processInbound(req.body)); } catch (err) { next(err); }
  }

  async listAccounts(_req: Request, res: Response, next: NextFunction) {
    try { res.json(await emailProcessingService.listAccounts()); } catch (err) { next(err); }
  }
  async createAccount(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await emailProcessingService.createAccount(req.body)); } catch (err) { next(err); }
  }
  async updateAccount(req: Request, res: Response, next: NextFunction) {
    try { res.json(await emailProcessingService.updateAccount(req.params.id, req.body)); } catch (err) { next(err); }
  }
  async deleteAccount(req: Request, res: Response, next: NextFunction) {
    try { res.json(await emailProcessingService.deleteAccount(req.params.id)); } catch (err) { next(err); }
  }

  async listRules(req: Request, res: Response, next: NextFunction) {
    try { res.json(await emailProcessingService.listRules(req.query.account_id as string | undefined)); } catch (err) { next(err); }
  }
  async createRule(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await emailProcessingService.createRule(req.body)); } catch (err) { next(err); }
  }
  async deleteRule(req: Request, res: Response, next: NextFunction) {
    try { res.json(await emailProcessingService.deleteRule(req.params.id)); } catch (err) { next(err); }
  }

  async processedLog(_req: Request, res: Response, next: NextFunction) {
    try { res.json(await emailProcessingService.getProcessedLog()); } catch (err) { next(err); }
  }
}

export const emailProcessingController = new EmailProcessingController();
