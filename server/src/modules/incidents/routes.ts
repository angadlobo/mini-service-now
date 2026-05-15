import { Router } from 'express';
import { incidentController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createIncidentSchema, updateIncidentSchema } from './schema';

const router = Router();

router.use(authenticate);
router.get('/', (req, res, next) => incidentController.list(req as any, res, next));
router.get('/:id', (req, res, next) => incidentController.getById(req as any, res, next));
router.post('/', validate(createIncidentSchema), (req, res, next) => incidentController.create(req as any, res, next));
router.put('/:id', validate(updateIncidentSchema), (req, res, next) => incidentController.update(req as any, res, next));

export default router;
