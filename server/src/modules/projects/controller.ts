import { Response, NextFunction } from 'express';
import {
  projectService, projectTaskService,
  getMembers, addMember, removeMember,
  getMilestones, addMilestone, updateMilestone,
  getTimeEntries, addTimeEntry,
} from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class ProjectController {
  // ── Projects CRUD ──────────────────────────────────

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await projectService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.getById(req.params.id);
      if (!project) { res.status(404).json({ error: 'Project not found' }); return; }
      res.json(project);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.create(req.body, req.user!.id);
      res.status(201).json(project);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const project = await projectService.update(req.params.id, req.body, req.user!.id);
      res.json(project);
    } catch (err) { next(err); }
  }

  // ── Tasks ──────────────────────────────────────────

  async listTasks(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await projectTaskService.listByProject(req.params.id, options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await projectTaskService.getById(req.params.taskId);
      if (!task) { res.status(404).json({ error: 'Task not found' }); return; }
      res.json(task);
    } catch (err) { next(err); }
  }

  async createTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await projectTaskService.create(req.params.id, req.body, req.user!.id);
      res.status(201).json(task);
    } catch (err) { next(err); }
  }

  async updateTask(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const task = await projectTaskService.update(req.params.taskId, req.body, req.user!.id);
      res.json(task);
    } catch (err) { next(err); }
  }

  // ── Members ────────────────────────────────────────

  async listMembers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const members = await getMembers(req.params.id);
      res.json(members);
    } catch (err) { next(err); }
  }

  async addMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const member = await addMember(req.params.id, req.body.user_id, req.body.role);
      res.status(201).json(member);
    } catch (err) { next(err); }
  }

  async removeMember(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await removeMember(req.params.id, req.body.user_id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Milestones ─────────────────────────────────────

  async listMilestones(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const milestones = await getMilestones(req.params.id);
      res.json(milestones);
    } catch (err) { next(err); }
  }

  async addMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const milestone = await addMilestone(req.params.id, req.body);
      res.status(201).json(milestone);
    } catch (err) { next(err); }
  }

  async updateMilestone(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const milestone = await updateMilestone(req.params.milestoneId, req.body);
      res.json(milestone);
    } catch (err) { next(err); }
  }

  // ── Time Entries ───────────────────────────────────

  async listTimeEntries(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const entries = await getTimeEntries(req.params.id);
      res.json(entries);
    } catch (err) { next(err); }
  }

  async addTimeEntry(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const entry = await addTimeEntry(req.params.id, req.body, req.user!.id);
      res.status(201).json(entry);
    } catch (err) { next(err); }
  }
}

export const projectController = new ProjectController();
