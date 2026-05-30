import { Knex } from 'knex';
import { v4 as uuid } from 'uuid';

export async function seed(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('workflows');
  if (!hasTable) return;
  const existing = await knex('workflows').first();
  if (existing) return;

  // ── Lookup existing records ──────────────────────────
  const admin = await knex('users').where('username', 'admin').first();
  const beth = await knex('users').where('username', 'beth.service').first();
  const serviceDesk = await knex('assignment_groups').where('name', 'Service Desk').first();
  if (!admin || !beth || !serviceDesk) return;

  // ══════════════════════════════════════════════════════
  //  1. AUTOMATION WORKFLOWS
  // ══════════════════════════════════════════════════════
  const workflowIds = { autoAssign: uuid(), escalate: uuid(), autoClose: uuid(), slackAlert: uuid() };

  await knex('workflows').insert([
    {
      id: workflowIds.autoAssign,
      name: 'Auto-assign P1 to Service Desk',
      description: 'Automatically assign critical incidents to Service Desk group for immediate response',
      table_name: 'incidents',
      trigger_type: 'record.created',
      trigger_condition: JSON.stringify({ priority: '1' }),
      enabled: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: workflowIds.escalate,
      name: 'Escalate aged P2 incidents',
      description: 'Escalate P2 incidents to P1 if they remain unresolved after 4 hours',
      table_name: 'incidents',
      trigger_type: 'scheduled',
      trigger_condition: JSON.stringify({ priority: '2', state: 'new' }),
      cron_schedule: '0 * * * *',
      enabled: true,
      created_by: beth.id,
      created_at: new Date(),
    },
    {
      id: workflowIds.autoClose,
      name: 'Auto-close resolved incidents after 7 days',
      description: 'Automatically close incidents that have been in Resolved state for 7 days or more',
      table_name: 'incidents',
      trigger_type: 'scheduled',
      trigger_condition: JSON.stringify({ state: 'resolved' }),
      cron_schedule: '0 8 * * *',
      enabled: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: workflowIds.slackAlert,
      name: 'Notify Slack on critical change approval',
      description: 'Send Slack notification to team lead when high-risk changes are approved',
      table_name: 'changes',
      trigger_type: 'record.state_changed',
      trigger_condition: JSON.stringify({ type: 'normal', risk: 'high', state: 'authorized' }),
      enabled: true,
      created_by: admin.id,
      created_at: new Date(),
    },
  ]);

  // Workflow actions (what happens when triggered)
  const actionIds = { assign: uuid(), escalate2: uuid(), close: uuid(), notify: uuid() };
  await knex('workflow_actions').insert([
    {
      id: actionIds.assign,
      workflow_id: workflowIds.autoAssign,
      action_type: 'assign_to_group',
      action_index: 0,
      config: JSON.stringify({ group_id: serviceDesk?.id }),
      created_at: new Date(),
    },
    {
      id: actionIds.assign + '2',
      workflow_id: workflowIds.autoAssign,
      action_type: 'send_notification',
      action_index: 1,
      config: JSON.stringify({ channel: 'slack', message: 'P1 incident assigned to Service Desk: {{record.number}} - {{record.short_description}}' }),
      created_at: new Date(),
    },
    {
      id: actionIds.escalate2,
      workflow_id: workflowIds.escalate,
      action_type: 'set_field',
      action_index: 0,
      config: JSON.stringify({ field: 'priority', value: '1' }),
      created_at: new Date(),
    },
    {
      id: actionIds.escalate2 + '2',
      workflow_id: workflowIds.escalate,
      action_type: 'send_notification',
      action_index: 1,
      config: JSON.stringify({ channel: 'email', message: 'P2 Incident escalated to P1: {{record.number}}' }),
      created_at: new Date(),
    },
    {
      id: actionIds.close,
      workflow_id: workflowIds.autoClose,
      action_type: 'change_state',
      action_index: 0,
      config: JSON.stringify({ target_state: 'closed' }),
      created_at: new Date(),
    },
    {
      id: actionIds.notify,
      workflow_id: workflowIds.slackAlert,
      action_type: 'send_notification',
      action_index: 0,
      config: JSON.stringify({
        channel: 'slack',
        message: '⚠️ High-risk change approved:\n*{{record.number}}* - {{record.short_description}}\nScheduled for: {{record.planned_start_date}}\nRisk: {{record.risk}}'
      }),
      created_at: new Date(),
    },
  ]);

  // ══════════════════════════════════════════════════════
  //  2. SURVEYS
  // ══════════════════════════════════════════════════════
  const surveyIds = {
    satisfaction: uuid(),
    nps: uuid(),
    changeQuality: uuid(),
    serviceQuality: uuid()
  };

  await knex('surveys').insert([
    {
      id: surveyIds.satisfaction,
      number: 'SRV000001',
      title: 'Incident Resolution Satisfaction',
      description: 'Quick survey after incident resolution to measure customer satisfaction',
      status: 'active',
      type: 'satisfaction',
      trigger_table: 'incidents',
      trigger_state: 'closed',
      anonymous: false,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: surveyIds.nps,
      number: 'SRV000002',
      title: 'Service Quality - Net Promoter Score',
      description: 'Monthly NPS survey to track overall satisfaction with support team',
      status: 'active',
      type: 'nps',
      trigger_table: null,
      trigger_state: null,
      anonymous: true,
      created_by: admin.id,
      created_at: new Date(),
    },
    {
      id: surveyIds.changeQuality,
      number: 'SRV000003',
      title: 'Change Quality Assessment',
      description: 'Post-implementation survey to evaluate change quality and execution',
      status: 'active',
      type: 'assessment',
      trigger_table: 'changes',
      trigger_state: 'closed',
      anonymous: false,
      created_by: beth.id,
      created_at: new Date(),
    },
    {
      id: surveyIds.serviceQuality,
      number: 'SRV000004',
      title: 'Self-Service Portal Feedback',
      description: 'Help us improve the portal experience',
      status: 'draft',
      type: 'feedback',
      trigger_table: null,
      trigger_state: null,
      anonymous: true,
      created_by: admin.id,
      created_at: new Date(),
    },
  ]);

  // Survey questions
  const questionIds = {
    // Incident satisfaction
    i1: uuid(), i2: uuid(), i3: uuid(), i4: uuid(),
    // NPS
    n1: uuid(), n2: uuid(),
    // Change quality
    c1: uuid(), c2: uuid(), c3: uuid(),
    // Portal feedback
    p1: uuid(), p2: uuid(), p3: uuid(),
  };

  await knex('survey_questions').insert([
    // Incident satisfaction questions
    {
      id: questionIds.i1,
      survey_id: surveyIds.satisfaction,
      question_text: 'How satisfied are you with the resolution provided?',
      type: 'rating_1_5',
      order_index: 0,
      required: true,
      options: null,
    },
    {
      id: questionIds.i2,
      survey_id: surveyIds.satisfaction,
      question_text: 'How quickly was your issue resolved?',
      type: 'rating_1_5',
      order_index: 1,
      required: true,
      options: null,
    },
    {
      id: questionIds.i3,
      survey_id: surveyIds.satisfaction,
      question_text: 'Would you recommend our support team?',
      type: 'yes_no',
      order_index: 2,
      required: true,
      options: JSON.stringify([{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]),
    },
    {
      id: questionIds.i4,
      survey_id: surveyIds.satisfaction,
      question_text: 'Any additional comments?',
      type: 'text',
      order_index: 3,
      required: false,
      options: null,
    },

    // NPS questions
    {
      id: questionIds.n1,
      survey_id: surveyIds.nps,
      question_text: 'How likely are you to recommend our IT services to a colleague (0-10)?',
      type: 'nps',
      order_index: 0,
      required: true,
      options: null,
    },
    {
      id: questionIds.n2,
      survey_id: surveyIds.nps,
      question_text: 'What could we improve most?',
      type: 'text',
      order_index: 1,
      required: false,
      options: null,
    },

    // Change quality questions
    {
      id: questionIds.c1,
      survey_id: surveyIds.changeQuality,
      question_text: 'Was the change implemented successfully?',
      type: 'yes_no',
      order_index: 0,
      required: true,
      options: JSON.stringify([{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }]),
    },
    {
      id: questionIds.c2,
      survey_id: surveyIds.changeQuality,
      question_text: 'Rate the communication during the change',
      type: 'rating_1_5',
      order_index: 1,
      required: true,
      options: null,
    },
    {
      id: questionIds.c3,
      survey_id: surveyIds.changeQuality,
      question_text: 'Did the change meet business requirements?',
      type: 'rating_1_5',
      order_index: 2,
      required: true,
      options: null,
    },

    // Portal feedback questions
    {
      id: questionIds.p1,
      survey_id: surveyIds.serviceQuality,
      question_text: 'How easy is the portal to use?',
      type: 'rating_1_5',
      order_index: 0,
      required: true,
      options: null,
    },
    {
      id: questionIds.p2,
      survey_id: surveyIds.serviceQuality,
      question_text: 'Which portal feature do you use most?',
      type: 'multiple_choice',
      order_index: 1,
      required: true,
      options: JSON.stringify([
        { value: 'catalog', label: 'Service Catalog' },
        { value: 'requests', label: 'My Requests' },
        { value: 'kb', label: 'Knowledge Base' },
        { value: 'status', label: 'Service Status' },
      ]),
    },
    {
      id: questionIds.p3,
      survey_id: surveyIds.serviceQuality,
      question_text: 'Overall portal satisfaction',
      type: 'rating_1_10',
      order_index: 2,
      required: true,
      options: null,
    },
  ]);

  // Sample survey responses (for analytics)
  const responseIds = { r1: uuid(), r2: uuid(), r3: uuid(), r4: uuid(), r5: uuid() };
  await knex('survey_responses').insert([
    {
      id: responseIds.r1,
      survey_id: surveyIds.satisfaction,
      respondent_id: null,
      overall_score: 85,
      table_name: null,
      record_id: null,
      created_at: new Date(Date.now() - 86400000),
    },
    {
      id: responseIds.r2,
      survey_id: surveyIds.satisfaction,
      respondent_id: null,
      overall_score: 90,
      table_name: null,
      record_id: null,
      created_at: new Date(Date.now() - 172800000),
    },
    {
      id: responseIds.r3,
      survey_id: surveyIds.nps,
      respondent_id: null,
      overall_score: 80,
      table_name: null,
      record_id: null,
      created_at: new Date(Date.now() - 259200000),
    },
    {
      id: responseIds.r4,
      survey_id: surveyIds.changeQuality,
      respondent_id: beth?.id,
      overall_score: 92,
      table_name: null,
      record_id: null,
      created_at: new Date(Date.now() - 345600000),
    },
    {
      id: responseIds.r5,
      survey_id: surveyIds.serviceQuality,
      respondent_id: null,
      overall_score: 75,
      table_name: null,
      record_id: null,
      created_at: new Date(Date.now() - 432000000),
    },
  ]);

  // Sample answers
  await knex('survey_answers').insert([
    // Response 1: Incident satisfaction
    { response_id: responseIds.r1, question_id: questionIds.i1, answer_value: '5' },
    { response_id: responseIds.r1, question_id: questionIds.i2, answer_value: '4' },
    { response_id: responseIds.r1, question_id: questionIds.i3, answer_value: 'yes' },
    { response_id: responseIds.r1, question_id: questionIds.i4, answer_text: 'Great support team!' },

    // Response 2: Incident satisfaction
    { response_id: responseIds.r2, question_id: questionIds.i1, answer_value: '5' },
    { response_id: responseIds.r2, question_id: questionIds.i2, answer_value: '5' },
    { response_id: responseIds.r2, question_id: questionIds.i3, answer_value: 'yes' },
    { response_id: responseIds.r2, question_id: questionIds.i4, answer_text: 'Very responsive' },

    // Response 3: NPS
    { response_id: responseIds.r3, question_id: questionIds.n1, answer_value: '9' },
    { response_id: responseIds.r3, question_id: questionIds.n2, answer_text: 'Better documentation for new features' },

    // Response 4: Change quality
    { response_id: responseIds.r4, question_id: questionIds.c1, answer_value: 'yes' },
    { response_id: responseIds.r4, question_id: questionIds.c2, answer_value: '5' },
    { response_id: responseIds.r4, question_id: questionIds.c3, answer_value: '5' },

    // Response 5: Portal feedback
    { response_id: responseIds.r5, question_id: questionIds.p1, answer_value: '4' },
    { response_id: responseIds.r5, question_id: questionIds.p2, answer_value: 'catalog' },
    { response_id: responseIds.r5, question_id: questionIds.p3, answer_value: '8' },
  ]);

  // ══════════════════════════════════════════════════════
  //  3. WORKFLOW EXECUTIONS (Demo logs for monitoring)
  // ══════════════════════════════════════════════════════
  const inc1001 = await knex('incidents').where('number', 'INC1001').first();
  const inc1002 = await knex('incidents').where('number', 'INC1002').first();

  if (inc1001 && inc1002) {
    const execIds = { e1: uuid(), e2: uuid(), e3: uuid(), e4: uuid() };

    await knex('workflow_executions').insert([
      {
        id: execIds.e1,
        workflow_id: workflowIds.autoAssign,
        table_name: 'incidents',
        record_id: inc1001.id,
        trigger_type: 'record.created',
        status: 'success',
        duration_ms: 245,
        context: JSON.stringify({ number: 'INC1001', priority: '1' }),
        created_at: new Date(Date.now() - 86400000),
      },
      {
        id: execIds.e2,
        workflow_id: workflowIds.autoAssign,
        table_name: 'incidents',
        record_id: inc1002.id,
        trigger_type: 'record.created',
        status: 'success',
        duration_ms: 312,
        context: JSON.stringify({ number: 'INC1002', priority: '1' }),
        created_at: new Date(Date.now() - 172800000),
      },
      {
        id: execIds.e3,
        workflow_id: workflowIds.escalate,
        table_name: 'incidents',
        record_id: inc1002.id,
        trigger_type: 'scheduled',
        status: 'success',
        duration_ms: 189,
        context: JSON.stringify({ trigger: 'cron', action: 'escalate' }),
        created_at: new Date(Date.now() - 259200000),
      },
      {
        id: execIds.e4,
        workflow_id: workflowIds.autoAssign,
        table_name: 'incidents',
        record_id: inc1001.id,
        trigger_type: 'record.created',
        status: 'error',
        duration_ms: 89,
        error: 'Slack channel not configured',
        context: JSON.stringify({ number: 'INC1001', error_step: 'send_notification' }),
        created_at: new Date(Date.now() - 345600000),
      },
    ]);

    // Action logs
    await knex('workflow_action_logs').insert([
      { execution_id: execIds.e1, action_index: 0, action_type: 'assign_to_group', status: 'success', duration_ms: 145, input: JSON.stringify({ group_id: serviceDesk?.id }), output: 'Assigned' },
      { execution_id: execIds.e1, action_index: 1, action_type: 'send_notification', status: 'success', duration_ms: 100, input: JSON.stringify({ channel: 'slack' }), output: 'Sent to #incidents' },
      { execution_id: execIds.e2, action_index: 0, action_type: 'assign_to_group', status: 'success', duration_ms: 156, input: JSON.stringify({ group_id: serviceDesk?.id }), output: 'Assigned' },
      { execution_id: execIds.e2, action_index: 1, action_type: 'send_notification', status: 'success', duration_ms: 156, input: JSON.stringify({ channel: 'slack' }), output: 'Sent to #incidents' },
      { execution_id: execIds.e3, action_index: 0, action_type: 'set_field', status: 'success', duration_ms: 189, input: JSON.stringify({ field: 'priority', value: '1' }), output: 'Priority updated from 2 to 1' },
      { execution_id: execIds.e4, action_index: 0, action_type: 'assign_to_group', status: 'success', duration_ms: 45, input: JSON.stringify({ group_id: serviceDesk?.id }), output: 'Assigned' },
      { execution_id: execIds.e4, action_index: 1, action_type: 'send_notification', status: 'error', duration_ms: 44, input: JSON.stringify({ channel: 'slack' }), error: 'Slack channel not configured', output: null },
    ]);
  }

  console.log('✅ Seeded: Automation workflows (4 templates + executions), Surveys (4 templates with questions & responses)');
}
