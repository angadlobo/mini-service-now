import { Request, Response, NextFunction } from 'express';
import { integrationService } from './service';
import { parseQueryParams } from '../../core/query-builder';
import { oauthService } from '../../integrations/oauth-service';
import { providerRegistry } from '../../integrations/provider-registry';
import { processInboundEvents } from '../../integrations/inbound-handlers';
import { db } from '../../config/database';

export class IntegrationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.list(parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const i = await integrationService.getById(req.params.id);
      if (!i) return res.status(404).json({ message: 'Integration not found' });
      res.json(i);
    } catch (err) { next(err); }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try { res.status(201).json(await integrationService.create(req.body, (req as any).user.id)); } catch (err) { next(err); }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.update(req.params.id, req.body)); } catch (err) { next(err); }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try { await integrationService.delete(req.params.id); res.json({ message: 'Deleted' }); } catch (err) { next(err); }
  }

  async getLogs(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.getLogs(req.params.id, parseQueryParams(req.query))); } catch (err) { next(err); }
  }

  async test(req: Request, res: Response, next: NextFunction) {
    try { res.json(await integrationService.testWebhook(req.params.id)); } catch (err) { next(err); }
  }

  // ── Provider Metadata ─────────────────────────────────

  async getProviders(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(integrationService.getProviderMetadata());
    } catch (err) { next(err); }
  }

  // ── OAuth ─────────────────────────────────────────────

  async oauthStart(req: Request, res: Response, next: NextFunction) {
    try {
      const redirectUri = req.body.redirect_uri || `${req.protocol}://${req.get('host')}/api/integrations/oauth/callback`;
      const result = await oauthService.startOAuth(req.params.id, (req as any).user.id, redirectUri);
      res.json(result);
    } catch (err) { next(err); }
  }

  async oauthCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { state, code } = req.query as { state: string; code: string };
      if (!state || !code) return res.status(400).json({ error: 'Missing state or code' });
      const result = await oauthService.handleCallback(state, code);
      // Redirect to client admin page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
      res.redirect(`${clientUrl}/admin/integrations/providers?connected=${result.integrationId}`);
    } catch (err) { next(err); }
  }

  async oauthRefresh(req: Request, res: Response, next: NextFunction) {
    try {
      await oauthService.refreshToken(req.params.id);
      res.json({ message: 'Token refreshed' });
    } catch (err) { next(err); }
  }

  // ── Inbound Webhooks ──────────────────────────────────

  async handleInboundWebhook(req: Request, res: Response, next: NextFunction) {
    try {
      const { inboundWebhookId } = req.params;
      const integration = await db('integrations')
        .where({ inbound_webhook_id: inboundWebhookId, active: true })
        .first();

      if (!integration) {
        return res.status(404).json({ error: 'Webhook not found' });
      }

      if (!integration.provider) {
        return res.status(400).json({ error: 'Integration has no provider' });
      }

      const provider = providerRegistry.get(integration.provider);
      if (!provider) {
        return res.status(400).json({ error: `Provider "${integration.provider}" not found` });
      }

      const integrationRecord = {
        ...integration,
        provider_config: typeof integration.provider_config === 'string'
          ? JSON.parse(integration.provider_config)
          : integration.provider_config || {},
        oauth_tokens: integration.oauth_tokens
          ? (typeof integration.oauth_tokens === 'string' ? JSON.parse(integration.oauth_tokens) : integration.oauth_tokens)
          : null,
      };

      // Normalize headers to lowercase
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(req.headers)) {
        headers[key.toLowerCase()] = String(value);
      }

      const events = await provider.handleInboundWebhook(integrationRecord, headers, req.body);
      await processInboundEvents(integrationRecord, events);

      res.json({ received: true, events: events.length });
    } catch (err: any) {
      if (err.message?.includes('signature') || err.message?.includes('token')) {
        return res.status(401).json({ error: err.message });
      }
      next(err);
    }
  }

  // ── Integration Links ─────────────────────────────────

  async getLinks(req: Request, res: Response, next: NextFunction) {
    try {
      const { tableName, recordId } = req.params;
      const links = await integrationService.getLinks(tableName, recordId);
      res.json(links);
    } catch (err) { next(err); }
  }

  async createLink(req: Request, res: Response, next: NextFunction) {
    try {
      const link = await integrationService.createLink(req.body);
      res.status(201).json(link);
    } catch (err) { next(err); }
  }

  async deleteLink(req: Request, res: Response, next: NextFunction) {
    try {
      await integrationService.deleteLink(req.params.id);
      res.json({ message: 'Deleted' });
    } catch (err) { next(err); }
  }
}

export const integrationController = new IntegrationController();
