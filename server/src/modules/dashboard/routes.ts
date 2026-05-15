import { Router } from 'express';
import { dashboardController } from './controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/stats', (req, res, next) => dashboardController.getStats(req as any, res, next));
router.get('/my-work', (req, res, next) => dashboardController.getMyWork(req as any, res, next));

export default router;
