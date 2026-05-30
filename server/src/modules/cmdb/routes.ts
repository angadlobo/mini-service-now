import { Router } from 'express';
import { cmdbController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { uploadAssetImage, uploadLicenseImage } from '../../middleware/image-upload';

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

// Asset Image Upload (required for assets)
router.post('/cis/:id/image', authenticate, requireRole('itil', 'admin'), uploadAssetImage.single('image'), (req, res, next) => cmdbController.uploadAssetImage(req, res, next));

// Maintenance Logs
router.get('/cis/:id/maintenance', authenticate, (req, res, next) => cmdbController.getMaintenanceLogs(req, res, next));
router.post('/cis/:id/maintenance', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.addMaintenanceLog(req, res, next));

// Licenses
router.get('/cis/:id/licenses', authenticate, (req, res, next) => cmdbController.getLicenses(req, res, next));
router.post('/cis/:id/licenses', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.addLicense(req, res, next));
router.delete('/licenses/:licenseId', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.removeLicense(req, res, next));

// License Image Upload (optional for licenses)
router.post('/licenses/:licenseId/image', authenticate, requireRole('itil', 'admin'), uploadLicenseImage.single('image'), (req, res, next) => cmdbController.uploadLicenseImage(req, res, next));

// Asset Allocation
router.get('/cis/:id/allocation-history', authenticate, (req, res, next) => cmdbController.getAllocationHistory(req, res, next));
router.post('/cis/:id/allocate', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.allocateAsset(req, res, next));
router.post('/cis/:id/deallocate', authenticate, requireRole('itil', 'admin'), (req, res, next) => cmdbController.deallocateAsset(req, res, next));

export default router;
