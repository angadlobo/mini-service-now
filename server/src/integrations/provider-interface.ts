export interface ProviderFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'password' | 'select' | 'boolean' | 'url' | 'textarea';
  required?: boolean;
  placeholder?: string;
  description?: string;
  options?: { value: string; label: string }[];
  defaultValue?: unknown;
}

export interface OAuthConfig {
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdSettingKey: string;
  clientSecretSettingKey: string;
}

export interface NormalizedInboundEvent {
  externalType: string; // issue, pull_request, work_item, alert, pipeline
  externalId: string;
  externalUrl?: string;
  externalKey?: string;
  title?: string;
  status?: string;
  metadata?: Record<string, unknown>;
  action?: string; // opened, closed, merged, triggered, resolved, etc.
  tableName?: string; // target table hint for auto-linking
  recordId?: string; // target record hint for auto-linking
  autoCreateIncident?: boolean;
  incidentData?: {
    short_description: string;
    description?: string;
    urgency?: number;
    impact?: number;
  };
}

export interface ProviderWorkflowAction {
  type: string;
  label: string;
  description: string;
  configFields: ProviderFieldDefinition[];
}

export interface ExternalResourceResult {
  externalType: string;
  externalId: string;
  externalUrl?: string;
  externalKey?: string;
  title?: string;
  status?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationRecord {
  id: string;
  provider: string;
  provider_config: Record<string, unknown>;
  oauth_tokens?: {
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
    scope?: string;
  } | null;
  webhook_secret?: string | null;
  inbound_webhook_id?: string | null;
  auth_type?: string;
  auth_config?: Record<string, unknown>;
  url?: string;
  status?: string;
}

export abstract class IntegrationProvider {
  abstract readonly name: string;
  abstract readonly displayName: string;
  abstract readonly icon: string;
  abstract readonly description: string;

  abstract getConfigFields(): ProviderFieldDefinition[];

  getOAuthConfig(): OAuthConfig | null {
    return null;
  }

  abstract validateConfig(config: Record<string, unknown>): { valid: boolean; errors: string[] };

  abstract testConnection(integration: IntegrationRecord): Promise<{ ok: boolean; message: string }>;

  abstract handleInboundWebhook(
    integration: IntegrationRecord,
    headers: Record<string, string>,
    body: unknown,
  ): Promise<NormalizedInboundEvent[]>;

  abstract getWorkflowActions(): ProviderWorkflowAction[];

  abstract executeAction(
    actionType: string,
    integration: IntegrationRecord,
    config: Record<string, unknown>,
    record: Record<string, unknown>,
    context: Record<string, unknown>,
  ): Promise<ExternalResourceResult | void>;

  async refreshOAuthToken?(integration: IntegrationRecord): Promise<{
    access_token: string;
    refresh_token?: string;
    expires_at?: string;
  }>;

  getAuthHeaders(integration: IntegrationRecord): Record<string, string> {
    const headers: Record<string, string> = {};
    if (integration.oauth_tokens?.access_token) {
      headers['Authorization'] = `Bearer ${integration.oauth_tokens.access_token}`;
    } else if (integration.auth_type === 'bearer' && (integration.auth_config as any)?.token) {
      headers['Authorization'] = `Bearer ${(integration.auth_config as any).token}`;
    } else if (integration.auth_type === 'api_key' && (integration.auth_config as any)?.api_key) {
      const headerName = (integration.auth_config as any).header_name || 'X-API-Key';
      headers[headerName] = (integration.auth_config as any).api_key;
    }
    return headers;
  }

  getProviderMetadata() {
    return {
      name: this.name,
      displayName: this.displayName,
      icon: this.icon,
      description: this.description,
      configFields: this.getConfigFields(),
      oauthConfig: this.getOAuthConfig() ? {
        authorizationUrl: this.getOAuthConfig()!.authorizationUrl,
        scopes: this.getOAuthConfig()!.scopes,
      } : null,
      workflowActions: this.getWorkflowActions(),
    };
  }
}
