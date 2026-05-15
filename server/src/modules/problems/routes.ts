import { Router } from 'express';
import { problemController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createProblemSchema, updateProblemSchema } from './schema';

const router = Router();

router.get('/', authenticate, (req, res, next) => problemController.list(req, res, next));
router.get('/:id', authenticate, (req, res, next) => problemController.getById(req, res, next));
router.post('/', authenticate, requireRole('itil', 'admin'), validate(createProblemSchema), (req, res, next) => problemController.create(req, res, next));
router.put('/:id', authenticate, requireRole('itil', 'admin'), validate(updateProblemSchema), (req, res, next) => problemController.update(req, res, next));

// Linked records
router.get('/:id/incidents', authenticate, (req, res, next) => problemController.getLinkedIncidents(req, res, next));
router.post('/:id/incidents/:incidentId', authenticate, requireRole('itil', 'admin'), (req, res, next) => problemController.linkIncident(req, res, next));
router.delete('/:id/incidents/:incidentId', authenticate, requireRole('itil', 'admin'), (req, res, next) => problemController.unlinkIncident(req, res, next));

router.get('/:id/changes', authenticate, (req, res, next) => problemController.getLinkedChanges(req, res, next));
router.post('/:id/changes/:changeId', authenticate, requireRole('itil', 'admin'), (req, res, next) => problemController.linkChange(req, res, next));
router.delete('/:id/changes/:changeId', authenticate, requireRole('itil', 'admin'), (req, res, next) => problemController.unlinkChange(req, res, next));

export default router;
