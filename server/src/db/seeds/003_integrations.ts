import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Only seed if integration_links table exists and is empty
  const hasTable = await knex.schema.hasTable('integration_links');
  if (!hasTable) return;

  const existingLinks = await knex('integration_links').first();
  if (existingLinks) return;

  const admin = await knex('users').where('username', 'admin').first();
  if (!admin) return;

  // ── Integration Providers ──────────────────────────
  // Create sample integration records for several providers

  const githubId = uuid();
  const jiraId = uuid();
  const pagerdId = uuid();
  const teamsId = uuid();
  const datadogId = uuid();
  const grafanaId = uuid();

  await knex('integrations').insert([
    {
      id: githubId,
      name: 'GitHub - Platform Repo',
      type: 'provider',
      provider: 'github',
      provider_config: JSON.stringify({ owner: 'acme-corp', repo: 'platform-api', auto_create_links: true }),
      url: 'https://api.github.com',
      auth_type: 'bearer',
      auth_config: JSON.stringify({}),
      events: JSON.stringify(['record.created', 'record.state_changed']),
      active: true,
      status: 'connected',
      status_message: 'Connected via OAuth2',
      inbound_webhook_id: 'gh-platform-' + githubId.slice(0, 8),
      webhook_secret: 'whsec_demo_github_secret_1234',
      oauth_tokens: JSON.stringify({ access_token: 'gho_demo_token_placeholder', scope: 'repo,write:org', expires_at: null }),
      last_sync_at: new Date(),
      created_by: admin.id,
    },
    {
      id: jiraId,
      name: 'Jira Cloud - IT Project',
      type: 'provider',
      provider: 'jira',
      provider_config: JSON.stringify({ cloud_id: 'abc123-demo', site_url: 'https://acme-corp.atlassian.net', project_key: 'ITP' }),
      url: 'https://acme-corp.atlassian.net',
      auth_type: 'bearer',
      auth_config: JSON.stringify({}),
      events: JSON.stringify(['record.created', 'record.updated']),
      active: true,
      status: 'connected',
      status_message: 'Connected via Atlassian OAuth2',
      inbound_webhook_id: 'jira-itp-' + jiraId.slice(0, 8),
      webhook_secret: null,
      oauth_tokens: JSON.stringify({ access_token: 'eyJ_demo_jira_token', refresh_token: 'refresh_demo_jira', expires_at: new Date(Date.now() + 3600000).toISOString(), scope: 'read:jira-work write:jira-work' }),
      last_sync_at: new Date(),
      created_by: admin.id,
    },
    {
      id: pagerdId,
      name: 'PagerDuty - On-Call',
      type: 'provider',
      provider: 'pagerduty',
      provider_config: JSON.stringify({ service_id: 'P_SVC_DEMO', escalation_policy_id: 'P_ESC_DEMO', auto_create_incidents: true }),
      url: 'https://api.pagerduty.com',
      auth_type: 'bearer',
      auth_config: JSON.stringify({ token: 'pd_demo_api_key_placeholder' }),
      events: JSON.stringify(['record.created', 'record.state_changed']),
      active: true,
      status: 'connected',
      status_message: 'API key verified',
      inbound_webhook_id: 'pd-oncall-' + pagerdId.slice(0, 8),
      webhook_secret: 'whsec_demo_pagerduty_1234',
      oauth_tokens: null,
      last_sync_at: new Date(),
      created_by: admin.id,
    },
    {
      id: teamsId,
      name: 'Microsoft Teams - IT Ops Channel',
      type: 'provider',
      provider: 'teams',
      provider_config: JSON.stringify({ webhook_url: 'https://outlook.office.com/webhook/demo-guid/IncomingWebhook/demo-path', channel_name: '#it-ops' }),
      url: 'https://outlook.office.com/webhook/demo-guid',
      auth_type: 'none',
      auth_config: JSON.stringify({}),
      events: JSON.stringify(['record.created', 'record.state_changed']),
      active: true,
      status: 'connected',
      status_message: 'Webhook URL configured',
      inbound_webhook_id: 'teams-itops-' + teamsId.slice(0, 8),
      webhook_secret: null,
      oauth_tokens: null,
      last_sync_at: new Date(),
      created_by: admin.id,
    },
    {
      id: datadogId,
      name: 'Datadog - Production Monitoring',
      type: 'provider',
      provider: 'datadog',
      provider_config: JSON.stringify({ site: 'datadoghq.com', auto_create_incidents: true }),
      url: 'https://api.datadoghq.com',
      auth_type: 'api_key',
      auth_config: JSON.stringify({ key: 'dd_demo_api_key', headerName: 'DD-API-KEY' }),
      events: JSON.stringify(['record.created']),
      active: true,
      status: 'connected',
      status_message: 'API key + App key verified',
      inbound_webhook_id: 'dd-prod-' + datadogId.slice(0, 8),
      webhook_secret: null,
      oauth_tokens: null,
      last_sync_at: new Date(),
      created_by: admin.id,
    },
    {
      id: grafanaId,
      name: 'Grafana - Infrastructure Alerts',
      type: 'provider',
      provider: 'grafana',
      provider_config: JSON.stringify({ grafana_url: 'https://grafana.acme-corp.internal', auto_create_incidents: true }),
      url: 'https://grafana.acme-corp.internal',
      auth_type: 'bearer',
      auth_config: JSON.stringify({ token: 'glsa_demo_grafana_token' }),
      events: JSON.stringify(['record.created']),
      active: true,
      status: 'connected',
      status_message: 'Bearer token verified',
      inbound_webhook_id: 'graf-infra-' + grafanaId.slice(0, 8),
      webhook_secret: null,
      oauth_tokens: null,
      last_sync_at: new Date(),
      created_by: admin.id,
    },
  ]);

  // ── Integration Links ──────────────────────────────
  // Link external resources to existing incidents, changes, and problems

  const inc1 = await knex('incidents').where('number', 'INC1001').first();
  const inc2 = await knex('incidents').where('number', 'INC1002').first();
  const inc3 = await knex('incidents').where('number', 'INC1003').first();
  const chg1 = await knex('changes').where('number', 'CHG1001').first();
  const chg2 = await knex('changes').where('number', 'CHG1002').first();
  const prb1 = await knex('problems').where('number', 'PRB1000').first();

  const links: any[] = [];

  // GitHub links on incidents
  if (inc1) {
    links.push({
      id: uuid(),
      integration_id: githubId,
      table_name: 'incidents',
      record_id: inc1.id,
      provider: 'github',
      external_type: 'issue',
      external_id: '142',
      external_url: 'https://github.com/acme-corp/platform-api/issues/142',
      external_key: 'acme-corp/platform-api#142',
      title: 'Email service returns 503 during peak hours',
      status: 'open',
      metadata: JSON.stringify({ labels: ['bug', 'priority:high'], assignee: 'jdoe' }),
      direction: 'outbound',
    });
  }

  if (inc2) {
    links.push({
      id: uuid(),
      integration_id: githubId,
      table_name: 'incidents',
      record_id: inc2.id,
      provider: 'github',
      external_type: 'pull_request',
      external_id: '287',
      external_url: 'https://github.com/acme-corp/platform-api/pull/287',
      external_key: 'acme-corp/platform-api#287',
      title: 'Fix VPN MTU handling for split-tunnel connections',
      status: 'merged',
      metadata: JSON.stringify({ merged_by: 'cops', branch: 'fix/vpn-mtu' }),
      direction: 'inbound',
    });
  }

  // Jira links on changes
  if (chg1) {
    links.push({
      id: uuid(),
      integration_id: jiraId,
      table_name: 'changes',
      record_id: chg1.id,
      provider: 'jira',
      external_type: 'issue',
      external_id: '10542',
      external_url: 'https://acme-corp.atlassian.net/browse/ITP-542',
      external_key: 'ITP-542',
      title: 'Deploy email server patch v2.4.1',
      status: 'Done',
      metadata: JSON.stringify({ issue_type: 'Task', sprint: 'Sprint 23' }),
      direction: 'outbound',
    });
  }

  if (chg2) {
    links.push({
      id: uuid(),
      integration_id: jiraId,
      table_name: 'changes',
      record_id: chg2.id,
      provider: 'jira',
      external_type: 'issue',
      external_id: '10601',
      external_url: 'https://acme-corp.atlassian.net/browse/ITP-601',
      external_key: 'ITP-601',
      title: 'Network switch firmware upgrade - DC1',
      status: 'In Progress',
      metadata: JSON.stringify({ issue_type: 'Story', sprint: 'Sprint 24', story_points: 5 }),
      direction: 'outbound',
    });
  }

  // PagerDuty links on incidents
  if (inc3) {
    links.push({
      id: uuid(),
      integration_id: pagerdId,
      table_name: 'incidents',
      record_id: inc3.id,
      provider: 'pagerduty',
      external_type: 'incident',
      external_id: 'P_INC_00891',
      external_url: 'https://acme-corp.pagerduty.com/incidents/P_INC_00891',
      external_key: 'P_INC_00891',
      title: 'High CPU alert - WEB-PROD-01',
      status: 'triggered',
      metadata: JSON.stringify({ urgency: 'high', escalation_level: 1 }),
      direction: 'inbound',
    });
  }

  // Datadog link on an incident (auto-created from alert)
  if (inc1) {
    links.push({
      id: uuid(),
      integration_id: datadogId,
      table_name: 'incidents',
      record_id: inc1.id,
      provider: 'datadog',
      external_type: 'alert',
      external_id: 'monitor-7891234',
      external_url: 'https://app.datadoghq.com/monitors/7891234',
      external_key: 'Monitor: Email Service Health',
      title: 'ALERT - Email Service Health Check Failed',
      status: 'Alert',
      metadata: JSON.stringify({ monitor_id: 7891234, tags: ['service:email', 'env:production'] }),
      direction: 'inbound',
    });
  }

  // GitHub issue on a problem
  if (prb1) {
    links.push({
      id: uuid(),
      integration_id: githubId,
      table_name: 'problems',
      record_id: prb1.id,
      provider: 'github',
      external_type: 'issue',
      external_id: '98',
      external_url: 'https://github.com/acme-corp/platform-api/issues/98',
      external_key: 'acme-corp/platform-api#98',
      title: 'Investigate recurring email service memory leaks',
      status: 'open',
      metadata: JSON.stringify({ labels: ['investigation', 'priority:high'], milestone: 'Q3 Stability' }),
      direction: 'outbound',
    });
  }

  if (links.length > 0) {
    await knex('integration_links').insert(links);
  }

  // ── Integration Logs (sample delivery logs) ────────
  const logEntries: any[] = [];

  if (inc1) {
    logEntries.push({
      integration_id: githubId,
      event_type: 'record.created',
      payload: JSON.stringify({ table: 'incidents', record_id: inc1.id, number: 'INC1001' }),
      response_status: 201,
      response_body: JSON.stringify({ id: 142, html_url: 'https://github.com/acme-corp/platform-api/issues/142' }),
      success: true,
    });
    logEntries.push({
      integration_id: datadogId,
      event_type: 'integration.inbound',
      payload: JSON.stringify({ monitor_id: 7891234, alert_type: 'error', title: 'Email Service Health Check Failed' }),
      response_status: null,
      response_body: JSON.stringify({ action: 'auto_created_incident', incident_number: 'INC1001' }),
      success: true,
    });
  }

  if (chg1) {
    logEntries.push({
      integration_id: jiraId,
      event_type: 'record.created',
      payload: JSON.stringify({ table: 'changes', record_id: chg1.id, number: 'CHG1001' }),
      response_status: 201,
      response_body: JSON.stringify({ id: '10542', key: 'ITP-542', self: 'https://acme-corp.atlassian.net/rest/api/3/issue/10542' }),
      success: true,
    });
  }

  if (inc2) {
    logEntries.push({
      integration_id: githubId,
      event_type: 'integration.inbound',
      payload: JSON.stringify({ action: 'closed', pull_request: { number: 287, merged: true, title: 'Fix VPN MTU handling' } }),
      response_status: null,
      response_body: JSON.stringify({ action: 'link_updated', status: 'merged' }),
      success: true,
    });
  }

  logEntries.push({
    integration_id: teamsId,
    event_type: 'record.state_changed',
    payload: JSON.stringify({ table: 'incidents', number: 'INC1001', old_state: 'new', new_state: 'in_progress' }),
    response_status: 200,
    response_body: JSON.stringify({ ok: true }),
    success: true,
  });

  logEntries.push({
    integration_id: pagerdId,
    event_type: 'integration.inbound',
    payload: JSON.stringify({ event: { event_type: 'incident.triggered', data: { id: 'P_INC_00891', title: 'High CPU alert' } } }),
    response_status: null,
    response_body: JSON.stringify({ action: 'auto_created_incident' }),
    success: true,
  });

  if (logEntries.length > 0) {
    await knex('integration_logs').insert(logEntries);
  }
}
