import {
  IntegrationProvider, ProviderFieldDefinition, OAuthConfig, NormalizedInboundEvent,
  ProviderWorkflowAction, ExternalResourceResult, IntegrationRecord,
} from '../provider-interface';

export class AzureDevOpsProvider extends IntegrationProvider {
  readonly name = 'azure_devops';
  readonly displayName = 'Azure DevOps';
  readonly icon = 'IconBrandAzure';
  readonly description = 'Create and link work items, trigger pipelines, and sync build status.';

  getConfigFields(): ProviderFieldDefinition[] {
    return [
      { name: 'organization', label: 'Organization', type: 'text', required: true, placeholder: 'myorg' },
      { name: 'project', label: 'Project', type: 'text', required: true, placeholder: 'MyProject' },
      { name: 'pat', label: 'Personal Access Token', type: 'password', description: 'Required if not using OAuth' },
    ];
  }

  getOAuthConfig(): OAuthConfig {
    return {
      authorizationUrl: 'https://app.vssps.visualstudio.com/oauth2/authorize',
      tokenUrl: 'https://app.vssps.visualstudio.com/oauth2/token',
      scopes: ['vso.work_write', 'vso.build_execute'],
      clientIdSettingKey: 'AZURE_DEVOPS_CLIENT_ID',
      clientSecretSettingKey: 'AZURE_DEVOPS_CLIENT_SECRET',
    };
  }

  validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (!config.organization) errors.push('Organization is required');
    if (!config.project) errors.push('Project is required');
    return { valid: errors.length === 0, errors };
  }

  private getHeaders(integration: IntegrationRecord): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (integration.oauth_tokens?.access_token) {
      headers['Authorization'] = `Bearer ${integration.oauth_tokens.access_token}`;
    } else if (integration.provider_config.pat) {
      headers['Authorization'] = `Basic ${Buffer.from(`:${integration.provider_config.pat}`).toString('base64')}`;
    }
    return headers;
  }

  private baseUrl(integration: IntegrationRecord): string {
    const org = integration.provider_config.organization;
    const project = integration.provider_config.project;
    return `https://dev.azure.com/${org}/${project}`;
  }

  async testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }> {
    const headers = this.getHeaders(integration);
    try {
      const res = await fetch(`${this.baseUrl(integration)}/_apis/projects?api-version=7.0`, {
        headers,
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) return { ok: true, message: `Connected to ${integration.provider_config.organization}/${integration.provider_config.project}` };
      return { ok: false, message: `Azure DevOps API returned ${res.status}` };
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
    const eventType = payload.eventType || '';
    const events: NormalizedInboundEvent[] = [];

    if (eventType.startsWith('workitem.')) {
      const resource = payload.resource;
      if (resource) {
        events.push({
          externalType: 'work_item',
          externalId: String(resource.id),
          externalUrl: resource._links?.html?.href || resource.url,
          externalKey: `ADO-${resource.id}`,
          title: resource.fields?.['System.Title'],
          status: resource.fields?.['System.State'],
          action: eventType.replace('workitem.', ''),
          metadata: {
            workItemType: resource.fields?.['System.WorkItemType'],
            assignedTo: resource.fields?.['System.AssignedTo']?.displayName,
          },
        });
      }
    } else if (eventType === 'build.complete') {
      const resource = payload.resource;
      if (resource) {
        events.push({
          externalType: 'pipeline',
          externalId: String(resource.id),
          externalUrl: resource._links?.web?.href,
          externalKey: `build-${resource.id}`,
          title: `Build ${resource.buildNumber} - ${resource.result}`,
          status: resource.result,
          action: 'complete',
          metadata: { definition: resource.definition?.name, sourceBranch: resource.sourceBranch },
        });
      }
    }

    return events;
  }

  getWorkflowActions(): ProviderWorkflowAction[] {
    return [
      {
        type: 'ado_create_work_item',
        label: 'Azure DevOps: Create Work Item',
        description: 'Create an Azure DevOps work item',
        configFields: [
          { name: 'type', label: 'Work Item Type', type: 'select', required: true, options: [
            { value: 'Task', label: 'Task' }, { value: 'Bug', label: 'Bug' },
            { value: 'User Story', label: 'User Story' }, { value: 'Feature', label: 'Feature' },
          ]},
          { name: 'title', label: 'Title', type: 'text', required: true },
          { name: 'description', label: 'Description', type: 'textarea' },
        ],
      },
      {
        type: 'ado_link_work_item',
        label: 'Azure DevOps: Link Work Item',
        description: 'Link an existing work item to this record',
        configFields: [
          { name: 'work_item_id', label: 'Work Item ID', type: 'text', required: true },
        ],
      },
      {
        type: 'ado_trigger_pipeline',
        label: 'Azure DevOps: Trigger Pipeline',
        description: 'Trigger an Azure DevOps pipeline run',
        configFields: [
          { name: 'definition_id', label: 'Pipeline Definition ID', type: 'text', required: true },
          { name: 'branch', label: 'Branch', type: 'text', placeholder: 'main' },
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
    const headers = this.getHeaders(integration);
    const base = this.baseUrl(integration);

    switch (actionType) {
      case 'ado_create_work_item': {
        const wiType = config.type || 'Task';
        const patchDoc = [
          { op: 'add', path: '/fields/System.Title', value: config.title || record.short_description || 'New Work Item' },
          ...(config.description ? [{ op: 'add', path: '/fields/System.Description', value: config.description }] : []),
        ];
        const res = await fetch(`${base}/_apis/wit/workitems/$${wiType}?api-version=7.0`, {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json-patch+json' },
          body: JSON.stringify(patchDoc),
        });
        if (!res.ok) throw new Error(`Azure DevOps API error: ${res.status}`);
        const wi = await res.json() as Record<string, any>;
        return {
          externalType: 'work_item',
          externalId: String(wi.id),
          externalUrl: wi._links?.html?.href,
          externalKey: `ADO-${wi.id}`,
          title: wi.fields?.['System.Title'],
          status: wi.fields?.['System.State'],
        };
      }

      case 'ado_trigger_pipeline': {
        const defId = config.definition_id as string;
        if (!defId) return;
        const res = await fetch(`${base}/_apis/build/builds?api-version=7.0`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            definition: { id: Number(defId) },
            sourceBranch: config.branch ? `refs/heads/${config.branch}` : undefined,
          }),
        });
        if (!res.ok) throw new Error(`Azure DevOps API error: ${res.status}`);
        const build = await res.json() as Record<string, any>;
        return {
          externalType: 'pipeline',
          externalId: String(build.id),
          externalUrl: build._links?.web?.href,
          externalKey: `build-${build.id}`,
          title: `Build #${build.buildNumber}`,
          status: build.status,
        };
      }

      case 'ado_link_work_item': {
        // Just create an integration_link, no API call needed
        return {
          externalType: 'work_item',
          externalId: config.work_item_id as string,
          externalKey: `ADO-${config.work_item_id}`,
          title: `Work Item ${config.work_item_id}`,
          status: 'linked',
        };
      }
    }
  }
}
