import { Provider } from '../provider-registry';

export class SnykProvider implements Provider {
  id = 'snyk';
  name = 'Snyk';
  description = 'Security scanning and vulnerability management';
  icon = 'https://www.svgrepo.com/show/373609/snyk.svg';
  website = 'https://snyk.io';

  scopes = ['vuln:read', 'org:read', 'sca:read'];

  config = [
    { key: 'api_token', label: 'API Token', type: 'text', required: true, sensitive: true },
    { key: 'org_id', label: 'Organization ID', type: 'text', required: true },
  ];

  async testConnection(integration: any) {
    const apiToken = integration.provider_config?.api_token;
    if (!apiToken) {
      return { ok: false, message: 'API Token is required' };
    }

    try {
      const res = await fetch('https://api.snyk.io/v1/user/me', {
        method: 'GET',
        headers: {
          'Authorization': `token ${apiToken}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      return { ok: res.ok, message: res.ok ? 'Connected to Snyk successfully' : `Failed: ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: `Connection failed: ${err.message}` };
    }
  }

  async handleOutboundEvent(integration: any, event: string, data: any) {
    // Snyk integration primarily for inbound vulnerability reports
  }
}
