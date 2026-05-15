import { Router } from 'express';
import { notificationController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', (req, res, next) => notificationController.list(req as any, res, next));
router.put('/:id/read', (req, res, next) => notificationController.markRead(req as any, res, next));
router.put('/read-all', (req, res, next) => notificationController.markAllRead(req as any, res, next));

export default router;
