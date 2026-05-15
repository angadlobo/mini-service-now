import { Router } from 'express';
import { changeController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createChangeSchema, updateChangeSchema } from './schema';

const router = Router();

router.use(authenticate);
router.get('/', (req, res, next) => changeController.list(req as any, res, next));
router.get('/:id', (req, res, next) => changeController.getById(req as any, res, next));
router.post('/', requireRole('itil'), validate(createChangeSchema), (req, res, next) => changeController.create(req as any, res, next));
router.put('/:id', requireRole('itil'), validate(updateChangeSchema), (req, res, next) => changeController.update(req as any, res, next));

export default router;
