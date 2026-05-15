import { Router } from 'express';
import { aiController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Providers (admin)
router.get('/providers', authenticate, requireRole('admin'), (req, res, next) => aiController.listProviders(req, res, next));
router.get('/providers/:id', authenticate, requireRole('admin'), (req, res, next) => aiController.getProvider(req, res, next));
router.post('/providers', authenticate, requireRole('admin'), (req, res, next) => aiController.createProvider(req, res, next));
router.put('/providers/:id', authenticate, requireRole('admin'), (req, res, next) => aiController.updateProvider(req, res, next));
router.delete('/providers/:id', authenticate, requireRole('admin'), (req, res, next) => aiController.deleteProvider(req, res, next));
router.post('/providers/:id/test', authenticate, requireRole('admin'), (req, res, next) => aiController.testProvider(req, res, next));

// Prompts
router.get('/prompts', authenticate, (req, res, next) => aiController.listPrompts(req, res, next));
router.get('/prompts/use-case/:useCase', authenticate, (req, res, next) => aiController.getPromptsByUseCase(req, res, next));
router.get('/prompts/:id', authenticate, (req, res, next) => aiController.getPrompt(req, res, next));
router.post('/prompts', authenticate, requireRole('admin'), (req, res, next) => aiController.createPrompt(req, res, next));
router.put('/prompts/:id', authenticate, requireRole('admin'), (req, res, next) => aiController.updatePrompt(req, res, next));
router.delete('/prompts/:id', authenticate, requireRole('admin'), (req, res, next) => aiController.deletePrompt(req, res, next));

// Generate (any authenticated user)
router.post('/generate', authenticate, (req, res, next) => aiController.generate(req, res, next));
router.post('/feedback', authenticate, (req, res, next) => aiController.feedback(req, res, next));

// Usage (admin)
router.get('/usage', authenticate, requireRole('admin'), (req, res, next) => aiController.getUsage(req, res, next));

export default router;
