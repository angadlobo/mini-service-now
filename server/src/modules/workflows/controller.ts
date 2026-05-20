import { Request, Response, NextFunction } from 'express';
import { workflowService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { eventBus } from '../../core/event-bus';

export class WorkflowController {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.list(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await workflowService.getById(req.params.id);
      if (!rule) return res.status(404).json({ message: 'Workflow rule not found' });
      res.json(rule);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await workflowService.create(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.update(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await workflowService.delete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async getExecutions(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.getExecutions(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getExecutionsForRecord(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.getExecutionsForRecord(req.params.tableName, req.params.recordId)); } catch (err) { next(err); }
  }

  // ── Form Tasks ──────────────────────────────────────

  async listFormTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const tasks = await workflowService.listFormTasks((req as any).user.id);
      res.json(tasks);
    } catch (err) { next(err); }
  }

  async submitFormTask(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await workflowService.submitFormTask(req.params.id, req.body, (req as any).user.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Simulate ────────────────────────────────────────

  async simulateWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await workflowService.simulateWorkflow(req.params.id, req.body.record || {});
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Export/Import ───────────────────────────────────

  async exportWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const pkg = await workflowService.exportWorkflow(req.params.id);
      res.json(pkg);
    } catch (err) { next(err); }
  }

  async importWorkflow(req: Request, res: Response, next: NextFunction) {
    try {
      const rule = await workflowService.importWorkflow(req.body, (req as any).user.id);
      res.status(201).json(rule);
    } catch (err) { next(err); }
  }

  // ── Monitoring ──────────────────────────────────────

  async getMonitoringStats(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.getMonitoringStats()); } catch (err) { next(err); }
  }

  async getActionLogs(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.getActionLogs(req.params.executionId)); } catch (err) { next(err); }
  }

  async retryExecution(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.retryExecution(req.params.executionId)); } catch (err) { next(err); }
  }

  // ── Webhooks ────────────────────────────────────────

  async listWebhooks(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.listWebhooks()); } catch (err) { next(err); }
  }

  async createWebhook(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await workflowService.createWebhook(req.body.workflow_rule_id)); } catch (err) { next(err); }
  }

  async deleteWebhook(req: Request, res: Response, next: NextFunction) {
    try { await workflowService.deleteWebhook(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  /** Public webhook endpoint -- no authentication required */
  async handleWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const slug = req.params.slug;

      eventBus.emitWebhookReceived(
        'webhook',
        '',
        { _webhook_slug: slug, ...req.body },
        'system',
      );

      res.json({ received: true });
    } catch (err) { next(err); }
  }

  // ── Triggers ────────────────────────────────────────

  async listTriggers(req: Request, res: Response, next: NextFunction) {
    try { res.json(await workflowService.listTriggers(req.query.workflow_rule_id as string)); } catch (err) { next(err); }
  }

  async createTrigger(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await workflowService.createTrigger(req.body)); } catch (err) { next(err); }
  }

  async deleteTrigger(req: Request, res: Response, next: NextFunction) {
    try { await workflowService.deleteTrigger(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }
}

export const workflowController = new WorkflowController();
