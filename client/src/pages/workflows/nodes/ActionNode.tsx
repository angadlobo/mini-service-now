import { Handle, Position, type NodeProps } from 'reactflow';
import { Paper, Text, Badge, Stack } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';

export interface ActionNodeData {
  action: {
    type: string;
    config: Record<string, unknown>;
  };
  onEdit?: () => void;
}

const ACTION_LABELS: Record<string, string> = {
  set_field: 'Set Field',
  change_state: 'Change State',
  assign_to: 'Assign To User',
  assign_to_group: 'Assign To Group',
  send_notification: 'Send Notification',
  create_journal_entry: 'Create Journal Entry',
  launch_form: 'Launch Form Task',
  delay: 'Delay / Timer',
  call_workflow: 'Call Sub-Workflow',
  create_approval: 'Create Approval',
  create_task: 'Create Task',
  http_request: 'HTTP Request',
  send_email: 'Send Email',
  send_slack: 'Send Slack',
  run_script: 'Run Script',
  escalate: 'Escalate',
  if_else: 'If / Else',
  switch: 'Switch',
  parallel: 'Parallel',
  update_record: 'Update Record',
  log_message: 'Log Message',
  // Integration provider actions
  github_create_issue: 'GitHub: Create Issue',
  github_create_comment: 'GitHub: Comment',
  github_close_issue: 'GitHub: Close Issue',
  gitlab_create_issue: 'GitLab: Create Issue',
  gitlab_create_comment: 'GitLab: Comment',
  gitlab_close_issue: 'GitLab: Close Issue',
  jira_create_issue: 'Jira: Create Issue',
  jira_transition_issue: 'Jira: Transition',
  jira_add_comment: 'Jira: Comment',
  pagerduty_trigger: 'PagerDuty: Trigger',
  pagerduty_acknowledge: 'PagerDuty: Ack',
  pagerduty_resolve: 'PagerDuty: Resolve',
  pagerduty_get_oncall: 'PagerDuty: On-Call',
  teams_send_card: 'Teams: Send Card',
  teams_send_approval_card: 'Teams: Approval',
  ado_create_work_item: 'ADO: Work Item',
  ado_link_work_item: 'ADO: Link',
  ado_trigger_pipeline: 'ADO: Pipeline',
  datadog_create_event: 'Datadog: Event',
  datadog_mute_monitor: 'Datadog: Mute',
  grafana_create_annotation: 'Grafana: Annotate',
};

function summarizeAction(action: ActionNodeData['action']): string {
  if (!action) return 'No action configured';

  const config = action.config || {};
  switch (action.type) {
    case 'set_field':
      return `${config.field || '?'} = ${config.value ?? '?'}`;
    case 'change_state':
      return `state -> ${config.state || '?'}`;
    case 'assign_to':
      return `user: ${config.user_id || '?'}`;
    case 'assign_to_group':
      return `group: ${config.group_id || '?'}`;
    case 'send_notification':
      return `"${config.title || 'Untitled'}"`;
    case 'create_journal_entry':
      return `${config.journal_type || 'comment'}`;
    case 'launch_form':
      return `form: ${config.form_template_name || config.form_template_id || '?'}`;
    case 'delay':
      return `wait ${config.duration_minutes || '?'} min`;
    case 'call_workflow':
      return `workflow: ${config.target_workflow_name || config.target_workflow_id || '?'}`;
    case 'create_approval':
      return `${(config.approver_ids as string[])?.length || 0} approvers`;
    case 'create_task':
      return `in ${config.table_name || 'same table'}`;
    case 'http_request':
      return `${config.method || 'GET'} ${config.url || '?'}`;
    case 'send_email':
      return `to: ${config.to || '?'}`;
    case 'send_slack':
      return `message`;
    case 'run_script':
      return `script`;
    case 'escalate':
      return `${config.escalation_type || 'manager'}`;
    case 'update_record':
      return `${config.table_name || 'same table'}`;
    case 'log_message':
      return `${config.level || 'info'}: ${config.message || '?'}`;
    default:
      return action.type || 'Unknown';
  }
}

export function ActionNode({ data }: NodeProps<ActionNodeData>) {
  const label = ACTION_LABELS[data.action?.type] || data.action?.type || 'Action';
  const summary = summarizeAction(data.action);

  return (
    <Paper
      shadow="sm"
      p="md"
      radius="md"
      style={{
        background: 'linear-gradient(135deg, #1971c2 0%, #339af0 100%)',
        border: '2px solid #1864ab',
        minWidth: 200,
        cursor: data.onEdit ? 'pointer' : 'default',
        color: '#fff',
      }}
      onClick={data.onEdit}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#1864ab',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />

      <Stack gap={6} align="center">
        <IconPlayerPlay size={20} color="#fff" />
        <Text fw={700} size="sm" c="white">
          Action
        </Text>
        <Badge color="white" variant="light" size="sm">
          {label}
        </Badge>
        <Text size="xs" c="white" ta="center" style={{ maxWidth: 200, wordBreak: 'break-word' }}>
          {summary}
        </Text>
      </Stack>

      <Handle
        type="source"
        position={Position.Bottom}
        style={{
          background: '#1864ab',
          width: 10,
          height: 10,
          border: '2px solid #fff',
        }}
      />
    </Paper>
  );
}
