import crypto from 'crypto';
import {
  IntegrationProvider, ProviderFieldDefinition, OAuthConfig, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class GitHubProvider extends IntegrationProvider {
  readonly name = 'github';
  readonly displayName = 'GitHub';
  readonly icon = 'IconBrandGithub';
  readonly description = 'Link GitHub issues, pull requests, and commits to your records.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'owner', label: 'Repository Owner', type: 'text', required: true, placeholder: 'octocat' },
      { name: 'repo', label: 'Repository Name', type: 'text', required: true, placeholder: 'hello-world' },
      { name: 'auto_create_incidents', label: 'Auto-create incidents from alerts', type: 'boolean', defaultValue: false },
    ];
  }

  getOAuthConfig(): OAuthConfig {
    return {
      authorizationUrl: 'https://github.com/login/oauth/authorize',
      tokenUrl: 'https://github.com/login/oauth/access_token',
      scopes: ['repo', 'read:org'],
      clientIdSettingKey: 'GITHUB_CLIENT_ID',
      clientSecretSettingKey: 'GITHUB_CLIENT_SECRET',
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.owner) errors.push('Repository owner is required');
    if (!config.repo) errors.push('Repository name is required');
    return { valid: errors.length === 0, errors };
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const config = integration.provider_config;
    const headers = this.getAuthHeaders(integration);
    headers['Accept'] = 'application/vnd.github.v3+json';

    try {
      const res = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, message: `Connected to ${config.owner}/${config.repo}` };
      return { ok: false, message: `GitHub API returned ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  async handleInboundWebhook(
    integration: IntegrationRecord,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<NormalizedInboundEvent[]> {
    // Verify HMAC-SHA256 signature
    if (integration.webhook_secret) {
      const signature = headers['x-hub-signature-256'] || '';
      const expected = 'sha256=' + crypto
        .createHmac('sha256', integration.webhook_secret)
        .update(JSON.stringify(body))
        .digest('hex');
      if (signature !== expected) {
        throw new Error('Invalid webhook signature');
      }
    }

    const eventType = headers['x-github-event'] || '';
    const payload = body as Record<string, any>;
    const events: NormalizedInboundEvent[] = [];

    if (eventType === 'issues') {
      events.push({
        externalType: 'issue',
        externalId: String(payload.issue.id),
        externalUrl: payload.issue.html_url,
        externalKey: `${payload.repository.full_name}#${payload.issue.number}`,
        title: payload.issue.title,
        status: payload.issue.state,
        action: payload.action,
        metadata: { labels: payload.issue.labels?.map((l: any) => l.name), assignee: payload.issue.assignee?.login },
      });
    } else if (eventType === 'pull_request') {
      events.push({
        externalType: 'pull_request',
        externalId: String(payload.pull_request.id),
        externalUrl: payload.pull_request.html_url,
        externalKey: `${payload.repository.full_name}#${payload.pull_request.number}`,
        title: payload.pull_request.title,
        status: payload.pull_request.merged ? 'merged' : payload.pull_request.state,
        action: payload.action,
        metadata: { base: payload.pull_request.base?.ref, head: payload.pull_request.head?.ref },
      });
    } else if (eventType === 'push') {
      events.push({
        externalType: 'push',
        externalId: payload.after || payload.head_commit?.id || '',
        externalUrl: payload.compare,
        externalKey: `${payload.repository.full_name}@${payload.ref}`,
        title: `Push to ${payload.ref}: ${payload.head_commit?.message || ''}`.slice(0, 200),
        status: 'completed',
        action: 'push',
        metadata: { commits: payload.commits?.length, ref: payload.ref },
      });
    }

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'github_create_issue',
        label: 'GitHub: Create Issue',
        description: 'Create a GitHub issue linked to this record',
        configFields: [
          { name: 'title', label: 'Issue Title', type: 'text', required: true, placeholder: '{{record.short_description}}' },
          { name: 'body', label: 'Issue Body', type: 'textarea', placeholder: '{{record.description}}' },
          { name: 'labels', label: 'Labels (comma-separated)', type: 'text', placeholder: 'bug,urgent' },
        ],
      },
      {
        type: 'github_create_comment',
        label: 'GitHub: Add Comment',
        description: 'Add a comment to a linked GitHub issue',
        configFields: [
          { name: 'body', label: 'Comment Body', type: 'textarea', required: true },
          { name: 'issue_number', label: 'Issue Number (or leave blank for linked)', type: 'text' },
        ],
      },
      {
        type: 'github_close_issue',
        label: 'GitHub: Close Issue',
        description: 'Close a linked GitHub issue',
        configFields: [
          { name: 'issue_number', label: 'Issue Number (or leave blank for linked)', type: 'text' },
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
    const headers = this.getAuthHeaders(integration);
    headers['Accept'] = 'application/vnd.github.v3+json';
    headers['Content-Type'] = 'application/json';

    const owner = pConfig.owner as string;
    const repo = pConfig.repo as string;

    switch (actionType) {
      case 'github_create_issue': {
        const labels = config.labels
          ? String(config.labels).split(',').map((l) => l.trim()).filter(Boolean)
          : [];
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: config.title || record.short_description || 'New Issue',
            body: config.body || record.description || '',
            labels,
          }),
        });
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        const issue = await res.json() as Record<string, any>;
        return {
          externalType: 'issue',
          externalId: String(issue.id),
          externalUrl: issue.html_url,
          externalKey: `${owner}/${repo}#${issue.number}`,
          title: issue.title,
          status: issue.state,
        };
      }

      case 'github_create_comment': {
        const issueNumber = config.issue_number as string;
        if (!issueNumber) return;
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}/comments`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ body: config.body || '' }),
        });
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        return;
      }

      case 'github_close_issue': {
        const num = config.issue_number as string;
        if (!num) return;
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${num}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ state: 'closed' }),
        });
        if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
        return;
      }
    }
  }
}
