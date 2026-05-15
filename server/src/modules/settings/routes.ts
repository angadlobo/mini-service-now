import { Router } from 'express';
import { settingsController } from './controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('admin'), (req, res, next) => settingsController.getAll(req, res, next));
router.get('/:category', authenticate, requireRole('admin'), (req, res, next) => settingsController.getByCategory(req, res, next));
router.put('/', authenticate, requireRole('admin'), (req, res, next) => settingsController.update(req, res, next));

export default router;
