import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  // Only seed if problems table exists and is empty
  const hasProblemsTable = await knex.schema.hasTable('problems');
  if (!hasProblemsTable) return;

  const existingProblems = await knex('problems').first();
  if (existingProblems) return;

  // Get existing user IDs
  const admin = await knex('users').where('username', 'admin').first();
  const itilUser = await knex('users').where('username', 'itil.user').first();
  const charlie = await knex('users').where('username', 'charlie.ops').first();
  if (!admin || !itilUser) return;

  const serviceDesk = await knex('assignment_groups').where('name', 'Service Desk').first();
  const networkOps = await knex('assignment_groups').where('name', 'Network Operations').first();

  // ── Problems ──────────────────────────────────────
  const problemIds = { prb1: uuid(), prb2: uuid(), prb3: uuid() };

  await knex('problems').insert([
    {
      id: problemIds.prb1, number: 'PRB1000', short_description: 'Recurring email service outages',
      description: 'Multiple incidents reported over the past month related to email service unavailability during peak hours.',
      state: 'investigation', priority: 2, assigned_to: itilUser.id, assignment_group_id: serviceDesk?.id,
      root_cause: null, workaround: 'Restart Exchange transport service when issue occurs',
      created_by: itilUser.id,
    },
    {
      id: problemIds.prb2, number: 'PRB1001', short_description: 'VPN connection instability',
      description: 'Pattern of VPN disconnections affecting remote workers, particularly during high-bandwidth activities.',
      state: 'root_cause_found', priority: 3, assigned_to: charlie?.id, assignment_group_id: networkOps?.id,
      root_cause: 'VPN concentrator firmware has known bug with MTU handling for split-tunnel connections',
      workaround: 'Use full-tunnel mode as temporary workaround',
      created_by: charlie?.id || itilUser.id,
    },
    {
      id: problemIds.prb3, number: 'PRB1002', short_description: 'Slow database performance on reporting server',
      description: 'Reports taking increasingly longer to generate, affecting business operations.',
      state: 'new', priority: 3, assigned_to: null, assignment_group_id: null,
      created_by: admin.id,
    },
  ]);

  // Link problems to incidents
  const inc1001 = await knex('incidents').where('number', 'INC1001').first();
  const inc1002 = await knex('incidents').where('number', 'INC1002').first();
  if (inc1001) await knex('problem_incidents').insert({ problem_id: problemIds.prb1, incident_id: inc1001.id }).catch(() => {});
  if (inc1002) await knex('problem_incidents').insert({ problem_id: problemIds.prb2, incident_id: inc1002.id }).catch(() => {});

  await knex.raw("SELECT setval('problem_number_seq', 1003)");

  // ── CI Types ──────────────────────────────────────
  const ciTypeIds = { server: uuid(), network: uuid(), application: uuid(), database: uuid(), storage: uuid() };

  await knex('ci_types').insert([
    { id: ciTypeIds.server, name: 'Server', description: 'Physical or virtual servers', icon: 'Server' },
    { id: ciTypeIds.network, name: 'Network Device', description: 'Routers, switches, firewalls', icon: 'Router' },
    { id: ciTypeIds.application, name: 'Application', description: 'Business applications', icon: 'App' },
    { id: ciTypeIds.database, name: 'Database', description: 'Database instances', icon: 'Database' },
    { id: ciTypeIds.storage, name: 'Storage', description: 'SAN, NAS, storage arrays', icon: 'HardDrive' },
  ]);

  // ── CIs ───────────────────────────────────────────
  const ciIds = { web1: uuid(), web2: uuid(), db1: uuid(), fw1: uuid(), app1: uuid(), mail1: uuid() };

  await knex('cis').insert([
    { id: ciIds.web1, number: 'CI1000', ci_type_id: ciTypeIds.server, name: 'WEB-PROD-01', serial_number: 'SRV-2024-001', status: 'active', location: 'DC1 - Rack A3', cost: 8500, created_by: admin.id },
    { id: ciIds.web2, number: 'CI1001', ci_type_id: ciTypeIds.server, name: 'WEB-PROD-02', serial_number: 'SRV-2024-002', status: 'active', location: 'DC1 - Rack A3', cost: 8500, created_by: admin.id },
    { id: ciIds.db1, number: 'CI1002', ci_type_id: ciTypeIds.database, name: 'DB-PROD-01', serial_number: 'SRV-2024-010', status: 'active', location: 'DC1 - Rack B1', cost: 15000, created_by: admin.id },
    { id: ciIds.fw1, number: 'CI1003', ci_type_id: ciTypeIds.network, name: 'FW-EDGE-01', serial_number: 'FW-2024-001', status: 'active', location: 'DC1 - Rack A1', cost: 12000, created_by: admin.id },
    { id: ciIds.app1, number: 'CI1004', ci_type_id: ciTypeIds.application, name: 'ERP System', status: 'active', location: 'Cloud', cost: 0, created_by: admin.id },
    { id: ciIds.mail1, number: 'CI1005', ci_type_id: ciTypeIds.server, name: 'MAIL-PROD-01', serial_number: 'SRV-2024-020', status: 'active', location: 'DC2 - Rack C1', cost: 10000, created_by: admin.id },
  ]);

  // CI Relationships
  await knex('ci_relationships').insert([
    { parent_ci_id: ciIds.app1, child_ci_id: ciIds.web1, type: 'runs_on' },
    { parent_ci_id: ciIds.app1, child_ci_id: ciIds.web2, type: 'runs_on' },
    { parent_ci_id: ciIds.app1, child_ci_id: ciIds.db1, type: 'depends_on' },
    { parent_ci_id: ciIds.web1, child_ci_id: ciIds.fw1, type: 'connected_to' },
    { parent_ci_id: ciIds.web2, child_ci_id: ciIds.fw1, type: 'connected_to' },
  ]);

  await knex.raw("SELECT setval('ci_number_seq', 1006)");

  // ── Workflow Rules ────────────────────────────────
  await knex('workflow_rules').insert([
    {
      name: 'Auto-assign P1 incidents to Service Desk',
      table_name: 'incidents',
      trigger_event: 'record.created',
      conditions: JSON.stringify({ logic: 'AND', conditions: [{ field: 'priority', operator: 'equals', value: 1 }] }),
      actions: JSON.stringify([
        { type: 'assign_to_group', config: { group_id: serviceDesk?.id } },
        { type: 'create_journal_entry', config: { journal_type: 'work_note', body: 'Auto-assigned to Service Desk due to P1 priority' } },
      ]),
      active: true,
      execution_order: 10,
      created_by: admin.id,
    },
    {
      name: 'Notify on incident state change',
      table_name: 'incidents',
      trigger_event: 'record.state_changed',
      conditions: JSON.stringify({ logic: 'AND', conditions: [] }),
      actions: JSON.stringify([
        { type: 'send_notification', config: { title: 'Incident State Changed', body: 'Your incident state has been updated' } },
      ]),
      active: true,
      execution_order: 20,
      created_by: admin.id,
    },
  ]);

  // ── AI Prompts (seeded without provider) ──────────
  await knex('ai_prompts').insert([
    {
      name: 'incident_summary',
      use_case: 'incident_summary',
      system_prompt: 'You are an ITSM specialist. Summarize the following incident clearly and concisely for a handoff to another team member.',
      user_prompt_template: 'Incident: {{number}}\nDescription: {{description}}\nCurrent State: {{state}}\nPriority: P{{priority}}\nComments:\n{{journal_entries}}\n\nProvide a brief summary suitable for a handoff.',
      active: true,
      created_by: admin.id,
    },
    {
      name: 'incident_suggest_resolution',
      use_case: 'incident_suggest_resolution',
      system_prompt: 'You are an experienced IT support engineer. Based on the incident details, suggest step-by-step resolution actions.',
      user_prompt_template: 'Incident: {{number}}\nDescription: {{description}}\nShort Description: {{short_description}}\nPriority: P{{priority}}\n\nSuggest resolution steps for this incident.',
      active: true,
      created_by: admin.id,
    },
    {
      name: 'change_risk_assessment',
      use_case: 'change_risk_assessment',
      system_prompt: 'You are a change management specialist. Assess the risk of the proposed change and provide recommendations.',
      user_prompt_template: 'Change: {{number}}\nDescription: {{description}}\nType: {{type}}\nCurrent Risk Level: {{risk}}\nBackout Plan: {{backout_plan}}\n\nAssess the risk and provide recommendations.',
      active: true,
      created_by: admin.id,
    },
    {
      name: 'problem_root_cause',
      use_case: 'problem_root_cause',
      system_prompt: 'You are a problem management specialist. Analyze the linked incidents and suggest possible root causes.',
      user_prompt_template: 'Problem: {{number}}\nDescription: {{description}}\nLinked Incidents: {{linked_incidents}}\nWorkaround: {{workaround}}\n\nAnalyze and suggest possible root causes.',
      active: true,
      created_by: admin.id,
    },
    {
      name: 'kb_article_draft',
      use_case: 'kb_article_draft',
      system_prompt: 'You are a technical writer. Draft a knowledge base article based on the resolved incident.',
      user_prompt_template: 'Incident: {{number}}\nDescription: {{description}}\nResolution: {{resolution_notes}}\n\nDraft a knowledge base article with Problem, Cause, and Solution sections.',
      active: true,
      created_by: admin.id,
    },
    {
      name: 'ticket_classify',
      use_case: 'ticket_classify',
      system_prompt: 'You are an ITSM classifier. Based on the ticket description, suggest appropriate priority, category, and assignment group.',
      user_prompt_template: 'Description: {{description}}\nShort Description: {{short_description}}\n\nSuggest:\n1. Priority (1-5, where 1 is critical)\n2. Category\n3. Assignment Group (Service Desk, Network Operations, DevOps, Security)',
      active: true,
      created_by: admin.id,
    },
  ]);

  // ── Notification Channel (in-app default) ─────────
  await knex('notification_channels').insert([
    { name: 'In-App Notifications', type: 'in_app', config: '{}', active: true },
    { name: 'Email', type: 'email', config: '{}', active: false },
    { name: 'Slack', type: 'slack', config: '{}', active: false },
  ]);

  // ── Sample Form Template ──────────────────────────
  const formId = uuid();
  await knex('form_templates').insert({
    id: formId,
    name: 'Employee Onboarding Request',
    description: 'Request form for new employee onboarding',
    active: true,
    created_by: admin.id,
  });

  await knex('form_fields').insert([
    { template_id: formId, field_type: 'section', label: 'Employee Information', name: 'section_employee', sort_order: 0 },
    { template_id: formId, field_type: 'text', label: 'Employee Name', name: 'employee_name', required: true, sort_order: 1 },
    { template_id: formId, field_type: 'text', label: 'Email Address', name: 'email', required: true, sort_order: 2 },
    { template_id: formId, field_type: 'select', label: 'Department', name: 'department', required: true, sort_order: 3, config: JSON.stringify({ options: ['Engineering', 'Sales', 'Marketing', 'HR', 'Finance'] }) },
    { template_id: formId, field_type: 'date', label: 'Start Date', name: 'start_date', required: true, sort_order: 4 },
    { template_id: formId, field_type: 'section', label: 'Access Requirements', name: 'section_access', sort_order: 5 },
    { template_id: formId, field_type: 'checkbox', label: 'Needs VPN Access', name: 'vpn_access', sort_order: 6 },
    { template_id: formId, field_type: 'checkbox', label: 'Needs Admin Rights', name: 'admin_rights', sort_order: 7 },
    { template_id: formId, field_type: 'textarea', label: 'Additional Notes', name: 'notes', sort_order: 8 },
  ]);
}
