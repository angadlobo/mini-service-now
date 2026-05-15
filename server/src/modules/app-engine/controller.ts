import { Request, Response, NextFunction } from 'express';
import { appEngineService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class AppEngineController {
  // ── Apps ───────────────────────────────────────────
  async listApps(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await appEngineService.listApps(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getApp(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await appEngineService.getAppById(req.params.id);
      res.json(app);
    } catch (err) { next(err); }
  }

  async createApp(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const app = await appEngineService.createApp(req.body, req.user!.id);
      res.status(201).json(app);
    } catch (err) { next(err); }
  }

  async updateApp(req: Request, res: Response, next: NextFunction) {
    try {
      const app = await appEngineService.updateApp(req.params.id, req.body);
      res.json(app);
    } catch (err) { next(err); }
  }

  async deleteApp(req: Request, res: Response, next: NextFunction) {
    try {
      await appEngineService.deleteApp(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  // ── Tables ─────────────────────────────────────────
  async listTables(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const app_id = req.query.app_id as string | undefined;
      const result = await appEngineService.listTables({ ...options, app_id });
      res.json(result);
    } catch (err) { next(err); }
  }

  async getTable(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await appEngineService.getTableById(req.params.id);
      res.json(table);
    } catch (err) { next(err); }
  }

  async getTableByName(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await appEngineService.getTableByName(req.params.name);
      res.json(table);
    } catch (err) { next(err); }
  }

  async createTable(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const table = await appEngineService.createTable(req.body, req.user!.id);
      res.status(201).json(table);
    } catch (err) { next(err); }
  }

  async updateTable(req: Request, res: Response, next: NextFunction) {
    try {
      const table = await appEngineService.updateTable(req.params.id, req.body);
      res.json(table);
    } catch (err) { next(err); }
  }

  async deleteTable(req: Request, res: Response, next: NextFunction) {
    try {
      await appEngineService.deleteTable(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  async createDbTable(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appEngineService.createDatabaseTable(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  async syncSchema(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await appEngineService.syncSchema(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Pages ──────────────────────────────────────────
  async listPages(req: Request, res: Response, next: NextFunction) {
    try {
      const appId = req.query.app_id as string;
      if (!appId) { res.status(400).json({ error: 'app_id required' }); return; }
      const pages = await appEngineService.listPages(appId);
      res.json(pages);
    } catch (err) { next(err); }
  }

  async createPage(req: Request, res: Response, next: NextFunction) {
    try {
      const page = await appEngineService.createPage(req.body);
      res.status(201).json(page);
    } catch (err) { next(err); }
  }

  async updatePage(req: Request, res: Response, next: NextFunction) {
    try {
      const page = await appEngineService.updatePage(req.params.id, req.body);
      res.json(page);
    } catch (err) { next(err); }
  }

  async deletePage(req: Request, res: Response, next: NextFunction) {
    try {
      await appEngineService.deletePage(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  // ── Dashboards ─────────────────────────────────────
  async listDashboards(req: Request, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const app_id = req.query.app_id as string | undefined;
      const result = await appEngineService.listDashboards({ ...options, app_id });
      res.json(result);
    } catch (err) { next(err); }
  }

  async getDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await appEngineService.getDashboardById(req.params.id);
      res.json(dashboard);
    } catch (err) { next(err); }
  }

  async createDashboard(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const dashboard = await appEngineService.createDashboard(req.body, req.user!.id);
      res.status(201).json(dashboard);
    } catch (err) { next(err); }
  }

  async updateDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const dashboard = await appEngineService.updateDashboard(req.params.id, req.body);
      res.json(dashboard);
    } catch (err) { next(err); }
  }

  async deleteDashboard(req: Request, res: Response, next: NextFunction) {
    try {
      await appEngineService.deleteDashboard(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }

  async getWidgetData(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await appEngineService.getWidgetData(req.params.id, req.params.widgetId);
      res.json(data);
    } catch (err) { next(err); }
  }

  // ── Registered Tables ──────────────────────────────
  async getRegisteredTables(_req: Request, res: Response) {
    const tables = appEngineService.getRegisteredTables();
    res.json(tables);
  }
}

export const appEngineController = new AppEngineController();
