import { Router, Request, Response } from 'express';
import { logger } from '../../config/logger';
import { handleMessage } from './conversation-engine';
import { getAdapter } from './adapters';
import { verifyWhatsAppWebhook } from './adapters/whatsapp-adapter';
import { buildInteractionResponse } from './adapters/discord-adapter';
import { Platform } from './types';
import adminRoutes from './admin-routes';

const router = Router();

// ── Admin (authenticated) ──
// Mounted before the public webhook routes; has its own auth middleware.
router.use('/admin', adminRoutes);

/**
 * Generic handler for platforms that follow the standard flow:
 * verify → parse → engine → send reply async after 200 OK
 */
async function handlePlatformWebhook(platform: Platform, req: Request, res: Response): Promise<void> {
  const adapter = getAdapter(platform);
  const headers = req.headers as Record<string, string>;

  // Verify signature
  const valid = await adapter.verifySignature(req.body, headers);
  if (!valid) {
    logger.warn(`${platform} webhook: signature verification failed`);
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  const msg = adapter.parseWebhook(req.body, headers);
  if (!msg) {
    // Could not parse a meaningful message (e.g. non-message event)
    res.status(200).json({ ok: true });
    return;
  }

  // Respond 200 immediately, then process asynchronously
  res.status(200).json({ ok: true });

  try {
    const reply = await handleMessage(msg);
    await adapter.sendMessage(msg.platformChatId, reply);
  } catch (err) {
    logger.error(`${platform} webhook processing error`, err);
  }
}

// ── Telegram ──
router.post('/telegram', async (req: Request, res: Response) => {
  await handlePlatformWebhook('telegram', req, res);
});

// ── Slack ──
router.post('/slack', async (req: Request, res: Response) => {
  // Handle Slack URL verification challenge
  if (req.body?.type === 'url_verification') {
    res.json({ challenge: req.body.challenge });
    return;
  }

  await handlePlatformWebhook('slack', req, res);
});

// ── Teams ──
router.post('/teams', async (req: Request, res: Response) => {
  const adapter = getAdapter('teams');
  const headers = req.headers as Record<string, string>;

  const valid = await adapter.verifySignature(req.body, headers);
  if (!valid) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const msg = adapter.parseWebhook(req.body, headers);
  if (!msg) {
    res.status(200).json({ ok: true });
    return;
  }

  // Teams expects a 200 response quickly
  res.status(200).json({ ok: true });

  try {
    const reply = await handleMessage(msg);
    // Pass serviceUrl from the original activity for reply routing
    reply.extras = { ...reply.extras, serviceUrl: req.body.serviceUrl };
    await adapter.sendMessage(msg.platformChatId, reply);
  } catch (err) {
    logger.error('Teams webhook processing error', err);
  }
});

// ── WhatsApp ──
router.get('/whatsapp', async (req: Request, res: Response) => {
  const challenge = await verifyWhatsAppWebhook(req.query as Record<string, string>);
  if (challenge) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Verification failed');
  }
});

router.post('/whatsapp', async (req: Request, res: Response) => {
  await handlePlatformWebhook('whatsapp', req, res);
});

// ── Discord ──
router.post('/discord', async (req: Request, res: Response) => {
  const adapter = getAdapter('discord');
  const headers = req.headers as Record<string, string>;

  // Discord requires synchronous signature verification + inline responses
  const valid = await adapter.verifySignature(req.body, headers);
  if (!valid) {
    res.status(401).json({ error: 'Invalid signature' });
    return;
  }

  // Type 1 = PING (Discord verification)
  if (req.body?.type === 1) {
    res.json(buildInteractionResponse(1));
    return;
  }

  const msg = adapter.parseWebhook(req.body, headers);
  if (!msg) {
    res.status(200).json(buildInteractionResponse(4, 'Unrecognized interaction.'));
    return;
  }

  // Discord interactions must be responded to within 3 seconds
  // For longer operations, use type 5 (DEFERRED) then follow up
  try {
    const reply = await handleMessage(msg);
    res.json(buildInteractionResponse(4, reply.text, reply.extras));
  } catch (err) {
    logger.error('Discord webhook processing error', err);
    res.json(buildInteractionResponse(4, 'An error occurred processing your command.'));
  }
});

export default router;
