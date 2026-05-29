import { Router } from 'express';
import { bcPlanController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createBCPlanSchema, updateBCPlanSchema,
  createBCTaskSchema, updateBCTaskSchema,
  createBCTestSchema, updateBCTestSchema,
} from './schema';

const router = Router();

router.use(authenticate);

// ── BC Plans ──
router.get('/', (req, res, next) => bcPlanController.list(req as any, res, next));
router.post('/', validate(createBCPlanSchema), (req, res, next) => bcPlanController.create(req as any, res, next));
router.get('/:id', (req, res, next) => bcPlanController.getById(req as any, res, next));
router.put('/:id', validate(updateBCPlanSchema), (req, res, next) => bcPlanController.update(req as any, res, next));
router.delete('/:id', (req, res, next) => bcPlanController.delete(req as any, res, next));

// ── Tasks ──
router.get('/:id/tasks', (req, res, next) => bcPlanController.getTasks(req as any, res, next));
router.post('/:id/tasks', validate(createBCTaskSchema), (req, res, next) => bcPlanController.addTask(req as any, res, next));
router.put('/tasks/:taskId', validate(updateBCTaskSchema), (req, res, next) => bcPlanController.updateTask(req as any, res, next));
router.delete('/tasks/:taskId', (req, res, next) => bcPlanController.deleteTask(req as any, res, next));

// ── Tests ──
router.get('/:id/tests', (req, res, next) => bcPlanController.getTests(req as any, res, next));
router.post('/:id/tests', validate(createBCTestSchema), (req, res, next) => bcPlanController.addTest(req as any, res, next));
router.put('/tests/:testId', validate(updateBCTestSchema), (req, res, next) => bcPlanController.updateTest(req as any, res, next));

export default router;
