import { Router } from 'express';
import { notificationPrefsController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// Channels (admin)
router.get('/channels', authenticate, requireRole('admin'), (req, res, next) => notificationPrefsController.getChannels(req, res, next));
router.post('/channels', authenticate, requireRole('admin'), (req, res, next) => notificationPrefsController.createChannel(req, res, next));
router.put('/channels/:id', authenticate, requireRole('admin'), (req, res, next) => notificationPrefsController.updateChannel(req, res, next));
router.delete('/channels/:id', authenticate, requireRole('admin'), (req, res, next) => notificationPrefsController.deleteChannel(req, res, next));

// User preferences
router.get('/preferences', authenticate, (req, res, next) => notificationPrefsController.getUserPreferences(req, res, next));
router.put('/preferences', authenticate, (req, res, next) => notificationPrefsController.setPreference(req, res, next));

export default router;
