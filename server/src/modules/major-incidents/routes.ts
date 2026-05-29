import { Router } from 'express';
import { majorIncidentController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { declareMajorIncidentSchema, updateMajorIncidentSchema, postUpdateSchema } from './schema';

const router = Router();

router.use(authenticate);

router.get('/dashboard', (req, res, next) => majorIncidentController.dashboard(req as any, res, next));
router.get('/', (req, res, next) => majorIncidentController.list(req as any, res, next));
router.get('/:id', (req, res, next) => majorIncidentController.getById(req as any, res, next));

// Declaring / managing a major incident requires itil or admin.
router.post('/', requireRole('admin', 'itil'), validate(declareMajorIncidentSchema), (req, res, next) => majorIncidentController.declare(req as any, res, next));
router.put('/:id', requireRole('admin', 'itil'), validate(updateMajorIncidentSchema), (req, res, next) => majorIncidentController.update(req as any, res, next));
router.post('/:id/updates', requireRole('admin', 'itil'), validate(postUpdateSchema), (req, res, next) => majorIncidentController.postUpdate(req as any, res, next));

export default router;
