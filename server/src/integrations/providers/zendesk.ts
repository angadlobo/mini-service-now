import { Provider } from '../provider-registry';

export class ZendeskProvider implements Provider {
  id = 'zendesk';
  name = 'Zendesk';
  description = 'Customer support and ticketing system integration';
  icon = 'https://www.svgrepo.com/show/373634/zendesk.svg';
  website = 'https://www.zendesk.com';

  scopes = ['tickets:write', 'tickets:read', 'users:read'];

  config = [
    { key: 'subdomain', label: 'Subdomain', type: 'text', required: true, placeholder: 'mycompany' },
    { key: 'email', label: 'Email', type: 'text', required: true },
    { key: 'api_token', label: 'API Token', type: 'text', required: true, sensitive: true },
  ];

  async testConnection(integration: any) {
    const subdomain = integration.provider_config?.subdomain;
    const email = integration.provider_config?.email;
    const apiToken = integration.provider_config?.api_token;

    if (!subdomain || !email || !apiToken) {
      return { ok: false, message: 'Subdomain, Email, and API Token are required' };
    }

    try {
      const res = await fetch(`https://${subdomain}.zendesk.com/api/v2/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${email}/token:${apiToken}`).toString('base64')}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, message: res.ok ? 'Connected to Zendesk successfully' : `Failed: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${err.message}` };
    }
  }

  async handleOutboundEvent(integration: any, event: string, data: any) {
    const subdomain = integration.provider_config?.subdomain;
    const email = integration.provider_config?.email;
    const apiToken = integration.provider_config?.api_token;

    if (!subdomain || !email || !apiToken) return;

    if (event === 'incident.created' || event === 'problem.created') {
      try {
        await fetch(`https://${subdomain}.zendesk.com/api/v2/tickets`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${email}/token:${apiToken}`).toString('base64')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticket: {
              subject: data.short_description,
              description: data.description || 'Created from Mini ServiceNow',
              priority: 'normal',
              type: 'incident',
            },
          }),
        });
      } catch (err) {
        console.error('Failed to create Zendesk ticket:', err);
      }
    }
  }
}
