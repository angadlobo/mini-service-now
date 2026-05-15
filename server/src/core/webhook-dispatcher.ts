import { db } from '../config/database';
import { logger } from '../config/logger';
import { eventBus, AppEvent } from './event-bus';

async function dispatchWebhook(event: AppEvent): Promise<void> {
  try {
    const eventPattern = `${event.tableName}.${event.type.split('.').pop()}`;

    const integrations = await db('integrations')
      .where('active', true)
      .whereRaw('? = ANY(events)', [eventPattern]);

    for (const integration of integrations) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const authConfig = integration.auth_config || {};

      switch (integration.auth_type) {
        case 'bearer':
          headers['Authorization'] = `Bearer ${authConfig.token}`;
          break;
        case 'basic':
          headers['Authorization'] = `Basic ${Buffer.from(`${authConfig.username}:${authConfig.password}`).toString('base64')}`;
          break;
        case 'api_key':
          headers[authConfig.header_name || 'X-API-Key'] = authConfig.key;
          break;
      }

      const payload = {
        event: eventPattern,
        timestamp: new Date().toISOString(),
        data: {
          table_name: event.tableName,
          record_id: event.recordId,
          record: event.data,
          user_id: event.userId,
        },
      };

      let attempts = 0;
      const maxAttempts = 3;
      let lastError: string | null = null;
      let statusCode: number | null = null;

      while (attempts < maxAttempts) {
        try {
          const res = await fetch(integration.url, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(10000),
          });

          statusCode = res.status;

          if (res.ok) {
            const responseBody = await res.text();
            await db('integration_logs').insert({
              integration_id: integration.id,
              event: eventPattern,
              status: 'success',
              request_body: JSON.stringify(payload),
              response_body: responseBody.substring(0, 5000),
              status_code: statusCode,
            });
            lastError = null;
            break;
          } else {
            lastError = `HTTP ${res.status}: ${await res.text()}`;
          }
        } catch (err: any) {
          lastError = err.message;
        }

        attempts++;
        if (attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempts) * 1000));
        }
      }

      if (lastError) {
        await db('integration_logs').insert({
          integration_id: integration.id,
          event: eventPattern,
          status: 'error',
          request_body: JSON.stringify(payload),
          response_body: lastError,
          status_code: statusCode,
        });
        logger.error(`Webhook delivery failed for ${integration.name}: ${lastError}`);
      }
    }
  } catch (err) {
    logger.error('Webhook dispatcher error', err);
  }
}

export function initWebhookDispatcher(): void {
  eventBus.on('record.created', dispatchWebhook);
  eventBus.on('record.updated', dispatchWebhook);
  eventBus.on('record.state_changed', dispatchWebhook);
  eventBus.on('approval.decided', dispatchWebhook);
  logger.info('Webhook dispatcher initialized');
}
