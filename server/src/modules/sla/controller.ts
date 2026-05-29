import { Request, Response, NextFunction } from 'express';
import { slaService } from './service';

export class SlaController {
  async listDefinitions(req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.listDefinitions(req.query.table_name as string | undefined)); } catch (err) { next(err); }
  }

  async getDefinition(req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.getDefinition(req.params.id)); } catch (err) { next(err); }
  }

  async createDefinition(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await slaService.createDefinition(req.body)); } catch (err) { next(err); }
  }

  async updateDefinition(req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.updateDefinition(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async deleteDefinition(req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.deleteDefinition(req.params.id)); } catch (err) { next(err); }
  }

  async dashboard(req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.getDashboard(req.query.table_name as string | undefined)); } catch (err) { next(err); }
  }

  async atRisk(_req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.getAtRisk()); } catch (err) { next(err); }
  }

  async breached(_req: Request, res: Response, next: NextFunction) {
    try { res.json(await slaService.getBreached()); } catch (err) { next(err); }
  }
}

export const slaController = new SlaController();
