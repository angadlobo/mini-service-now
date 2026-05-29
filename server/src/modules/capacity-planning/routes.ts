import { Router } from 'express';
import { resourcePoolController, allocationController, forecastController, dashboardController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createResourcePoolSchema, updateResourcePoolSchema,
  createAllocationSchema, updateAllocationSchema,
  createForecastSchema, updateForecastSchema,
} from './schema';

const router = Router();

router.use(authenticate);

// ── Dashboard (before parameterized routes) ──
router.get('/dashboard', (req, res, next) => dashboardController.getDashboard(req as any, res, next));

// ── Resource Pools ──
router.get('/pools', (req, res, next) => resourcePoolController.list(req as any, res, next));
router.post('/pools', validate(createResourcePoolSchema), (req, res, next) => resourcePoolController.create(req as any, res, next));
router.get('/pools/:id', (req, res, next) => resourcePoolController.getById(req as any, res, next));
router.put('/pools/:id', validate(updateResourcePoolSchema), (req, res, next) => resourcePoolController.update(req as any, res, next));
router.delete('/pools/:id', (req, res, next) => resourcePoolController.delete(req as any, res, next));

// ── Allocations ──
router.get('/pools/:id/allocations', (req, res, next) => allocationController.listByPool(req as any, res, next));
router.post('/pools/:id/allocations', validate(createAllocationSchema), (req, res, next) => allocationController.create(req as any, res, next));
router.put('/allocations/:id', validate(updateAllocationSchema), (req, res, next) => allocationController.update(req as any, res, next));
router.delete('/allocations/:id', (req, res, next) => allocationController.delete(req as any, res, next));

// ── Forecasts ──
router.get('/pools/:id/forecasts', (req, res, next) => forecastController.listByPool(req as any, res, next));
router.post('/pools/:id/forecasts', validate(createForecastSchema), (req, res, next) => forecastController.create(req as any, res, next));
router.put('/forecasts/:id', validate(updateForecastSchema), (req, res, next) => forecastController.update(req as any, res, next));

export default router;
