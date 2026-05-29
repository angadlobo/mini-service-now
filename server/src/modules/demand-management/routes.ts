import { Router } from 'express';
import { demandController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createDemandSchema, updateDemandSchema, setScoreSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Pipeline (before /:id to avoid conflicts) ──
router.get('/pipeline', (req, res, next) => demandController.getPipeline(req as any, res, next));

// ── Demands ──
router.get('/', (req, res, next) => demandController.list(req as any, res, next));
router.post('/', validate(createDemandSchema), (req, res, next) => demandController.create(req as any, res, next));
router.get('/:id', (req, res, next) => demandController.getById(req as any, res, next));
router.put('/:id', validate(updateDemandSchema), (req, res, next) => demandController.update(req as any, res, next));
router.delete('/:id', (req, res, next) => demandController.delete(req as any, res, next));

// ── Scores ──
router.get('/:id/scores', (req, res, next) => demandController.getScores(req as any, res, next));
router.post('/:id/scores', validate(setScoreSchema), (req, res, next) => demandController.setScore(req as any, res, next));

export default router;
