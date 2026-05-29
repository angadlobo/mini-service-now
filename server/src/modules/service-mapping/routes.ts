import { Router } from 'express';
import { serviceMappingController } from './controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createServiceSchema, updateServiceSchema, createOfferingSchema, createDependencySchema, createCiMappingSchema } from './schema';

const router = Router();

router.use(authenticate);

// ── Service Map (before /:id to avoid conflicts) ──
router.get('/map', (req, res, next) => serviceMappingController.getServiceMap(req as any, res, next));

// ── Business Services ──
router.get('/', (req, res, next) => serviceMappingController.list(req as any, res, next));
router.post('/', validate(createServiceSchema), (req, res, next) => serviceMappingController.create(req as any, res, next));
router.get('/:id', (req, res, next) => serviceMappingController.getById(req as any, res, next));
router.put('/:id', validate(updateServiceSchema), (req, res, next) => serviceMappingController.update(req as any, res, next));

// ── Offerings ──
router.get('/:id/offerings', (req, res, next) => serviceMappingController.getOfferings(req as any, res, next));
router.post('/:id/offerings', validate(createOfferingSchema), (req, res, next) => serviceMappingController.addOffering(req as any, res, next));
router.put('/offerings/:offeringId', (req, res, next) => serviceMappingController.updateOffering(req as any, res, next));
router.delete('/offerings/:offeringId', (req, res, next) => serviceMappingController.deleteOffering(req as any, res, next));

// ── Dependencies ──
router.get('/:id/dependencies', (req, res, next) => serviceMappingController.getDependencies(req as any, res, next));
router.post('/:id/dependencies', validate(createDependencySchema), (req, res, next) => serviceMappingController.addDependency(req as any, res, next));
router.delete('/dependencies/:depId', (req, res, next) => serviceMappingController.removeDependency(req as any, res, next));

// ── CI Mappings ──
router.get('/:id/ci-mappings', (req, res, next) => serviceMappingController.getCiMappings(req as any, res, next));
router.post('/:id/ci-mappings', validate(createCiMappingSchema), (req, res, next) => serviceMappingController.addCiMapping(req as any, res, next));
router.delete('/ci-mappings/:mapId', (req, res, next) => serviceMappingController.removeCiMapping(req as any, res, next));

export default router;
