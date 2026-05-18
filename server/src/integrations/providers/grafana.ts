import {
  IntegrationProvider, ProviderFieldDefinition, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class GrafanaProvider extends IntegrationProvider {
  readonly name = 'grafana';
  readonly displayName = 'Grafana';
  readonly icon = 'IconChartLine';
  readonly description = 'Receive Grafana alert notifications and create annotations. Auto-create incidents from firing alerts.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'base_url', label: 'Grafana URL', type: 'url', required: true, placeholder: 'https://grafana.example.com' },
      { name: 'api_key', label: 'API Key / Service Account Token', type: 'password', required: true },
      { name: 'auto_create_incidents', label: 'Auto-create incidents from alerts', type: 'boolean', defaultValue: true },
    ];
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.base_url) errors.push('Grafana URL is required');
    if (!config.api_key) errors.push('API key is required');
    return { valid: errors.length === 0, errors };
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const config = integration.provider_config;
    try {
      const res = await fetch(`${config.base_url}/api/org`, {
        headers: { Authorization: `Bearer ${config.api_key}` },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const org = await res.json() as Record<string, any>;
        return { ok: true, message: `Connected to Grafana org: ${org.name}` };
      }
      return { ok: false, message: `Grafana API returned ${res.status}` };
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

    // Grafana Unified Alerting webhook format
    const alerts = payload.alerts || [payload];

    for (const alert of alerts) {
      const status = alert.status || (payload.state === 'alerting' ? 'firing' : payload.state);
      const isFiring = status === 'firing' || status === 'alerting';

      events.push({
        externalType: 'alert',
        externalId: alert.fingerprint || alert.labels?.alertname || String(Date.now()),
        externalUrl: alert.generatorURL || alert.panelURL || payload.externalURL,
        externalKey: alert.labels?.alertname || payload.ruleName || 'grafana-alert',
        title: payload.title || payload.ruleName || alert.labels?.alertname || 'Grafana Alert',
        status: isFiring ? 'firing' : 'resolved',
        action: isFiring ? 'firing' : 'resolved',
        metadata: {
          labels: alert.labels,
          annotations: alert.annotations,
          ruleUrl: payload.ruleUrl,
          orgId: payload.orgId,
          dashboardId: alert.dashboardId,
          panelId: alert.panelId,
        },
        autoCreateIncident: isFiring,
        incidentData: isFiring ? {
          short_description: `Grafana Alert: ${payload.title || payload.ruleName || alert.labels?.alertname || 'Alert firing'}`,
          description: `Grafana alert is firing.\n\n${alert.annotations?.description || alert.annotations?.summary || payload.message || ''}\n\nRule: ${payload.ruleName || '-'}\nLabels: ${JSON.stringify(alert.labels || {})}`,
          urgency: 2,
          impact: 2,
        } : undefined,
      });
    }

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'grafana_create_annotation',
        label: 'Grafana: Create Annotation',
        description: 'Create an annotation in Grafana (visible on dashboards)',
        configFields: [
          { name: 'text', label: 'Annotation Text', type: 'textarea', required: true },
          { name: 'tags', label: 'Tags (comma-separated)', type: 'text', placeholder: 'deployment,incident' },
          { name: 'dashboard_id', label: 'Dashboard ID (optional)', type: 'text' },
          { name: 'panel_id', label: 'Panel ID (optional)', type: 'text' },
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
    const pConfig = integration.provider_config;
    const baseUrl = pConfig.base_url as string;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${pConfig.api_key}`,
      'Content-Type': 'application/json',
    };

    switch (actionType) {
      case 'grafana_create_annotation': {
        const tags = config.tags
          ? String(config.tags).split(',').map((t) => t.trim()).filter(Boolean)
          : [];
        const body: Record<string, unknown> = {
          text: config.text || `Event from record ${record.number || record.id}`,
          tags,
          time: Date.now(),
        };
        if (config.dashboard_id) body.dashboardId = Number(config.dashboard_id);
        if (config.panel_id) body.panelId = Number(config.panel_id);

        const res = await fetch(`${baseUrl}/api/annotations`, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`Grafana API error: ${res.status}`);
        const data = await res.json() as Record<string, any>;
        return {
          externalType: 'annotation',
          externalId: String(data.id || ''),
          externalUrl: `${baseUrl}/api/annotations/${data.id}`,
          title: (config.text || 'Annotation') as string,
          status: 'created',
        };
      }
    }
  }
}
