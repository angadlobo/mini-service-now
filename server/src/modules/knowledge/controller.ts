import { Response, NextFunction } from 'express';
import { knowledgeService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class KnowledgeController {
  async listCategories(_req: AuthRequest, res: Response, next: NextFunction) {
    try { res.json(await knowledgeService.listCategories()); } catch (err) { next(err); }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const fullTextSearch = req.query.q as string | undefined;
      const result = await knowledgeService.listArticles({ ...options, fullTextSearch });
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const article = await knowledgeService.getById(req.params.id);
      if (!article) { res.status(404).json({ error: 'Article not found' }); return; }
      await knowledgeService.incrementViewCount(article.id);
      res.json(article);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const article = await knowledgeService.create(req.body, req.user!.id);
      res.status(201).json(article);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const article = await knowledgeService.update(req.params.id, req.body);
      res.json(article);
    } catch (err) { next(err); }
  }

  async markHelpful(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      await knowledgeService.markHelpful(req.params.id);
      res.json({ message: 'Marked as helpful' });
    } catch (err) { next(err); }
  }
}

export const knowledgeController = new KnowledgeController();
