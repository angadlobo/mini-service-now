import {
  IntegrationProvider, ProviderFieldDefinition, OAuthConfig, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class JiraProvider extends IntegrationProvider {
  readonly name = 'jira';
  readonly displayName = 'Jira Cloud';
  readonly icon = 'IconBrandJira';
  readonly description = 'Sync Jira issues bidirectionally with incidents, changes, and problems.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'site_url', label: 'Jira Site URL', type: 'url', required: true, placeholder: 'https://yoursite.atlassian.net' },
      { name: 'project_key', label: 'Project Key', type: 'text', required: true, placeholder: 'PROJ' },
      { name: 'default_issue_type', label: 'Default Issue Type', type: 'text', placeholder: 'Task', defaultValue: 'Task' },
    ];
  }

  getOAuthConfig(): OAuthConfig {
    return {
      authorizationUrl: 'https://auth.atlassian.com/authorize',
      tokenUrl: 'https://auth.atlassian.com/oauth/token',
      scopes: ['read:jira-work', 'write:jira-work', 'read:jira-user'],
      clientIdSettingKey: 'JIRA_CLIENT_ID',
      clientSecretSettingKey: 'JIRA_CLIENT_SECRET',
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.site_url) errors.push('Jira site URL is required');
    if (!config.project_key) errors.push('Project key is required');
    return { valid: errors.length === 0, errors };
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const config = integration.provider_config;
    const siteUrl = config.site_url as string;
    const headers = this.getAuthHeaders(integration);
    headers['Accept'] = 'application/json';

    try {
      const res = await fetch(`${siteUrl}/rest/api/3/project/${config.project_key}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const project = await res.json() as Record<string, any>;
        return { ok: true, message: `Connected to project ${project.name}` };
      }
      return { ok: false, message: `Jira API returned ${res.status}` };
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
    const webhookEvent = payload.webhookEvent || '';
    const events: NormalizedInboundEvent[] = [];

    if (webhookEvent.startsWith('jira:issue_')) {
      const issue = payload.issue;
      if (issue) {
        events.push({
          externalType: 'issue',
          externalId: String(issue.id),
          externalUrl: issue.self ? `${issue.self.split('/rest/')[0]}/browse/${issue.key}` : undefined,
          externalKey: issue.key,
          title: issue.fields?.summary,
          status: issue.fields?.status?.name,
          action: webhookEvent.replace('jira:issue_', ''),
          metadata: {
            priority: issue.fields?.priority?.name,
            assignee: issue.fields?.assignee?.displayName,
            issueType: issue.fields?.issuetype?.name,
          },
        });
      }
    }

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'jira_create_issue',
        label: 'Jira: Create Issue',
        description: 'Create a Jira issue linked to this record',
        configFields: [
          { name: 'summary', label: 'Summary', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'issue_type', label: 'Issue Type', type: 'text', placeholder: 'Task' },
          { name: 'priority', label: 'Priority', type: 'select', options: [
            { value: 'Highest', label: 'Highest' }, { value: 'High', label: 'High' },
            { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }, { value: 'Lowest', label: 'Lowest' },
          ]},
        ],
      },
      {
        type: 'jira_transition_issue',
        label: 'Jira: Transition Issue',
        description: 'Transition a Jira issue to a new status',
        configFields: [
          { name: 'issue_key', label: 'Issue Key', type: 'text' },
          { name: 'transition_name', label: 'Transition Name', type: 'text', required: true },
        ],
      },
      {
        type: 'jira_add_comment',
        label: 'Jira: Add Comment',
        description: 'Add a comment to a Jira issue',
        configFields: [
          { name: 'issue_key', label: 'Issue Key', type: 'text' },
          { name: 'body', label: 'Comment Body', type: 'textarea', required: true },
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
    const siteUrl = pConfig.site_url as string;
    const projectKey = pConfig.project_key as string;
    const headers = this.getAuthHeaders(integration);
    headers['Content-Type'] = 'application/json';
    headers['Accept'] = 'application/json';

    switch (actionType) {
      case 'jira_create_issue': {
        const issueType = (config.issue_type as string) || (pConfig.default_issue_type as string) || 'Task';
        const res = await fetch(`${siteUrl}/rest/api/3/issue`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            fields: {
              project: { key: projectKey },
              summary: config.summary || record.short_description || 'New Issue',
              description: {
                type: 'doc', version: 1,
                content: [{ type: 'paragraph', content: [{ type: 'text', text: (config.description || record.description || '') as string }] }],
              },
              issuetype: { name: issueType },
              ...(config.priority ? { priority: { name: config.priority } } : {}),
            },
          }),
        });
        if (!res.ok) throw new Error(`Jira API error: ${res.status}`);
        const issue = await res.json() as Record<string, any>;
        return {
          externalType: 'issue',
          externalId: issue.id,
          externalUrl: `${siteUrl}/browse/${issue.key}`,
          externalKey: issue.key,
          title: (config.summary || record.short_description) as string,
          status: 'Open',
        };
      }

      case 'jira_transition_issue': {
        const issueKey = config.issue_key as string;
        if (!issueKey) return;
        // Get available transitions
        const transRes = await fetch(`${siteUrl}/rest/api/3/issue/${issueKey}/transitions`, { headers });
        const transData = await transRes.json() as Record<string, any>;
        const transition = (transData.transitions || []).find((t: any) =>
          t.name.toLowerCase() === (config.transition_name as string || '').toLowerCase(),
        );
        if (!transition) throw new Error(`Transition "${config.transition_name}" not found`);
        await fetch(`${siteUrl}/rest/api/3/issue/${issueKey}/transitions`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ transition: { id: transition.id } }),
        });
        return;
      }

      case 'jira_add_comment': {
        const issueKey = config.issue_key as string;
        if (!issueKey) return;
        await fetch(`${siteUrl}/rest/api/3/issue/${issueKey}/comment`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            body: {
              type: 'doc', version: 1,
              content: [{ type: 'paragraph', content: [{ type: 'text', text: (config.body || '') as string }] }],
            },
          }),
        });
        return;
      }
    }
  }
}
