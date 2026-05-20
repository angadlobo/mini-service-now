import { Router } from 'express';
import { releaseController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createReleaseSchema, updateReleaseSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Core CRUD ──
router.get('/', (req, res, next) => releaseController.list(req as any, res, next));
router.get('/metrics', (req, res, next) => releaseController.getMetrics(req as any, res, next));
router.get('/calendar', (req, res, next) => releaseController.getCalendar(req as any, res, next));
router.get('/:id', (req, res, next) => releaseController.getById(req as any, res, next));
router.post('/', requireRole('itil'), validate(createReleaseSchema), (req, res, next) => releaseController.create(req as any, res, next));
router.put('/:id', requireRole('itil'), validate(updateReleaseSchema), (req, res, next) => releaseController.update(req as any, res, next));

// ── Changes ──
router.get('/:id/changes', (req, res, next) => releaseController.listChanges(req as any, res, next));
router.post('/:id/changes', requireRole('itil'), (req, res, next) => releaseController.addChange(req as any, res, next));
router.delete('/:id/changes/:changeId', requireRole('itil'), (req, res, next) => releaseController.removeChange(req as any, res, next));

// ── CIs ──
router.post('/:id/cis', requireRole('itil'), (req, res, next) => releaseController.addCi(req as any, res, next));
router.delete('/:id/cis/:ciId', requireRole('itil'), (req, res, next) => releaseController.removeCi(req as any, res, next));

// ── Stakeholders ──
router.post('/:id/stakeholders', requireRole('itil'), (req, res, next) => releaseController.addStakeholder(req as any, res, next));
router.delete('/:id/stakeholders/:userId', requireRole('itil'), (req, res, next) => releaseController.removeStakeholder(req as any, res, next));

// ── Deployment Actions ──
router.post('/:id/start-deployment', requireRole('itil'), (req, res, next) => releaseController.startDeployment(req as any, res, next));
router.post('/:id/complete-deployment', requireRole('itil'), (req, res, next) => releaseController.completeDeployment(req as any, res, next));
router.post('/:id/rollback', requireRole('itil'), (req, res, next) => releaseController.rollback(req as any, res, next));

export default router;
