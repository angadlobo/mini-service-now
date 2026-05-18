import { Router } from 'express';
import { integrationController } from './controller';
import { authenticate, requireRole } from '../../middleware/auth';

const router = Router();

// ── Public routes (no auth) ─────────────────────────────
// Inbound webhook endpoint — must be before auth middleware
router.post('/hooks/:inboundWebhookId', (req, res, next) => integrationController.handleInboundWebhook(req, res, next));

// OAuth callback — public, validated by state parameter
router.get('/oauth/callback', (req, res, next) => integrationController.oauthCallback(req, res, next));

// ── Authenticated routes ─────────────────────────────────
router.get('/providers', authenticate, (req, res, next) => integrationController.getProviders(req, res, next));
router.get('/links/:tableName/:recordId', authenticate, (req, res, next) => integrationController.getLinks(req, res, next));

// ── Admin routes ─────────────────────────────────────────
router.get('/', authenticate, requireRole('admin'), (req, res, next) => integrationController.list(req, res, next));
router.get('/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.getById(req, res, next));
router.post('/', authenticate, requireRole('admin'), (req, res, next) => integrationController.create(req, res, next));
router.put('/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.update(req, res, next));
router.delete('/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.delete(req, res, next));
router.post('/:id/test', authenticate, requireRole('admin'), (req, res, next) => integrationController.test(req, res, next));
router.get('/:id/logs', authenticate, requireRole('admin'), (req, res, next) => integrationController.getLogs(req, res, next));

// OAuth
router.post('/:id/oauth/start', authenticate, requireRole('admin'), (req, res, next) => integrationController.oauthStart(req, res, next));
router.post('/:id/oauth/refresh', authenticate, requireRole('admin'), (req, res, next) => integrationController.oauthRefresh(req, res, next));

// Links management
router.post('/links', authenticate, requireRole('admin'), (req, res, next) => integrationController.createLink(req, res, next));
router.delete('/links/:id', authenticate, requireRole('admin'), (req, res, next) => integrationController.deleteLink(req, res, next));

export default router;
