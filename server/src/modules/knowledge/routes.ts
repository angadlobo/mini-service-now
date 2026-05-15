import { Router } from 'express';
import { knowledgeController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createArticleSchema, updateArticleSchema } from './schema';

const router = Router();

router.use(authenticate);
router.get('/categories', (req, res, next) => knowledgeController.listCategories(req as any, res, next));
router.get('/', (req, res, next) => knowledgeController.list(req as any, res, next));
router.get('/:id', (req, res, next) => knowledgeController.getById(req as any, res, next));
router.post('/', requireRole('itil', 'knowledge_manager'), validate(createArticleSchema), (req, res, next) => knowledgeController.create(req as any, res, next));
router.put('/:id', requireRole('itil', 'knowledge_manager'), validate(updateArticleSchema), (req, res, next) => knowledgeController.update(req as any, res, next));
router.post('/:id/helpful', (req, res, next) => knowledgeController.markHelpful(req as any, res, next));

export default router;
