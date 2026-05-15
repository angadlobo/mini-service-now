import { Router } from 'express';
import { userController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

router.use(authenticate);
router.get('/', (req, res, next) => userController.list(req, res, next));
router.get('/groups', (req, res, next) => userController.listGroups(req, res, next));
router.get('/groups/:id/members', (req, res, next) => userController.getGroupMembers(req, res, next));
router.get('/:id', (req, res, next) => userController.getById(req, res, next));
router.put('/:id', requireRole('admin'), (req, res, next) => userController.update(req as any, res, next));
router.put('/:id/roles', requireRole('admin'), (req, res, next) => userController.updateRoles(req, res, next));

export default router;
