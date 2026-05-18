import {
  IntegrationProvider, ProviderFieldDefinition, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class TeamsProvider extends IntegrationProvider {
  readonly name = 'teams';
  readonly displayName = 'Microsoft Teams';
  readonly icon = 'IconBrandTeams';
  readonly description = 'Send rich Adaptive Cards and approval requests to Microsoft Teams channels.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'webhook_url', label: 'Incoming Webhook URL', type: 'url', required: true, description: 'Teams Incoming Webhook connector URL' },
      { name: 'channel_name', label: 'Channel Name', type: 'text', placeholder: '#general' },
    ];
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.webhook_url) errors.push('Webhook URL is required');
    return { valid: errors.length === 0, errors };
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const config = integration.provider_config;
    try {
      const res = await fetch(config.webhook_url as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'message',
          attachments: [{
            contentType: 'application/vnd.microsoft.card.adaptive',
            content: {
              type: 'AdaptiveCard', version: '1.4',
              body: [{ type: 'TextBlock', text: 'Test connection from Mini ServiceNow', weight: 'Bolder' }],
            },
          }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, message: 'Connected to Teams channel' };
      return { ok: false, message: `Teams returned ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  async handleInboundWebhook(
    _integration: IntegrationRecord,
    _headers: Record<string, string>,
    body: unknown,
  ): Promise<NormalizedInboundEvent[]> {
    // Handle Action.Submit callbacks from Adaptive Cards
    const payload = body as Record<string, any>;
    const events: NormalizedInboundEvent[] = [];

    if (payload.type === 'Action.Submit' || payload.action) {
      events.push({
        externalType: 'action_submit',
        externalId: payload.id || payload.replyToId || 'unknown',
        title: 'Teams card action',
        status: payload.data?.action || 'submitted',
        action: payload.data?.action || 'submit',
        metadata: payload.data || {},
      });
    }

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'teams_send_card',
        label: 'Teams: Send Card',
        description: 'Send an Adaptive Card notification to a Teams channel',
        configFields: [
          { name: 'title', label: 'Card Title', type: 'text', required: true },
          { name: 'body', label: 'Card Body', type: 'textarea', required: true },
          { name: 'color', label: 'Accent Color', type: 'select', options: [
            { value: 'default', label: 'Default' }, { value: 'good', label: 'Green' },
            { value: 'warning', label: 'Yellow' }, { value: 'attention', label: 'Red' },
          ]},
          { name: 'link_url', label: 'Action URL', type: 'url', description: 'Link button URL' },
          { name: 'link_label', label: 'Action Label', type: 'text', placeholder: 'View Record' },
        ],
      },
      {
        type: 'teams_send_approval_card',
        label: 'Teams: Send Approval Card',
        description: 'Send an approval request card to Teams',
        configFields: [
          { name: 'title', label: 'Approval Title', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'approve_url', label: 'Approve Callback URL', type: 'url' },
          { name: 'reject_url', label: 'Reject Callback URL', type: 'url' },
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
    const webhookUrl = pConfig.webhook_url as string;

    switch (actionType) {
      case 'teams_send_card': {
        const colorMap: Record<string, string> = { good: 'Good', warning: 'Warning', attention: 'Attention' };
        const actions: any[] = [];
        if (config.link_url) {
          actions.push({
            type: 'Action.OpenUrl',
            title: config.link_label || 'View Record',
            url: config.link_url,
          });
        }

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                type: 'AdaptiveCard', version: '1.4',
                body: [
                  { type: 'TextBlock', text: (config.title || 'Notification') as string, weight: 'Bolder', size: 'Medium',
                    ...(config.color && config.color !== 'default' ? { color: colorMap[config.color as string] || 'Default' } : {}) },
                  { type: 'TextBlock', text: (config.body || '') as string, wrap: true },
                  { type: 'FactSet', facts: [
                    { title: 'Record', value: (record.number || record.id || '-') as string },
                    { title: 'State', value: (record.state || '-') as string },
                  ]},
                ],
                actions,
              },
            }],
          }),
        });
        return;
      }

      case 'teams_send_approval_card': {
        const actions: any[] = [];
        if (config.approve_url) {
          actions.push({ type: 'Action.OpenUrl', title: 'Approve', url: config.approve_url, style: 'positive' });
        }
        if (config.reject_url) {
          actions.push({ type: 'Action.OpenUrl', title: 'Reject', url: config.reject_url, style: 'destructive' });
        }

        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'message',
            attachments: [{
              contentType: 'application/vnd.microsoft.card.adaptive',
              content: {
                type: 'AdaptiveCard', version: '1.4',
                body: [
                  { type: 'TextBlock', text: (config.title || 'Approval Required') as string, weight: 'Bolder', size: 'Medium', color: 'Warning' },
                  { type: 'TextBlock', text: (config.description || '') as string, wrap: true },
                  { type: 'FactSet', facts: [
                    { title: 'Record', value: (record.number || record.id || '-') as string },
                    { title: 'Requested by', value: (record.created_by_name || '-') as string },
                  ]},
                ],
                actions,
              },
            }],
          }),
        });
        return;
      }
    }
  }
}
