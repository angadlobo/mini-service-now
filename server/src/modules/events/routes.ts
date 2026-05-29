import { Router } from 'express';
import { eventController, alertRuleController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createEventSchema, updateEventSchema, createAlertRuleSchema, updateAlertRuleSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Alert Rules (must be before /:id to avoid conflicts) ──
router.get('/alert-rules', (req, res, next) => alertRuleController.list(req as any, res, next));
router.post('/alert-rules', validate(createAlertRuleSchema), (req, res, next) => alertRuleController.create(req as any, res, next));
router.get('/alert-rules/:id', (req, res, next) => alertRuleController.getById(req as any, res, next));
router.put('/alert-rules/:id', validate(updateAlertRuleSchema), (req, res, next) => alertRuleController.update(req as any, res, next));
router.delete('/alert-rules/:id', (req, res, next) => alertRuleController.delete(req as any, res, next));

// ── Events ──
router.get('/', (req, res, next) => eventController.list(req as any, res, next));
router.post('/', validate(createEventSchema), (req, res, next) => eventController.create(req as any, res, next));
router.get('/:id', (req, res, next) => eventController.getById(req as any, res, next));
router.put('/:id', validate(updateEventSchema), (req, res, next) => eventController.update(req as any, res, next));
router.put('/:id/acknowledge', (req, res, next) => eventController.acknowledge(req as any, res, next));
router.put('/:id/resolve', (req, res, next) => eventController.resolve(req as any, res, next));
router.get('/:id/correlations', (req, res, next) => eventController.getCorrelations(req as any, res, next));
router.post('/:id/correlations', (req, res, next) => eventController.addCorrelation(req as any, res, next));

export default router;
