import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  const hasMajorTable = await knex.schema.hasTable('major_incidents');
  if (!hasMajorTable) return;
  const existing = await knex('major_incidents').first();
  if (existing) return;

  // ── Lookup existing records ──────────────────────────
  const admin = await knex('users').where('username', 'admin').first();
  const beth = await knex('users').where('username', 'beth.service').first();
  const charlie = await knex('users').where('username', 'charlie.ops').first();
  const hector = await knex('users').where('username', 'hector.mgr').first();
  if (!admin || !beth || !charlie || !hector) return;

  const inc1001 = await knex('incidents').where('number', 'INC1001').first();
  const inc1002 = await knex('incidents').where('number', 'INC1002').first();
  const inc1003 = await knex('incidents').where('number', 'INC1003').first();

  // ══════════════════════════════════════════════════════
  //  1. SLA DEFINITIONS (demo data)
  // ══════════════════════════════════════════════════════
  const slaIds = { p1: uuid(), p2: uuid(), p3: uuid(), problem: uuid() };

  await knex('sla_definitions').insert([
    {
      id: slaIds.p1,
      name: 'P1 — Critical (4 hours)',
      table_name: 'incidents',
      condition: JSON.stringify({ priority: '1' }),
      duration_minutes: 240,
      active: true,
    },
    {
      id: slaIds.p2,
      name: 'P2 — High (8 hours)',
      table_name: 'incidents',
      condition: JSON.stringify({ priority: '2' }),
      duration_minutes: 480,
      active: true,
    },
    {
      id: slaIds.p3,
      name: 'P3 — Moderate (24 hours)',
      table_name: 'incidents',
      condition: JSON.stringify({ priority: '3' }),
      duration_minutes: 1440,
      active: true,
    },
    {
      id: slaIds.problem,
      name: 'Problem Investigation (48 hours)',
      table_name: 'problems',
      condition: JSON.stringify({}),
      duration_minutes: 2880,
      active: true,
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  2. MAJOR INCIDENTS
  // ══════════════════════════════════════════════════════
  const miIds = { active1: uuid(), active2: uuid(), resolved1: uuid() };

  await knex('major_incidents').insert([
    {
      id: miIds.active1,
      number: 'MIR0001',
      incident_id: inc1001?.id,
      incident_number: 'INC1001',
      title: 'Database Cluster Failure — Production Down',
      status: 'active',
      severity: 'sev1',
      manager_id: hector.id,
      business_impact: 'All customer services unavailable. Affecting 5000+ users. Revenue impact estimated at $50K/hour.',
      summary: 'Primary DB cluster became unavailable due to storage disk failure. Team investigating failover to secondary.',
      war_room_url: 'https://zoom.us/j/123456789',
      declared_by: admin.id,
      declared_at: new Date(Date.now() - 3600000),
      resolved_at: null,
      created_at: new Date(Date.now() - 3600000),
    },
    {
      id: miIds.active2,
      number: 'MIR0002',
      incident_id: inc1002?.id,
      incident_number: 'INC1002',
      title: 'Network Connectivity Issues — North Data Center',
      status: 'active',
      severity: 'sev2',
      manager_id: charlie.id,
      business_impact: 'North DC experiencing packet loss. 40% of users on degraded performance. Teams in DC unable to access file shares.',
      summary: 'Network switch in north DC experiencing software bug. Vendor working on patch. Customers impacted for 90 minutes.',
      war_room_url: 'https://zoom.us/j/987654321',
      declared_by: beth.id,
      declared_at: new Date(Date.now() - 1800000),
      resolved_at: null,
      created_at: new Date(Date.now() - 1800000),
    },
    {
      id: miIds.resolved1,
      number: 'MIR0003',
      incident_id: inc1003?.id,
      incident_number: 'INC1003',
      title: 'Email Service Outage — 2-hour recovery',
      status: 'resolved',
      severity: 'sev2',
      manager_id: beth.id,
      business_impact: 'Email service was offline. 100% of users unable to send/receive mail. Duration: 2 hours.',
      summary: 'SMTP relay service crashed due to disk space. Cleared logs, restarted service. Now operating normally.',
      war_room_url: 'https://zoom.us/j/555555555',
      declared_by: admin.id,
      declared_at: new Date(Date.now() - 86400000),
      resolved_at: new Date(Date.now() - 82800000),
      created_at: new Date(Date.now() - 86400000),
    },
  ]);

  // Major incident updates (timeline + stakeholder comms)
  const updateIds = { u1: uuid(), u2: uuid(), u3: uuid(), u4: uuid() };
  await knex('major_incident_updates').insert([
    {
      id: updateIds.u1,
      major_incident_id: miIds.active1,
      type: 'timeline',
      audience: 'internal',
      message: 'Incident declared. Primary DB cluster offline due to storage disk failure. Failover to secondary in progress.',
      posted_by: admin.id,
      created_at: new Date(Date.now() - 3600000),
    },
    {
      id: updateIds.u2,
      major_incident_id: miIds.active1,
      type: 'timeline',
      audience: 'internal',
      message: 'Failover completed. Secondary DB now accepting connections. Running consistency checks.',
      posted_by: hector.id,
      created_at: new Date(Date.now() - 2700000),
    },
    {
      id: updateIds.u3,
      major_incident_id: miIds.active1,
      type: 'comms',
      audience: 'stakeholders',
      message: 'UPDATE: We are aware of the service disruption. Primary database experienced a failure at 14:32 UTC. We have initiated failover to our secondary database. Estimated time to full recovery: 30 minutes. We will update every 15 minutes.',
      posted_by: beth.id,
      created_at: new Date(Date.now() - 3300000),
    },
    {
      id: updateIds.u4,
      major_incident_id: miIds.active2,
      type: 'timeline',
      audience: 'internal',
      message: 'Network team confirmed switch software bug. Vendor provided hotfix. Applying now.',
      posted_by: charlie.id,
      created_at: new Date(Date.now() - 1200000),
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  3. EMAIL PROCESSING (Inbound Email)
  // ══════════════════════════════════════════════════════
  const emailAccountIds = { support: uuid(), ops: uuid() };

  await knex('email_accounts').insert([
    {
      id: emailAccountIds.support,
      address: 'support@mycompany.com',
      host: 'imap.gmail.com',
      port: 993,
      username: 'support@mycompany.com',
      password: 'encrypted_password_here',
      protocol: 'imap',
      active: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: emailAccountIds.ops,
      address: 'ops-alerts@mycompany.com',
      host: 'imap.outlook.office365.com',
      port: 993,
      username: 'ops-alerts@mycompany.com',
      password: 'encrypted_password_here',
      protocol: 'imap',
      active: true,
      created_by: admin.id,
      created_at: new Date(),
    },
  ]);

  // Email routing rules
  const ruleIds = { urgent: uuid(), vendor: uuid(), updates: uuid() };
  await knex('email_rules').insert([
    {
      id: ruleIds.urgent,
      email_account_id: emailAccountIds.support,
      priority: 100,
      conditions: JSON.stringify({ subject_contains: 'URGENT' }),
      action: 'create_incident',
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: ruleIds.vendor,
      email_account_id: emailAccountIds.ops,
      priority: 50,
      conditions: JSON.stringify({ from_domain: '@vendor.com' }),
      action: 'create_incident',
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: ruleIds.updates,
      email_account_id: emailAccountIds.support,
      priority: 10,
      conditions: JSON.stringify({ subject_contains: 'status update' }),
      action: 'add_comment',
      created_by: admin.id,
      created_at: new Date(),
    },
  ]);

  // Processed email log
  const procIds = { p1: uuid(), p2: uuid(), p3: uuid() };
  await knex('email_processed').insert([
    {
      id: procIds.p1,
      from_address: 'client.urgent@example.com',
      subject: 'URGENT: Production system down',
      incident_id: inc1001?.id,
      action_taken: 'create_incident',
      message_id: '<123@example.com>',
      created_at: new Date(Date.now() - 7200000),
    },
    {
      id: procIds.p2,
      from_address: 'vendor.monitoring@vendor.com',
      subject: 'Alert: Database CPU high',
      incident_id: inc1002?.id,
      action_taken: 'create_incident',
      message_id: '<124@vendor.com>',
      created_at: new Date(Date.now() - 3600000),
    },
    {
      id: procIds.p3,
      from_address: 'support@example.com',
      subject: 'Re: status update on INC1003',
      incident_id: inc1003?.id,
      action_taken: 'add_comment',
      message_id: '<125@example.com>',
      created_at: new Date(Date.now() - 1800000),
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  4. CHATBOT CONFIGURATION
  // ══════════════════════════════════════════════════════
  const settingIds = { tg: uuid(), slack: uuid(), teams: uuid(), whatsapp: uuid(), discord: uuid() };

  await knex('sys_settings').insert([
    {
      id: settingIds.tg,
      category: 'chatbot',
      key: 'telegram_bot_token',
      value: 'DEMO_TOKEN_123456789_REPLACE_WITH_REAL_TOKEN',
      encrypted: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: settingIds.slack,
      category: 'chatbot',
      key: 'slack_bot_token',
      value: 'DEMO_xoxb_REPLACE_WITH_REAL_TOKEN_SLACK',
      encrypted: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: settingIds.teams,
      category: 'chatbot',
      key: 'teams_bot_token',
      value: 'DEMO_TEAMS_TOKEN_REPLACE_WITH_REAL_TOKEN',
      encrypted: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: settingIds.whatsapp,
      category: 'chatbot',
      key: 'whatsapp_api_key',
      value: 'DEMO_WHATSAPP_KEY_REPLACE_WITH_REAL_TOKEN',
      encrypted: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: settingIds.discord,
      category: 'chatbot',
      key: 'discord_bot_token',
      value: 'DEMO_DISCORD_TOKEN_REPLACE_WITH_REAL_TOKEN',
      encrypted: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: uuid(),
      category: 'chatbot',
      key: 'nlu_enabled',
      value: 'true',
      encrypted: false,
      created_by: admin.id,
      created_at: new Date(),
    },
  ]);

  // Chatbot sessions (demo conversations)
  const sessionIds = { s1: uuid(), s2: uuid() };
  await knex('chat_sessions').insert([
    {
      id: sessionIds.s1,
      platform: 'telegram',
      platform_user_id: '987654321',
      user_id: null,
      status: 'active',
      last_message_at: new Date(),
      created_at: new Date(Date.now() - 7200000),
    },
    {
      id: sessionIds.s2,
      platform: 'slack',
      platform_user_id: 'U123ABC456',
      user_id: beth?.id,
      status: 'active',
      last_message_at: new Date(Date.now() - 600000),
      created_at: new Date(Date.now() - 3600000),
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  5. DASHBOARD WIDGETS (with filters using ConditionBuilder)
  // ══════════════════════════════════════════════════════
  const widgetIds = { stat1: uuid(), chart1: uuid(), chart2: uuid(), table1: uuid() };

  await knex('dashboard_widgets').insert([
    {
      id: widgetIds.stat1,
      dashboard_id: 'default',
      type: 'stat_card',
      title: 'Critical Incidents (P1)',
      table_name: 'incidents',
      aggregate: 'count',
      aggregate_field: null,
      group_by: null,
      columns: null,
      filters: JSON.stringify({ priority: '1', state: 'new' }),
      color: 'red',
      icon: 'IconAlertTriangle',
      col_span: 1,
      row_order: 0,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: widgetIds.chart1,
      dashboard_id: 'default',
      type: 'pie_chart',
      title: 'Incidents by State',
      table_name: 'incidents',
      aggregate: null,
      aggregate_field: null,
      group_by: 'state',
      columns: null,
      filters: JSON.stringify({}),
      color: 'blue',
      icon: 'IconChartPie',
      col_span: 2,
      row_order: 1,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: widgetIds.chart2,
      dashboard_id: 'default',
      type: 'bar_chart',
      title: 'Changes by Priority',
      table_name: 'changes',
      aggregate: null,
      aggregate_field: null,
      group_by: 'priority',
      columns: null,
      filters: JSON.stringify({ state: 'in_progress' }),
      color: 'green',
      icon: 'IconChartBar',
      col_span: 2,
      row_order: 2,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: widgetIds.table1,
      dashboard_id: 'default',
      type: 'table',
      title: 'Recent Changes (P1/P2)',
      table_name: 'changes',
      aggregate: null,
      aggregate_field: null,
      group_by: null,
      columns: JSON.stringify(['number', 'short_description', 'priority', 'state']),
      filters: JSON.stringify({ priority: '1' }),
      color: null,
      icon: null,
      col_span: 4,
      row_order: 3,
      created_by: admin.id,
      created_at: new Date(),
    },
  ]);

  console.log('✅ Seeded: SLA definitions, Major Incidents, Email Processing, Chatbot config, Dashboard widgets');
}
