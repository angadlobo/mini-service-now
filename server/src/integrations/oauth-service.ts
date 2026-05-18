import { db } from '../config/database';
import { logger } from '../config/logger';
import { providerRegistry } from './provider-registry';
import { v4 as uuid } from 'uuid';
import crypto from 'crypto';

export class OAuthService {
  /**
   * Start OAuth flow: generate state, store session, return authorization URL.
   */
  async startOAuth(integrationId: string, userId: string, redirectUri: string): Promise<{ authorizationUrl: string }> {
    const integration = await db('integrations').where('id', integrationId).first();
    if (!integration) throw new Error('Integration not found');
    if (!integration.provider) throw new Error('Integration has no provider');

    const provider = providerRegistry.get(integration.provider);
    if (!provider) throw new Error(`Provider "${integration.provider}" not found`);

    const oauthConfig = provider.getOAuthConfig();
    if (!oauthConfig) throw new Error(`Provider "${integration.provider}" does not support OAuth`);

    // Get client ID from sys_settings
    const clientIdSetting = await db('sys_settings').where('key', oauthConfig.clientIdSettingKey).first();
    if (!clientIdSetting?.value) throw new Error(`Missing setting: ${oauthConfig.clientIdSettingKey}`);

    const state = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await db('integration_oauth_sessions').insert({
      state,
      provider: integration.provider,
      integration_id: integrationId,
      user_id: userId,
      redirect_uri: redirectUri,
      expires_at: expiresAt,
    });

    const params = new URLSearchParams({
      client_id: clientIdSetting.value,
      redirect_uri: redirectUri,
      scope: oauthConfig.scopes.join(' '),
      state,
      response_type: 'code',
    });

    const authorizationUrl = `${oauthConfig.authorizationUrl}?${params.toString()}`;
    return { authorizationUrl };
  }

  /**
   * Handle OAuth callback: exchange code for tokens, store on integration.
   */
  async handleCallback(state: string, code: string): Promise<{ integrationId: string; redirectUri: string | null }> {
    const session = await db('integration_oauth_sessions').where('state', state).first();
    if (!session) throw new Error('Invalid OAuth state');
    if (new Date(session.expires_at) < new Date()) {
      await db('integration_oauth_sessions').where('id', session.id).del();
      throw new Error('OAuth session expired');
    }

    const provider = providerRegistry.get(session.provider);
    if (!provider) throw new Error(`Provider "${session.provider}" not found`);

    const oauthConfig = provider.getOAuthConfig();
    if (!oauthConfig) throw new Error('Provider does not support OAuth');

    // Get client credentials from sys_settings
    const [clientIdSetting, clientSecretSetting] = await Promise.all([
      db('sys_settings').where('key', oauthConfig.clientIdSettingKey).first(),
      db('sys_settings').where('key', oauthConfig.clientSecretSettingKey).first(),
    ]);

    if (!clientIdSetting?.value || !clientSecretSetting?.value) {
      throw new Error('Missing OAuth client credentials in settings');
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        client_id: clientIdSetting.value,
        client_secret: clientSecretSetting.value,
        code,
        redirect_uri: session.redirect_uri || '',
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      logger.error('OAuth token exchange failed', { status: tokenResponse.status, body: errorText });
      throw new Error('Failed to exchange OAuth code for tokens');
    }

    const tokenData = await tokenResponse.json() as Record<string, unknown>;

    const oauthTokens = {
      access_token: tokenData.access_token as string,
      refresh_token: (tokenData.refresh_token as string) || undefined,
      expires_at: tokenData.expires_in
        ? new Date(Date.now() + Number(tokenData.expires_in) * 1000).toISOString()
        : undefined,
      scope: (tokenData.scope as string) || undefined,
    };

    // Store tokens on integration
    await db('integrations').where('id', session.integration_id).update({
      oauth_tokens: JSON.stringify(oauthTokens),
      status: 'connected',
      status_message: null,
      updated_at: new Date(),
    });

    // Clean up session
    await db('integration_oauth_sessions').where('id', session.id).del();

    return { integrationId: session.integration_id, redirectUri: session.redirect_uri };
  }

  /**
   * Refresh an OAuth token for an integration.
   */
  async refreshToken(integrationId: string): Promise<void> {
    const integration = await db('integrations').where('id', integrationId).first();
    if (!integration) throw new Error('Integration not found');
    if (!integration.provider) throw new Error('Integration has no provider');

    const provider = providerRegistry.get(integration.provider);
    if (!provider || !provider.refreshOAuthToken) {
      throw new Error('Provider does not support token refresh');
    }

    try {
      const newTokens = await provider.refreshOAuthToken(integration);
      const existingTokens = typeof integration.oauth_tokens === 'string'
        ? JSON.parse(integration.oauth_tokens)
        : integration.oauth_tokens || {};

      const updated = {
        ...existingTokens,
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || existingTokens.refresh_token,
        expires_at: newTokens.expires_at || existingTokens.expires_at,
      };

      await db('integrations').where('id', integrationId).update({
        oauth_tokens: JSON.stringify(updated),
        status: 'connected',
        status_message: null,
        updated_at: new Date(),
      });
    } catch (err: any) {
      await db('integrations').where('id', integrationId).update({
        status: 'error',
        status_message: `Token refresh failed: ${err.message}`,
        updated_at: new Date(),
      });
      throw err;
    }
  }
}

export const oauthService = new OAuthService();
