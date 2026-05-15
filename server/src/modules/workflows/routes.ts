import { Router } from 'express';
import { workflowController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('admin'), (req, res, next) => workflowController.list(req, res, next));
router.get('/executions', authenticate, requireRole('admin'), (req, res, next) => workflowController.getExecutions(req, res, next));
router.get('/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.getById(req, res, next));
router.post('/', authenticate, requireRole('admin'), (req, res, next) => workflowController.create(req, res, next));
router.put('/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.update(req, res, next));
router.delete('/:id', authenticate, requireRole('admin'), (req, res, next) => workflowController.delete(req, res, next));

export default router;
