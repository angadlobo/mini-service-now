import { Response, NextFunction } from 'express';
import { surveyService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { AuthRequest } from '../../types';

export class SurveyController {
  // ── Core CRUD ──
  async list(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await surveyService.list(options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const survey = await surveyService.getById(req.params.id);
      if (!survey) { res.status(404).json({ error: 'Survey not found' }); return; }
      res.json(survey);
    } catch (err) { next(err); }
  }

  async create(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const survey = await surveyService.create(req.body, req.user!.id);
      res.status(201).json(survey);
    } catch (err) { next(err); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const survey = await surveyService.update(req.params.id, req.body, req.user!.id);
      res.json(survey);
    } catch (err) { next(err); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.delete(req.params.id);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Questions ──
  async getQuestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const questions = await surveyService.getQuestions(req.params.id);
      res.json(questions);
    } catch (err) { next(err); }
  }

  async addQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const question = await surveyService.addQuestion(req.params.id, req.body);
      res.status(201).json(question);
    } catch (err) { next(err); }
  }

  async updateQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const question = await surveyService.updateQuestion(req.params.questionId, req.body);
      res.json(question);
    } catch (err) { next(err); }
  }

  async deleteQuestion(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.deleteQuestion(req.params.questionId);
      res.json(result);
    } catch (err) { next(err); }
  }

  async reorderQuestions(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const questions = await surveyService.reorderQuestions(req.params.id, req.body.questionIds);
      res.json(questions);
    } catch (err) { next(err); }
  }

  // ── Responses ──
  async submitResponse(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const response = await surveyService.submitResponse(req.params.id, req.body, req.user!.id);
      res.status(201).json(response);
    } catch (err) { next(err); }
  }

  async getResponses(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const options = parseQueryParams(req.query as Record<string, unknown>);
      const result = await surveyService.getResponses(req.params.id, options);
      res.json(result);
    } catch (err) { next(err); }
  }

  async getResponseDetail(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const result = await surveyService.getResponseDetail(req.params.responseId);
      res.json(result);
    } catch (err) { next(err); }
  }

  // ── Analytics ──
  async getAnalytics(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const analytics = await surveyService.getAnalytics(req.params.id);
      res.json(analytics);
    } catch (err) { next(err); }
  }
}

export const surveyController = new SurveyController();
