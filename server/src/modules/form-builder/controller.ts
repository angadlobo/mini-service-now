import { Request, Response, NextFunction } from 'express';
import { formBuilderService } from './service';
import { parseQueryParams } from '../../core/query-builder';

export class FormBuilderController {
  async listTemplates(req: Request, res: Response, next: NextFunction) {
    try { res.json(await formBuilderService.listTemplates(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getTemplateById(req: Request, res: Response, next: NextFunction) {
    try { res.json(await formBuilderService.getTemplateById(req.params.id)); } catch (err) { next(err); }
  }

  async createTemplate(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await formBuilderService.createTemplate(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async updateTemplate(req: Request, res: Response, next: NextFunction) {
    try { res.json(await formBuilderService.updateTemplate(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async deleteTemplate(req: Request, res: Response, next: NextFunction) {
    try { await formBuilderService.deleteTemplate(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async submitForm(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await formBuilderService.submitForm(req.params.id, req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async getSubmissions(req: Request, res: Response, next: NextFunction) {
    try { res.json(await formBuilderService.getSubmissions(req.params.id, parseQueryParams(req.query))); } catch (err) { next(err); }
  }
}

export const formBuilderController = new FormBuilderController();
