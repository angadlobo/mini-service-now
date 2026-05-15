import { Router } from 'express';
import { cmdbController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// CI Types
router.get('/types', authenticate, (req, res, next) => cmdbController.listTypes(req, res, next));
router.post('/types', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.createType(req, res, next));
router.put('/types/:id', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.updateType(req, res, next));

// CIs
router.get('/cis', authenticate, (req, res, next) => cmdbController.listCis(req, res, next));
router.get('/cis/:id', authenticate, (req, res, next) => cmdbController.getCiById(req, res, next));
router.post('/cis', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.createCi(req, res, next));
router.put('/cis/:id', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.updateCi(req, res, next));

// Relationships
router.get('/cis/:id/relationships', authenticate, (req, res, next) => cmdbController.getRelationships(req, res, next));
router.post('/cis/:id/relationships', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.addRelationship(req, res, next));
router.delete('/cis/:id/relationships/:relId', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.removeRelationship(req, res, next));

// Impact analysis
router.get('/cis/:id/impact', authenticate, (req, res, next) => cmdbController.getImpact(req, res, next));

export default router;
