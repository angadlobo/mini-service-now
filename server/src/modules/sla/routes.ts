import { Router } from 'express';
import { slaController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createSlaDefinitionSchema, updateSlaDefinitionSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Dashboard & monitoring (before /:id) ──
router.get('/dashboard', (req, res, next) => slaController.dashboard(req, res, next));
router.get('/at-risk', (req, res, next) => slaController.atRisk(req, res, next));
router.get('/breached', (req, res, next) => slaController.breached(req, res, next));

// ── Definitions ──
router.get('/definitions', (req, res, next) => slaController.listDefinitions(req, res, next));
router.get('/definitions/:id', (req, res, next) => slaController.getDefinition(req, res, next));
router.post('/definitions', requireRole('admin'), validate(createSlaDefinitionSchema), (req, res, next) => slaController.createDefinition(req, res, next));
router.put('/definitions/:id', requireRole('admin'), validate(updateSlaDefinitionSchema), (req, res, next) => slaController.updateDefinition(req, res, next));
router.delete('/definitions/:id', requireRole('admin'), (req, res, next) => slaController.deleteDefinition(req, res, next));

export default router;
