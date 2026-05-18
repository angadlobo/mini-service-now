import {
  IntegrationProvider, ProviderFieldDefinition, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class DatadogProvider extends IntegrationProvider {
  readonly name = 'datadog';
  readonly displayName = 'Datadog';
  readonly icon = 'IconChartBar';
  readonly description = 'Receive Datadog monitor alerts and auto-create incidents. Post events and mute monitors.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'api_key', label: 'API Key', type: 'password', required: true },
      { name: 'app_key', label: 'Application Key', type: 'password', required: true },
      { name: 'site', label: 'Datadog Site', type: 'select', defaultValue: 'datadoghq.com', options: [
        { value: 'datadoghq.com', label: 'US1 (datadoghq.com)' },
        { value: 'us3.datadoghq.com', label: 'US3' },
        { value: 'us5.datadoghq.com', label: 'US5' },
        { value: 'datadoghq.eu', label: 'EU (datadoghq.eu)' },
        { value: 'ap1.datadoghq.com', label: 'AP1' },
      ]},
      { name: 'auto_create_incidents', label: 'Auto-create incidents from alerts', type: 'boolean', defaultValue: true },
    ];
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.api_key) errors.push('API key is required');
    if (!config.app_key) errors.push('Application key is required');
    return { valid: errors.length === 0, errors };
  }

  private getHeaders(integration: IntegrationRecord): Record<string, string> {
    const config = integration.provider_config;
    return {
      'Content-Type': 'application/json',
      'DD-API-KEY': config.api_key as string,
      'DD-APPLICATION-KEY': config.app_key as string,
    };
  }

  private apiUrl(integration: IntegrationRecord): string {
    const site = (integration.provider_config.site as string) || 'datadoghq.com';
    return `https://api.${site}`;
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const headers = this.getHeaders(integration);
    try {
      const res = await fetch(`${this.apiUrl(integration)}/api/v1/validate`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, message: 'Connected to Datadog' };
      return { ok: false, message: `Datadog API returned ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  async handleInboundWebhook(
    _integration: IntegrationRecord,
    _headers: Record<string, string>,
    body: unknown,
  ): Promise<NormalizedInboundEvent[]> {
    const payload = body as Record<string, any>;
    const events: NormalizedInboundEvent[] = [];

    // Datadog webhook payload
    const alertType = payload.alert_type || payload.event_type || 'alert';
    const alertTransition = payload.alert_transition || '';
    const isResolved = alertTransition === 'Recovered' || alertType === 'success';

    events.push({
      externalType: 'alert',
      externalId: String(payload.alert_id || payload.id || payload.evt?.id || Date.now()),
      externalUrl: payload.link || payload.event_url,
      externalKey: payload.alert_metric ? `dd-${payload.alert_metric}` : `dd-${payload.alert_id || 'unknown'}`,
      title: payload.title || payload.alert_title || 'Datadog Alert',
      status: isResolved ? 'resolved' : 'triggered',
      action: isResolved ? 'resolved' : 'triggered',
      metadata: {
        monitor_name: payload.monitor_name,
        monitor_id: payload.monitor_id,
        alert_metric: payload.alert_metric,
        tags: payload.tags,
        priority: payload.priority,
      },
      autoCreateIncident: !isResolved,
      incidentData: !isResolved ? {
        short_description: `Datadog Alert: ${payload.title || payload.alert_title || 'Monitor triggered'}`,
        description: `Datadog monitor alert:\n\n${payload.body || payload.alert_body || ''}\n\nMonitor: ${payload.monitor_name || 'unknown'}\nMetric: ${payload.alert_metric || '-'}`,
        urgency: payload.priority === 'P1' ? 1 : 2,
        impact: payload.priority === 'P1' ? 1 : 2,
      } : undefined,
    });

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'datadog_create_event',
        label: 'Datadog: Create Event',
        description: 'Post an event to the Datadog event stream',
        configFields: [
          { name: 'title', label: 'Event Title', type: 'text', required: true },
          { name: 'text', label: 'Event Text', type: 'textarea', required: true },
          { name: 'alert_type', label: 'Alert Type', type: 'select', options: [
            { value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' },
            { value: 'error', label: 'Error' }, { value: 'success', label: 'Success' },
          ]},
          { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'env:prod,service:web' },
        ],
      },
      {
        type: 'datadog_mute_monitor',
        label: 'Datadog: Mute Monitor',
        description: 'Mute a Datadog monitor',
        configFields: [
          { name: 'monitor_id', label: 'Monitor ID', type: 'text', required: true },
          { name: 'end_timestamp', label: 'Mute Until (Unix timestamp)', type: 'text' },
        ],
      },
    ];
  }

  async executeAction(
    actionType: string,
    integration: IntegrationRecord,
    config: Record<string, unknown>,
    record: Record<string, unknown>,
  ): Promise<ExternalResourceResult | void> {
    const headers = this.getHeaders(integration);
    const apiUrl = this.apiUrl(integration);

    switch (actionType) {
      case 'datadog_create_event': {
        const tags = config.tags
          ? String(config.tags).split(',').map((t) => t.trim()).filter(Boolean)
          : [];
        const res = await fetch(`${apiUrl}/api/v1/events`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: config.title || 'Event from Mini ServiceNow',
            text: config.text || `Record ${record.number || record.id}`,
            alert_type: config.alert_type || 'info',
            tags,
          }),
        });
        if (!res.ok) throw new Error(`Datadog API error: ${res.status}`);
        const data = await res.json() as Record<string, any>;
        return {
          externalType: 'event',
          externalId: String(data.event?.id || ''),
          externalUrl: data.event?.url,
          title: config.title as string,
          status: 'posted',
        };
      }

      case 'datadog_mute_monitor': {
        const monitorId = config.monitor_id as string;
        if (!monitorId) return;
        const muteBody: Record<string, unknown> = {};
        if (config.end_timestamp) muteBody.end = Number(config.end_timestamp);
        await fetch(`${apiUrl}/api/v1/monitor/${monitorId}/mute`, {
          method: 'POST',
          headers,
          body: JSON.stringify(muteBody),
        });
        return;
      }
    }
  }
}
