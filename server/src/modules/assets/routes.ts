import { Router } from 'express';
import { assetController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createAssetSchema,
  updateAssetSchema,
  createLicenseSchema,
  updateLicenseSchema,
  addLifecycleEventSchema,
  addInstallationSchema,
} from './schema';

const router = Router();

router.use(authenticate);

// ── Asset Models ────────────────────────────────────
router.get('/models', (req, res, next) => assetController.listModels(req as any, res, next));

// ── Licenses ────────────────────────────────────────
router.get('/licenses', (req, res, next) => assetController.listLicenses(req as any, res, next));
router.post('/licenses', validate(createLicenseSchema), (req, res, next) => assetController.createLicense(req as any, res, next));
router.get('/licenses/:id', (req, res, next) => assetController.getLicenseById(req as any, res, next));
router.put('/licenses/:id', validate(updateLicenseSchema), (req, res, next) => assetController.updateLicense(req as any, res, next));

// ── Assets ──────────────────────────────────────────
router.get('/', (req, res, next) => assetController.list(req as any, res, next));
router.post('/', validate(createAssetSchema), (req, res, next) => assetController.create(req as any, res, next));
router.get('/:id', (req, res, next) => assetController.getById(req as any, res, next));
router.put('/:id', validate(updateAssetSchema), (req, res, next) => assetController.update(req as any, res, next));

// ── Lifecycle Events ────────────────────────────────
router.get('/:id/lifecycle', (req, res, next) => assetController.getLifecycleEvents(req as any, res, next));
router.post('/:id/lifecycle', validate(addLifecycleEventSchema), (req, res, next) => assetController.addLifecycleEvent(req as any, res, next));

// ── Installations ───────────────────────────────────
router.get('/:id/installations', (req, res, next) => assetController.getInstallations(req as any, res, next));
router.post('/:id/installations', validate(addInstallationSchema), (req, res, next) => assetController.addInstallation(req as any, res, next));
router.delete('/:id/installations/:installationId', (req, res, next) => assetController.removeInstallation(req as any, res, next));

export default router;
