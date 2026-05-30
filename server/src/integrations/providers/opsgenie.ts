import { Provider } from '../provider-registry';

export class OpsgenieProvider implements Provider {
  id = 'opsgenie';
  name = 'Opsgenie';
  description = 'Send alerts to Opsgenie incident management';
  icon = 'https://www.svgrepo.com/show/373600/opsgenie.svg';
  website = 'https://www.atlassian.com/software/opsgenie';

  scopes = ['alerts:write', 'incidents:write'];

  config = [
    { key: 'api_key', label: 'API Key', type: 'text', required: true, sensitive: true },
    { key: 'team_id', label: 'Team ID', type: 'text', required: false },
    { key: 'priority', label: 'Default Priority', type: 'select', options: ['P1', 'P2', 'P3', 'P4', 'P5'], default: 'P3' },
  ];

  async testConnection(integration: any) {
    const apiKey = integration.provider_config?.api_key;
    if (!apiKey) {
      return { ok: false, message: 'API Key is required' };
    }

    try {
      const res = await fetch('https://api.opsgenie.com/v2/heartbeats/ping', {
        method: 'GET',
        headers: {
          'Authorization': `GenieKey ${apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, message: res.ok ? 'Connected to Opsgenie successfully' : `Failed: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${err.message}` };
    }
  }

  async handleOutboundEvent(integration: any, event: string, data: any) {
    const apiKey = integration.provider_config?.api_key;
    const teamId = integration.provider_config?.team_id;
    const priority = integration.provider_config?.priority || 'P3';

    if (!apiKey) return;

    const alertTitles: Record<string, string> = {
      'incident.created': `ServiceNow Incident: ${data.short_description}`,
      'incident.updated': `ServiceNow Incident Updated: ${data.short_description}`,
      'change.created': `ServiceNow Change: ${data.title}`,
    };

    const title = alertTitles[event] || `ServiceNow Event: ${event}`;

    try {
      await fetch('https://api.opsgenie.com/v2/alerts', {
        method: 'POST',
        headers: {
          'Authorization': `GenieKey ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: title,
          description: data.description || JSON.stringify(data),
          priority,
          ...(teamId && { teamId }),
          source: 'Mini ServiceNow',
        }),
      });
    } catch (err) {
      console.error('Failed to send Opsgenie alert:', err);
    }
  }
}
