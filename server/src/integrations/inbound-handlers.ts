import { db } from '../config/database';
import { logger } from '../config/logger';
import { eventBus } from '../core/event-bus';
import type { NormalizedInboundEvent, IntegrationRecord } from './provider-interface';

/**
 * Process normalized inbound events: upsert integration_links, emit events,
 * and auto-create incidents when configured.
 */
export async function processInboundEvents(
  integration: IntegrationRecord,
  events: NormalizedInboundEvent[],
): Promise<void> {
  for (const event of events) {
    try {
      // Upsert integration_links
      const linkData = {
        integration_id: integration.id,
        table_name: event.tableName || 'incidents',
        record_id: event.recordId || '00000000-0000-0000-0000-000000000000',
        provider: integration.provider,
        external_type: event.externalType,
        external_id: event.externalId,
        external_url: event.externalUrl || null,
        external_key: event.externalKey || null,
        title: event.title || null,
        status: event.status || null,
        metadata: JSON.stringify(event.metadata || {}),
        direction: 'inbound',
        updated_at: new Date(),
      };

      // Try to find and update existing link
      const existing = await db('integration_links')
        .where({
          integration_id: integration.id,
          external_type: event.externalType,
          external_id: event.externalId,
        })
        .first();

      if (existing) {
        await db('integration_links').where('id', existing.id).update({
          title: linkData.title,
          status: linkData.status,
          metadata: linkData.metadata,
          updated_at: new Date(),
        });
      } else if (event.recordId) {
        await db('integration_links').insert(linkData);
      }

      // Auto-create incident if configured
      if (event.autoCreateIncident && event.incidentData) {
        const config = typeof integration.provider_config === 'string'
          ? JSON.parse(integration.provider_config)
          : integration.provider_config || {};

        if (config.auto_create_incidents) {
          await autoCreateIncidentFromAlert(integration, event);
        }
      }

      // Emit integration.inbound event
      eventBus.emit('integration.inbound', {
        type: 'integration.inbound',
        tableName: event.tableName || 'integrations',
        recordId: event.recordId || integration.id,
        data: {
          provider: integration.provider,
          externalType: event.externalType,
          externalId: event.externalId,
          action: event.action,
          title: event.title,
          status: event.status,
          ...event.metadata,
        },
        userId: 'system',
      });

      // Log to integration_logs
      await db('integration_logs').insert({
        integration_id: integration.id,
        event: `inbound.${event.externalType}.${event.action || 'received'}`,
        status: 'success',
        request_body: JSON.stringify({ externalType: event.externalType, externalId: event.externalId }),
        response_body: '',
        status_code: 200,
      });
    } catch (err: any) {
      logger.error(`Failed to process inbound event for ${integration.provider}`, err);
      await db('integration_logs').insert({
        integration_id: integration.id,
        event: `inbound.${event.externalType}.error`,
        status: 'error',
        request_body: JSON.stringify(event),
        response_body: err.message,
        status_code: 500,
      }).catch(() => {});
    }
  }

  // Update last_sync_at
  await db('integrations').where('id', integration.id).update({
    last_sync_at: new Date(),
    updated_at: new Date(),
  });
}

/**
 * Auto-create an incident from an alert event (Datadog, Grafana, PagerDuty).
 */
export async function autoCreateIncidentFromAlert(
  integration: IntegrationRecord,
  event: NormalizedInboundEvent,
): Promise<void> {
  if (!event.incidentData) return;

  try {
    // Check if an incident already exists for this alert
    const existingLink = await db('integration_links')
      .where({
        integration_id: integration.id,
        external_type: event.externalType,
        external_id: event.externalId,
        table_name: 'incidents',
      })
      .whereNot('record_id', '00000000-0000-0000-0000-000000000000')
      .first();

    if (existingLink) {
      // Update existing incident if alert resolved
      if (event.action === 'resolved' || event.status === 'resolved') {
        await db('incidents').where('id', existingLink.record_id).update({
          state: 'resolved',
          resolution_notes: `Auto-resolved: ${integration.provider} alert resolved`,
          resolved_at: new Date(),
          updated_at: new Date(),
        });
      }
      return;
    }

    // Only create for triggered/firing events
    if (event.action === 'resolved' || event.status === 'resolved') return;

    // Generate incident number
    const lastIncident = await db('incidents').orderBy('created_at', 'desc').first();
    const nextNum = lastIncident
      ? String(Number((lastIncident.number || 'INC0000').replace('INC', '')) + 1).padStart(7, '0')
      : '0000001';

    const [incident] = await db('incidents').insert({
      number: `INC${nextNum}`,
      short_description: event.incidentData.short_description,
      description: event.incidentData.description || `Auto-created from ${integration.provider} alert: ${event.externalKey || event.externalId}`,
      state: 'new',
      urgency: event.incidentData.urgency || 2,
      impact: event.incidentData.impact || 2,
      created_by: '00000000-0000-0000-0000-000000000000', // system
    }).returning('*');

    // Create integration_link for this incident
    await db('integration_links').insert({
      integration_id: integration.id,
      table_name: 'incidents',
      record_id: incident.id,
      provider: integration.provider,
      external_type: event.externalType,
      external_id: event.externalId,
      external_url: event.externalUrl || null,
      external_key: event.externalKey || null,
      title: event.title,
      status: event.status,
      metadata: JSON.stringify(event.metadata || {}),
      direction: 'inbound',
    });

    logger.info(`Auto-created incident ${incident.number} from ${integration.provider} alert`);

    eventBus.emitRecordCreated('incidents', incident.id, incident, 'system');
  } catch (err: any) {
    logger.error('Failed to auto-create incident from alert', err);
  }
}
