import { Router } from 'express';
import { integrationController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('admin'), (req, res, next) => integrationController.list(req, res, next));
router.get('/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.getById(req, res, next));
router.post('/', authenticate, requireRole('admin'), (req, res, next) => integrationController.create(req, res, next));
router.put('/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.update(req, res, next));
router.delete('/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.delete(req, res, next));
router.post('/:id/test', authenticate, requireRole('admin'), (req, res, next) => integrationController.test(req, res, next));
router.get('/:id/logs', authenticate, requireRole('admin'), (req, res, next) => integrationController.getLogs(req, res, next));

export default router;
