import { Router } from 'express';
import { portalController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import {
  createAnnouncementSchema, updateAnnouncementSchema,
  createQuickLinkSchema, updateQuickLinkSchema,
  createThemeSchema, updateThemeSchema,
} from './schema';

const router = Router();

router.use(authenticate);

// Portal home & my tickets
router.get('/home', (req, res, next) => portalController.getHome(req as any, res, next));
router.get('/my-tickets', (req, res, next) => portalController.getMyTickets(req as any, res, next));

// Announcements
router.get('/announcements', (req, res, next) => portalController.getAnnouncements(req as any, res, next));
router.post('/announcements', requireRole('admin'), validate(createAnnouncementSchema), (req, res, next) => portalController.createAnnouncement(req as any, res, next));
router.put('/announcements/:id', requireRole('admin'), validate(updateAnnouncementSchema), (req, res, next) => portalController.updateAnnouncement(req as any, res, next));
router.delete('/announcements/:id', requireRole('admin'), (req, res, next) => portalController.deleteAnnouncement(req as any, res, next));

// Quick Links
router.get('/quick-links', (req, res, next) => portalController.getQuickLinks(req as any, res, next));
router.post('/quick-links', requireRole('admin'), validate(createQuickLinkSchema), (req, res, next) => portalController.createQuickLink(req as any, res, next));
router.put('/quick-links/:id', requireRole('admin'), validate(updateQuickLinkSchema), (req, res, next) => portalController.updateQuickLink(req as any, res, next));
router.delete('/quick-links/:id', requireRole('admin'), (req, res, next) => portalController.deleteQuickLink(req as any, res, next));

// Themes
router.get('/themes', (req, res, next) => portalController.listThemes(req as any, res, next));
router.post('/themes', requireRole('admin'), validate(createThemeSchema), (req, res, next) => portalController.createTheme(req as any, res, next));
router.put('/themes/:id', requireRole('admin'), validate(updateThemeSchema), (req, res, next) => portalController.updateTheme(req as any, res, next));
router.put('/themes/:id/activate', requireRole('admin'), (req, res, next) => portalController.activateTheme(req as any, res, next));

export default router;
