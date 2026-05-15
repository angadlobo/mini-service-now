import { Router } from 'express';
import { catalogController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createRequestSchema } from './schema';

const router = Router();

router.use(authenticate);
router.get('/categories', (req, res, next) => catalogController.listCategories(req as any, res, next));
router.get('/items', (req, res, next) => catalogController.listItems(req as any, res, next));
router.get('/items/:id', (req, res, next) => catalogController.getItem(req as any, res, next));
router.post('/requests', validate(createRequestSchema), (req, res, next) => catalogController.createRequest(req as any, res, next));
router.get('/requests', (req, res, next) => catalogController.listRequests(req as any, res, next));
router.get('/requests/:id', (req, res, next) => catalogController.getRequest(req as any, res, next));

export default router;
