import { Response, NextFunction } from 'express';
import { changeService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ChangeController {
  // ── Core CRUD ──
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await changeService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.getById(req.params.id);
      if (!change) { res.status(404).json({ error: 'Change not found' }); return; }
      res.json(change);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.create(req.body, req.user!.id);
      res.status(201).json(change);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.update(req.params.id, req.body, req.user!.id);
      res.json(change);
    } catch (err) { next(err); }
  }

  // ── Risk & Impact ──
  async assessRisk(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await changeService.assessRisk(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async aiRiskAnalysis(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await changeService.aiRiskAnalysis(req.params.id, req.user!.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Conflict Detection ──
  async resolveConflict(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await changeService.resolveConflict(req.params.conflictId, req.body.resolution, req.user!.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getCalendar(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { start_date, end_date } = req.query;
      if (!start_date || !end_date) { res.status(400).json({ error: 'start_date and end_date required' }); return; }
      const result = await changeService.getChangeCalendar(start_date as string, end_date as string);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Approval Rules ──
  async listApprovalRules(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rules = await changeService.listApprovalRules();
      res.json(rules);
    } catch (err) { next(err); }
  }

  async createApprovalRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await changeService.createApprovalRule(req.body, req.user!.id);
      res.status(201).json(rule);
    } catch (err) { next(err); }
  }

  async updateApprovalRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const rule = await changeService.updateApprovalRule(req.params.id, req.body);
      res.json(rule);
    } catch (err) { next(err); }
  }

  async deleteApprovalRule(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.deleteApprovalRule(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Templates ──
  async listTemplates(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const templates = await changeService.listTemplates(options);
      res.json(templates);
    } catch (err) { next(err); }
  }

  async getTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const template = await changeService.getTemplate(req.params.id);
      if (!template) { res.status(404).json({ error: 'Template not found' }); return; }
      res.json(template);
    } catch (err) { next(err); }
  }

  async createTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const template = await changeService.createTemplate(req.body, req.user!.id);
      res.status(201).json(template);
    } catch (err) { next(err); }
  }

  async updateTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const template = await changeService.updateTemplate(req.params.id, req.body);
      res.json(template);
    } catch (err) { next(err); }
  }

  async deleteTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.deleteTemplate(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async listStandardCatalog(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const catalog = await changeService.listStandardCatalog();
      res.json(catalog);
    } catch (err) { next(err); }
  }

  async createFromTemplate(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const change = await changeService.createFromTemplate(req.params.templateId, req.body, req.user!.id);
      res.status(201).json(change);
    } catch (err) { next(err); }
  }

  // ── CAB Management ──
  async listCabMeetings(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const meetings = await changeService.listCabMeetings(options);
      res.json(meetings);
    } catch (err) { next(err); }
  }

  async getCabMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await changeService.getCabMeeting(req.params.id);
      res.json(meeting);
    } catch (err) { next(err); }
  }

  async createCabMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await changeService.createCabMeeting(req.body, req.user!.id);
      res.status(201).json(meeting);
    } catch (err) { next(err); }
  }

  async updateCabMeeting(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const meeting = await changeService.updateCabMeeting(req.params.id, req.body);
      res.json(meeting);
    } catch (err) { next(err); }
  }

  async addToAgenda(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const item = await changeService.addToAgenda(req.params.id, req.body.change_id);
      res.status(201).json(item);
    } catch (err) { next(err); }
  }

  async removeFromAgenda(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.removeFromAgenda(req.params.id, req.params.changeId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async recordCabDecision(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await changeService.recordCabDecision(
        req.params.itemId, req.body.decision, req.body.discussion_notes || null, req.body.votes || {}, req.user!.id
      );
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Maintenance & Blackout Windows ──
  async listMaintenanceWindows(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const windows = await changeService.listMaintenanceWindows();
      res.json(windows);
    } catch (err) { next(err); }
  }

  async createMaintenanceWindow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const window = await changeService.createMaintenanceWindow(req.body, req.user!.id);
      res.status(201).json(window);
    } catch (err) { next(err); }
  }

  async updateMaintenanceWindow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const window = await changeService.updateMaintenanceWindow(req.params.id, req.body);
      res.json(window);
    } catch (err) { next(err); }
  }

  async deleteMaintenanceWindow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.deleteMaintenanceWindow(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async listBlackoutWindows(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const windows = await changeService.listBlackoutWindows();
      res.json(windows);
    } catch (err) { next(err); }
  }

  async createBlackoutWindow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const window = await changeService.createBlackoutWindow(req.body, req.user!.id);
      res.status(201).json(window);
    } catch (err) { next(err); }
  }

  async updateBlackoutWindow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const window = await changeService.updateBlackoutWindow(req.params.id, req.body);
      res.json(window);
    } catch (err) { next(err); }
  }

  async deleteBlackoutWindow(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.deleteBlackoutWindow(req.params.id);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Linking ──
  async linkIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await changeService.linkIncident(req.params.id, req.body.incident_id, req.body.relationship || 'related_to');
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async unlinkIncident(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.unlinkIncident(req.params.id, req.params.incidentId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  async linkProblem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const link = await changeService.linkProblem(req.params.id, req.body.problem_id, req.body.relationship || 'addresses');
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async unlinkProblem(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await changeService.unlinkProblem(req.params.id, req.params.problemId);
      res.status(204).send();
    } catch (err) { next(err); }
  }

  // ── Metrics ──
  async getMetrics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { start_date, end_date } = req.query;
      const metrics = await changeService.getMetrics(start_date as string, end_date as string);
      res.json(metrics);
    } catch (err) { next(err); }
  }
}

export const changeController = new ChangeController();
