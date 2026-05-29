import { Router } from 'express';
import { costCenterController, costItemController, chargebackController, summaryController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createCostCenterSchema, updateCostCenterSchema,
  createCostItemSchema, updateCostItemSchema,
  createChargebackRuleSchema, updateChargebackRuleSchema,
  generateChargebackSchema,
} from './schema';

const router = Router();

router.use(authenticate);

// ── Summary (before parameterized routes) ──
router.get('/summary', (req, res, next) => summaryController.getSummary(req as any, res, next));

// ── Cost Centers ──
router.get('/cost-centers', (req, res, next) => costCenterController.list(req as any, res, next));
router.post('/cost-centers', validate(createCostCenterSchema), (req, res, next) => costCenterController.create(req as any, res, next));
router.get('/cost-centers/:id', (req, res, next) => costCenterController.getById(req as any, res, next));
router.put('/cost-centers/:id', validate(updateCostCenterSchema), (req, res, next) => costCenterController.update(req as any, res, next));

// ── Cost Items ──
router.get('/cost-items', (req, res, next) => costItemController.list(req as any, res, next));
router.post('/cost-items', validate(createCostItemSchema), (req, res, next) => costItemController.create(req as any, res, next));
router.get('/cost-items/:id', (req, res, next) => costItemController.getById(req as any, res, next));
router.put('/cost-items/:id', validate(updateCostItemSchema), (req, res, next) => costItemController.update(req as any, res, next));

// ── Chargeback Rules ──
router.get('/chargeback-rules', (req, res, next) => chargebackController.listRules(req as any, res, next));
router.post('/chargeback-rules', validate(createChargebackRuleSchema), (req, res, next) => chargebackController.createRule(req as any, res, next));
router.put('/chargeback-rules/:id', validate(updateChargebackRuleSchema), (req, res, next) => chargebackController.updateRule(req as any, res, next));
router.delete('/chargeback-rules/:id', (req, res, next) => chargebackController.deleteRule(req as any, res, next));

// ── Chargeback Records ──
router.get('/chargeback-records', (req, res, next) => chargebackController.listRecords(req as any, res, next));
router.post('/chargeback-records/generate', validate(generateChargebackSchema), (req, res, next) => chargebackController.generateRecords(req as any, res, next));

export default router;
