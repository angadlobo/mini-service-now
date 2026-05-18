import {
  IntegrationProvider, ProviderFieldDefinition, OAuthConfig, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class GitLabProvider extends IntegrationProvider {
  readonly name = 'gitlab';
  readonly displayName = 'GitLab';
  readonly icon = 'IconBrandGitlab';
  readonly description = 'Link GitLab issues, merge requests, and pipelines to your records.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'base_url', label: 'GitLab URL', type: 'url', required: true, placeholder: 'https://gitlab.com', defaultValue: 'https://gitlab.com' },
      { name: 'project_id', label: 'Project ID', type: 'text', required: true, placeholder: '12345' },
      { name: 'auto_create_incidents', label: 'Auto-create incidents from pipeline failures', type: 'boolean', defaultValue: false },
    ];
  }

  getOAuthConfig(): OAuthConfig {
    return {
      authorizationUrl: 'https://gitlab.com/oauth/authorize',
      tokenUrl: 'https://gitlab.com/oauth/token',
      scopes: ['api', 'read_user'],
      clientIdSettingKey: 'GITLAB_CLIENT_ID',
      clientSecretSettingKey: 'GITLAB_CLIENT_SECRET',
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.project_id) errors.push('Project ID is required');
    return { valid: errors.length === 0, errors };
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const config = integration.provider_config;
    const baseUrl = (config.base_url as string) || 'https://gitlab.com';
    const headers = this.getAuthHeaders(integration);

    try {
      const res = await fetch(`${baseUrl}/api/v4/projects/${config.project_id}`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const project = await res.json() as Record<string, any>;
        return { ok: true, message: `Connected to ${project.name_with_namespace || config.project_id}` };
      }
      return { ok: false, message: `GitLab API returned ${res.status}` };
    } catch (err: any) {
      return { ok: false, message: err.message };
    }
  }

  async handleInboundWebhook(
    integration: IntegrationRecord,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<NormalizedInboundEvent[]> {
    // Verify X-Gitlab-Token
    if (integration.webhook_secret) {
      const token = headers['x-gitlab-token'] || '';
      if (token !== integration.webhook_secret) {
        throw new Error('Invalid webhook token');
      }
    }

    const payload = body as Record<string, any>;
    const objectKind = payload.object_kind;
    const events: NormalizedInboundEvent[] = [];

    if (objectKind === 'issue') {
      const attrs = payload.object_attributes;
      events.push({
        externalType: 'issue',
        externalId: String(attrs.id),
        externalUrl: attrs.url,
        externalKey: `${payload.project?.path_with_namespace}#${attrs.iid}`,
        title: attrs.title,
        status: attrs.state,
        action: attrs.action,
        metadata: { labels: payload.labels?.map((l: any) => l.title) },
      });
    } else if (objectKind === 'merge_request') {
      const attrs = payload.object_attributes;
      events.push({
        externalType: 'merge_request',
        externalId: String(attrs.id),
        externalUrl: attrs.url,
        externalKey: `${payload.project?.path_with_namespace}!${attrs.iid}`,
        title: attrs.title,
        status: attrs.state,
        action: attrs.action,
        metadata: { source_branch: attrs.source_branch, target_branch: attrs.target_branch },
      });
    } else if (objectKind === 'pipeline') {
      const attrs = payload.object_attributes;
      events.push({
        externalType: 'pipeline',
        externalId: String(attrs.id),
        externalUrl: `${payload.project?.web_url}/-/pipelines/${attrs.id}`,
        externalKey: `pipeline-${attrs.id}`,
        title: `Pipeline #${attrs.id} ${attrs.status}`,
        status: attrs.status,
        action: attrs.status,
        metadata: { ref: attrs.ref, stages: attrs.stages },
        autoCreateIncident: attrs.status === 'failed',
        incidentData: attrs.status === 'failed' ? {
          short_description: `GitLab Pipeline #${attrs.id} failed on ${attrs.ref}`,
          description: `Pipeline ${attrs.id} on branch ${attrs.ref} has failed.`,
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
        type: 'gitlab_create_issue',
        label: 'GitLab: Create Issue',
        description: 'Create a GitLab issue linked to this record',
        configFields: [
          { name: 'title', label: 'Issue Title', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'labels', label: 'Labels (comma-separated)', type: 'text' },
        ],
      },
      {
        type: 'gitlab_create_comment',
        label: 'GitLab: Add Comment',
        description: 'Add a comment to a GitLab issue',
        configFields: [
          { name: 'body', label: 'Comment Body', type: 'textarea', required: true },
          { name: 'issue_iid', label: 'Issue IID', type: 'text' },
        ],
      },
      {
        type: 'gitlab_close_issue',
        label: 'GitLab: Close Issue',
        description: 'Close a GitLab issue',
        configFields: [
          { name: 'issue_iid', label: 'Issue IID', type: 'text' },
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
    const baseUrl = (pConfig.base_url as string) || 'https://gitlab.com';
    const projectId = pConfig.project_id as string;
    const headers = this.getAuthHeaders(integration);
    headers['Content-Type'] = 'application/json';

    switch (actionType) {
      case 'gitlab_create_issue': {
        const res = await fetch(`${baseUrl}/api/v4/projects/${projectId}/issues`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            title: config.title || record.short_description || 'New Issue',
            description: config.description || record.description || '',
            labels: config.labels || '',
          }),
        });
        if (!res.ok) throw new Error(`GitLab API error: ${res.status}`);
        const issue = await res.json() as Record<string, any>;
        return {
          externalType: 'issue',
          externalId: String(issue.id),
          externalUrl: issue.web_url,
          externalKey: `${issue.references?.full || issue.iid}`,
          title: issue.title,
          status: issue.state,
        };
      }

      case 'gitlab_create_comment': {
        const iid = config.issue_iid as string;
        if (!iid) return;
        await fetch(`${baseUrl}/api/v4/projects/${projectId}/issues/${iid}/notes`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ body: config.body || '' }),
        });
        return;
      }

      case 'gitlab_close_issue': {
        const iid = config.issue_iid as string;
        if (!iid) return;
        await fetch(`${baseUrl}/api/v4/projects/${projectId}/issues/${iid}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ state_event: 'close' }),
        });
        return;
      }
    }
  }
}
