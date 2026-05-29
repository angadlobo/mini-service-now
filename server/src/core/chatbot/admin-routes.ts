import { Router } from 'express';
import { chatbotAdminService } from './admin-service';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// All chatbot admin routes require an authenticated admin.
router.use(authenticate, requireRole('admin'));

router.get('/config', async (_req, res, next) => {
  try { res.json(await chatbotAdminService.getConfig()); } catch (err) { next(err); }
});

router.put('/config', async (req, res, next) => {
  try { res.json(await chatbotAdminService.saveConfig(req.body.settings || [])); } catch (err) { next(err); }
});

router.post('/telegram/setup', async (req, res, next) => {
  try { res.json(await chatbotAdminService.setupTelegram(req.body.baseUrl)); } catch (err) { next(err); }
});

router.post('/discord/setup', async (_req, res, next) => {
  try { res.json(await chatbotAdminService.setupDiscord()); } catch (err) { next(err); }
});

router.get('/links', async (_req, res, next) => {
  try { res.json(await chatbotAdminService.listLinks()); } catch (err) { next(err); }
});

router.delete('/links/:id', async (req, res, next) => {
  try { res.json(await chatbotAdminService.deactivateLink(req.params.id)); } catch (err) { next(err); }
});

router.get('/sessions', async (_req, res, next) => {
  try { res.json(await chatbotAdminService.listSessions()); } catch (err) { next(err); }
});

export default router;
