import {
  IntegrationProvider, ProviderFieldDefinition, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class PagerDutyProvider extends IntegrationProvider {
  readonly name = 'pagerduty';
  readonly displayName = 'PagerDuty';
  readonly icon = 'IconBell';
  readonly description = 'Trigger, acknowledge, and resolve PagerDuty incidents. Auto-create incidents from alerts.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'api_key', label: 'API Key', type: 'password', required: true, description: 'REST API Key (v2)' },
      { name: 'service_id', label: 'Service ID', type: 'text', required: true, placeholder: 'PXXXXXX' },
      { name: 'routing_key', label: 'Events API Routing Key', type: 'password', description: 'For triggering alerts via Events API v2' },
      { name: 'auto_create_incidents', label: 'Auto-create incidents from alerts', type: 'boolean', defaultValue: true },
    ];
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.api_key) errors.push('API key is required');
    if (!config.service_id) errors.push('Service ID is required');
    return { valid: errors.length === 0, errors };
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const config = integration.provider_config;
    try {
      const res = await fetch(`https://api.pagerduty.com/services/${config.service_id}`, {
        headers: {
          Authorization: `Token token=${config.api_key}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const data = await res.json() as Record<string, any>;
        return { ok: true, message: `Connected to service: ${data.service?.name}` };
      }
      return { ok: false, message: `PagerDuty API returned ${res.status}` };
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
    const messages = payload.messages || [];

    for (const msg of messages) {
      const incident = msg.incident;
      if (!incident) continue;
      const action = msg.event?.replace('incident.', '') || 'unknown';

      events.push({
        externalType: 'alert',
        externalId: incident.id,
        externalUrl: incident.html_url,
        externalKey: `PD-${incident.incident_number}`,
        title: incident.title || incident.summary,
        status: incident.status,
        action,
        metadata: {
          service: incident.service?.name,
          urgency: incident.urgency,
          priority: incident.priority?.summary,
        },
        autoCreateIncident: action === 'triggered',
        incidentData: action === 'triggered' ? {
          short_description: `PagerDuty Alert: ${incident.title || incident.summary}`,
          description: `PagerDuty incident ${incident.incident_number}: ${incident.title}\n\nService: ${incident.service?.name}\nUrgency: ${incident.urgency}`,
          urgency: incident.urgency === 'high' ? 1 : 2,
          impact: incident.urgency === 'high' ? 1 : 2,
        } : undefined,
      });
    }

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'pagerduty_trigger',
        label: 'PagerDuty: Trigger Alert',
        description: 'Trigger a new PagerDuty alert',
        configFields: [
          { name: 'summary', label: 'Alert Summary', type: 'text', required: true },
          { name: 'severity', label: 'Severity', type: 'select', options: [
            { value: 'critical', label: 'Critical' }, { value: 'error', label: 'Error' },
            { value: 'warning', label: 'Warning' }, { value: 'info', label: 'Info' },
          ]},
        ],
      },
      {
        type: 'pagerduty_acknowledge',
        label: 'PagerDuty: Acknowledge',
        description: 'Acknowledge a PagerDuty incident',
        configFields: [
          { name: 'incident_id', label: 'PagerDuty Incident ID', type: 'text' },
        ],
      },
      {
        type: 'pagerduty_resolve',
        label: 'PagerDuty: Resolve',
        description: 'Resolve a PagerDuty incident',
        configFields: [
          { name: 'incident_id', label: 'PagerDuty Incident ID', type: 'text' },
        ],
      },
      {
        type: 'pagerduty_get_oncall',
        label: 'PagerDuty: Get On-Call',
        description: 'Get current on-call user for a schedule',
        configFields: [
          { name: 'schedule_id', label: 'Schedule ID', type: 'text', required: true },
          { name: 'store_in', label: 'Store result in variable', type: 'text', placeholder: 'oncall_user' },
        ],
      },
    ];
  }

  async executeAction(
    actionType: string,
    integration: IntegrationRecord,
    config: Record<string, unknown>,
    record: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<ExternalResourceResult | void> {
    const pConfig = integration.provider_config;
    const apiKey = pConfig.api_key as string;
    const headers: Record<string, string> = {
      Authorization: `Token token=${apiKey}`,
      'Content-Type': 'application/json',
    };

    switch (actionType) {
      case 'pagerduty_trigger': {
        const routingKey = pConfig.routing_key as string;
        if (!routingKey) throw new Error('Routing key not configured');
        const res = await fetch('https://events.pagerduty.com/v2/enqueue', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: routingKey,
            event_action: 'trigger',
            payload: {
              summary: config.summary || record.short_description || 'Alert',
              severity: config.severity || 'error',
              source: 'mini-servicenow',
              custom_details: { record_id: record.id, number: record.number },
            },
          }),
        });
        if (!res.ok) throw new Error(`PagerDuty Events API error: ${res.status}`);
        const data = await res.json() as Record<string, any>;
        return {
          externalType: 'alert',
          externalId: data.dedup_key || '',
          externalKey: data.dedup_key,
          title: config.summary as string,
          status: 'triggered',
        };
      }

      case 'pagerduty_acknowledge':
      case 'pagerduty_resolve': {
        const incidentId = config.incident_id as string;
        if (!incidentId) return;
        const status = actionType === 'pagerduty_acknowledge' ? 'acknowledged' : 'resolved';
        await fetch(`https://api.pagerduty.com/incidents`, {
          method: 'PUT',
          headers: { ...headers, From: 'system@mini-servicenow.local' },
          body: JSON.stringify({
            incidents: [{ id: incidentId, type: 'incident_reference', status }],
          }),
        });
        return;
      }

      case 'pagerduty_get_oncall': {
        const scheduleId = config.schedule_id as string;
        if (!scheduleId) return;
        const res = await fetch(`https://api.pagerduty.com/oncalls?schedule_ids[]=${scheduleId}`, { headers });
        if (res.ok) {
          const data = await res.json() as Record<string, any>;
          const oncall = data.oncalls?.[0]?.user;
          if (oncall) {
            const storeIn = (config.store_in as string) || 'oncall_user';
            (context as any)[storeIn] = { name: oncall.summary, email: oncall.email, id: oncall.id };
          }
        }
        return;
      }
    }
  }
}
