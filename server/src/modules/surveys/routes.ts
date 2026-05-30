import { Router } from 'express';
import { surveyController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSurveySchema, updateSurveySchema, createQuestionSchema, updateQuestionSchema, submitResponseSchema, shareViEmailSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Core CRUD ──
router.get('/', (req, res, next) => surveyController.list(req as any, res, next));
router.post('/', requireRole('admin'), validate(createSurveySchema), (req, res, next) => surveyController.create(req as any, res, next));
router.get('/:id', (req, res, next) => surveyController.getById(req as any, res, next));
router.put('/:id', requireRole('admin'), validate(updateSurveySchema), (req, res, next) => surveyController.update(req as any, res, next));
router.delete('/:id', requireRole('admin'), (req, res, next) => surveyController.delete(req as any, res, next));

// ── Questions ──
router.get('/:id/questions', (req, res, next) => surveyController.getQuestions(req as any, res, next));
router.post('/:id/questions', requireRole('admin'), validate(createQuestionSchema), (req, res, next) => surveyController.addQuestion(req as any, res, next));
router.put('/questions/:questionId', requireRole('admin'), validate(updateQuestionSchema), (req, res, next) => surveyController.updateQuestion(req as any, res, next));
router.delete('/questions/:questionId', requireRole('admin'), (req, res, next) => surveyController.deleteQuestion(req as any, res, next));
router.put('/:id/questions/reorder', requireRole('admin'), (req, res, next) => surveyController.reorderQuestions(req as any, res, next));

// ── Responses ──
router.post('/:id/respond', validate(submitResponseSchema), (req, res, next) => surveyController.submitResponse(req as any, res, next));
router.get('/:id/responses/:responseId', (req, res, next) => surveyController.getResponseDetail(req as any, res, next));
router.get('/:id/responses', (req, res, next) => surveyController.getResponses(req as any, res, next));

// ── Analytics ──
router.get('/:id/analytics', (req, res, next) => surveyController.getAnalytics(req as any, res, next));

// ── Email Sharing ──
router.post('/:id/share', requireRole('admin'), validate(shareViEmailSchema), (req, res, next) => surveyController.shareViaEmail(req as any, res, next));
router.get('/:id/link', (req, res, next) => surveyController.getSurveyLink(req as any, res, next));

export default router;
