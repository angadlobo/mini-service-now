import { Provider } from '../provider-registry';

export class SlackProvider implements Provider {
  id = 'slack';
  name = 'Slack';
  description = 'Send ServiceNow events to Slack channels';
  icon = 'https://www.svgrepo.com/show/21059/slack.svg';
  website = 'https://slack.com';

  scopes = ['chat:write', 'channels:read'];

  config = [
    { key: 'webhook_url', label: 'Webhook URL', type: 'text', required: true },
    { key: 'channel', label: 'Channel', type: 'text', placeholder: '#incidents' },
    { key: 'bot_name', label: 'Bot Name', type: 'text', placeholder: 'ServiceNow Bot' },
  ];

  async testConnection(integration: any) {
    const webhookUrl = integration.provider_config?.webhook_url;
    if (!webhookUrl) {
      return { ok: false, message: 'Webhook URL is required' };
    }

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '✅ Test message from Mini ServiceNow',
          username: integration.provider_config?.bot_name || 'ServiceNow Bot',
        }),
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, message: res.ok ? 'Connected to Slack successfully' : `Failed: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${err.message}` };
    }
  }

  async handleOutboundEvent(integration: any, event: string, data: any) {
    const webhookUrl = integration.provider_config?.webhook_url;
    if (!webhookUrl) return;

    const messages: Record<string, string> = {
      'incident.created': `🔴 New Incident: ${data.short_description}`,
      'incident.updated': `🟡 Incident Updated: ${data.short_description}`,
      'incident.resolved': `✅ Incident Resolved: ${data.short_description}`,
      'change.created': `📋 New Change: ${data.title}`,
      'change.approved': `✓ Change Approved: ${data.title}`,
    };

    const message = messages[event] || `Event: ${event}`;

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          username: integration.provider_config?.bot_name || 'ServiceNow Bot',
        }),
      });
    } catch (err) {
      console.error('Failed to send Slack message:', err);
    }
  }
}
