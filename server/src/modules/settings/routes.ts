import { Router } from 'express';
import { settingsController } from './controller';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/auth';

const router = Router();

// Public branding endpoint (no auth required for login/register pages)
router.get('/branding', (req, res, next) => settingsController.getBranding(req, res, next));

// Public catalog settings endpoint (currency config needed on catalog browse page)
router.get('/catalog', (req, res, next) => settingsController.getCatalogSettings(req, res, next));

router.get('/', authenticate, requireRole('admin'), (req, res, next) => settingsController.getAll(req, res, next));
router.get('/:category', authenticate, requireRole('admin'), (req, res, next) => settingsController.getByCategory(req, res, next));
router.put('/', authenticate, requireRole('admin'), (req, res, next) => settingsController.update(req, res, next));

export default router;
