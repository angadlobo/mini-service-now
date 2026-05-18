import { db } from '../../config/database';
import { applyQueryOptions, QueryOptions } from '../../core/query-builder';
import { AppError } from '../../middleware/error';
import { providerRegistry } from '../../integrations/provider-registry';

export class IntegrationService {
  async list(options: QueryOptions) {
    const query = db('integrations').select('integrations.*');
    const { dataQuery, countQuery } = applyQueryOptions(query, 'integrations', {
      ...options,
      searchFields: ['name', 'url'],
    });
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async getById(id: string) {
    return db('integrations').where('id', id).first();
  }

  async create(data: Record<string, unknown>, userId: string) {
    const [integration] = await db('integrations').insert({ ...data, created_by: userId }).returning('*');
    return integration;
  }

  async update(id: string, data: Record<string, unknown>) {
    const existing = await db('integrations').where('id', id).first();
    if (!existing) throw new AppError(404, 'Integration not found');
    const [updated] = await db('integrations').where('id', id).update({ ...data, updated_at: new Date() }).returning('*');
    return updated;
  }

  async delete(id: string) {
    await db('integrations').where('id', id).del();
  }

  async getLogs(integrationId: string, options: QueryOptions) {
    const query = db('integration_logs').where('integration_id', integrationId).orderBy('created_at', 'desc');
    const { dataQuery, countQuery } = applyQueryOptions(query, 'integration_logs', options);
    const [data, countResult] = await Promise.all([dataQuery, countQuery]);
    const total = Number((countResult as any)?.total || 0);
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async testWebhook(id: string) {
    const integration = await db('integrations').where('id', id).first();
    if (!integration) throw new AppError(404, 'Integration not found');

    // If it's a provider integration, use the provider's test method
    if (integration.provider) {
      const provider = providerRegistry.get(integration.provider);
      if (provider) {
        const integrationRecord = {
          ...integration,
          provider_config: typeof integration.provider_config === 'string'
            ? JSON.parse(integration.provider_config)
            : integration.provider_config || {},
          oauth_tokens: integration.oauth_tokens
            ? (typeof integration.oauth_tokens === 'string' ? JSON.parse(integration.oauth_tokens) : integration.oauth_tokens)
            : null,
        };
        const result = await provider.testConnection(integrationRecord);
        // Update status
        await db('integrations').where('id', id).update({
          status: result.ok ? 'connected' : 'error',
          status_message: result.message,
          last_sync_at: result.ok ? new Date() : undefined,
          updated_at: new Date(),
        });
        return { success: result.ok, status: result.ok ? 200 : 0, body: result.message };
      }
    }

    // Legacy webhook test
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const payload = { event: 'test', timestamp: new Date().toISOString(), data: { message: 'Test webhook from Mini ServiceNow' } };

    try {
      const res = await fetch(integration.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000),
      });
      return { success: res.ok, status: res.status, body: await res.text() };
    } catch (err: any) {
      return { success: false, status: 0, body: err.message };
    }
  }

  // ── Provider Metadata ─────────────────────────────────

  getProviderMetadata() {
    return providerRegistry.getAllMetadata();
  }

  // ── Integration Links ──────────────────────────────────

  async getLinks(tableName: string, recordId: string) {
    return db('integration_links')
      .where({ table_name: tableName, record_id: recordId })
      .orderBy('created_at', 'desc');
  }

  async createLink(data: Record<string, unknown>) {
    const [link] = await db('integration_links').insert(data).returning('*');
    return link;
  }

  async deleteLink(id: string) {
    const existing = await db('integration_links').where('id', id).first();
    if (!existing) throw new AppError(404, 'Integration link not found');
    await db('integration_links').where('id', id).del();
  }
}

export const integrationService = new IntegrationService();
