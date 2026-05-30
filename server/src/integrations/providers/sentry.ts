import { Provider } from '../provider-registry';

export class SentryProvider implements Provider {
  id = 'sentry';
  name = 'Sentry';
  description = 'Track errors and performance issues with Sentry';
  icon = 'https://www.svgrepo.com/show/373603/sentry.svg';
  website = 'https://sentry.io';

  scopes = ['project:read', 'event:read', 'issue:read'];

  config = [
    { key: 'auth_token', label: 'Auth Token', type: 'text', required: true, sensitive: true },
    { key: 'org_slug', label: 'Organization Slug', type: 'text', required: true },
    { key: 'project_slug', label: 'Project Slug', type: 'text', required: true },
  ];

  async testConnection(integration: any) {
    const authToken = integration.provider_config?.auth_token;
    const orgSlug = integration.provider_config?.org_slug;

    if (!authToken || !orgSlug) {
      return { ok: false, message: 'Auth Token and Organization Slug are required' };
    }

    try {
      const res = await fetch(`https://sentry.io/api/0/organizations/${orgSlug}/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, message: res.ok ? 'Connected to Sentry successfully' : `Failed: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${err.message}` };
    }
  }

  async handleOutboundEvent(integration: any, event: string, data: any) {
    // Sentry is primarily for inbound events (error reports)
    // This could trigger alerts or create issues based on ServiceNow events
  }
}
