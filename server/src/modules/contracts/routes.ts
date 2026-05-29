import { Router } from 'express';
import { vendorController, contractController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createVendorSchema, updateVendorSchema, createContractSchema, updateContractSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Vendors ──
router.get('/vendors', (req, res, next) => vendorController.list(req as any, res, next));
router.get('/vendors/:id', (req, res, next) => vendorController.getById(req as any, res, next));
router.post('/vendors', validate(createVendorSchema), (req, res, next) => vendorController.create(req as any, res, next));
router.put('/vendors/:id', validate(updateVendorSchema), (req, res, next) => vendorController.update(req as any, res, next));
router.get('/vendors/:id/assessments', (req, res, next) => vendorController.getAssessments(req as any, res, next));
router.post('/vendors/:id/assessments', (req, res, next) => vendorController.addAssessment(req as any, res, next));

// ── Contracts ──
router.get('/contracts', (req, res, next) => contractController.list(req as any, res, next));
router.get('/contracts/:id', (req, res, next) => contractController.getById(req as any, res, next));
router.post('/contracts', validate(createContractSchema), (req, res, next) => contractController.create(req as any, res, next));
router.put('/contracts/:id', validate(updateContractSchema), (req, res, next) => contractController.update(req as any, res, next));
router.get('/contracts/:id/line-items', (req, res, next) => contractController.getLineItems(req as any, res, next));
router.post('/contracts/:id/line-items', (req, res, next) => contractController.addLineItem(req as any, res, next));
router.delete('/contracts/:id/line-items/:lineItemId', (req, res, next) => contractController.removeLineItem(req as any, res, next));

export default router;
