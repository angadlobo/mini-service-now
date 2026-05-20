import { Request, Response, NextFunction } from 'express';
import { reportingService } from './service';
import { parseQueryParams } from '../../core/query-builder';

export class ReportingController {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json(await reportingService.list(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const report = await reportingService.getById(req.params.id);
      if (!report) return res.status(404).json({ message: 'Report not found' });
      res.json(report);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await reportingService.create(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json(await reportingService.update(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await reportingService.delete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async run(req: Request, res: Response, next: NextFunction) {
    try { res.json(await reportingService.run(req.params.id)); } catch (err) { next(err); }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction) {
    try {
      const csv = await reportingService.exportCsv(req.params.id);
      const report = await reportingService.getById(req.params.id);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${report?.name || 'report'}.csv"`);
      res.send(csv);
    } catch (err) { next(err); }
  }

  async getTableColumns(req: Request, res: Response, next: NextFunction) {
    try { res.json(await reportingService.getTableColumns(req.params.tableName)); } catch (err) { next(err); }
  }

  async getSchedules(req: Request, res: Response, next: NextFunction) {
    try { res.json(await reportingService.getSchedules(req.params.id)); } catch (err) { next(err); }
  }

  async createSchedule(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await reportingService.createSchedule({ ...req.body, report_id: req.params.id })); } catch (err) { next(err); }
  }
}

export const reportingController = new ReportingController();
