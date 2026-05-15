import { Request, Response, NextFunction } from 'express';
import { aiService } from './service';

export class AiController {
  // Providers
  async listProviders(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.listProviders()); } catch (err) { next(err); }
  }

  async getProvider(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.getProvider(req.params.id)); } catch (err) { next(err); }
  }

  async createProvider(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await aiService.createProvider(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async updateProvider(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.updateProvider(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async deleteProvider(req: Request, res: Response, next: NextFunction) {
    try { await aiService.deleteProvider(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async testProvider(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.testProvider(req.params.id)); } catch (err) { next(err); }
  }

  // Prompts
  async listPrompts(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.listPrompts()); } catch (err) { next(err); }
  }

  async getPrompt(req: Request, res: Response, next: NextFunction) {
    try {
      const prompt = await aiService.getPrompt(req.params.id);
      if (!prompt) return res.status(404).json({ message: 'Prompt not found' });
      res.json(prompt);
    } catch (err) { next(err); }
  }

  async getPromptsByUseCase(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.getPromptsByUseCase(req.params.useCase)); } catch (err) { next(err); }
  }

  async createPrompt(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await aiService.createPrompt(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async updatePrompt(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.updatePrompt(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async deletePrompt(req: Request, res: Response, next: NextFunction) {
    try { await aiService.deletePrompt(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  // Generate
  async generate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiService.generate(req.body.promptId, req.body.context || {}, (req as any).user.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // Feedback
  async feedback(req: Request, res: Response, next: NextFunction) {
    try {
      await aiService.submitFeedback(req.body.logId, req.body.feedback);
      res.json({ message: 'Feedback recorded' });
    } catch (err) { next(err); }
  }

  // Usage
  async getUsage(req: Request, res: Response, next: NextFunction) {
    try { res.json(await aiService.getUsageStats()); } catch (err) { next(err); }
  }
}

export const aiController = new AiController();
