import { IntegrationProvider, ProviderFieldDefinition, ProviderWorkflowAction, NormalizedInboundEvent, IntegrationRecord, ExternalResourceResult } from '../provider-interface';

export class SlackProvider extends IntegrationProvider {
  name = 'slack';
  displayName = 'Slack';
  description = 'Send ServiceNow events to Slack channels';
  icon = 'https://www.svgrepo.com/show/21059/slack.svg';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'webhook_url', label: 'Webhook URL', type: 'url', required: true },
      { name: 'channel', label: 'Channel', type: 'text', placeholder: '#incidents' },
      { name: 'bot_name', label: 'Bot Name', type: 'text', placeholder: 'ServiceNow Bot' },
    ];
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.webhook_url) errors.push('Webhook URL is required');
    return { valid: errors.length === 0, errors };
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'slack.send_message',
        label: 'Send Slack Message',
        description: 'Send a message to a Slack channel',
        configFields: [
          { name: 'channel', label: 'Channel', type: 'text', required: true },
          { name: 'message', label: 'Message', type: 'textarea', required: true },
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
    if (actionType === 'slack.send_message') {
      const webhookUrl = integration.provider_config?.webhook_url as string;
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: config.channel,
          text: config.message,
        }),
      });
    }
  }

  async handleInboundWebhook(
    integration: IntegrationRecord,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<NormalizedInboundEvent[]> {
    return [];
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const webhookUrl = integration.provider_config?.webhook_url as string;
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
}
