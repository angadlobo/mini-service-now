import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Modal, Stack, Group, Button, Select, TextInput, Textarea, Text, NumberInput,
  Switch, TagsInput, JsonInput,
} from '@mantine/core';
import { integrationsApi } from '../../api/common.api';
import { ProviderConfigForm } from '../../components/integrations/ProviderConfigForm';

export interface Action {
  type: string;
  config: Record<string, unknown>;
}

interface ActionEditorProps {
  opened: boolean;
  onClose: () => void;
  action: Action;
  onChange: (action: Action) => void;
  tableColumns: { name: string; label: string }[];
}

const ACTION_TYPE_OPTIONS = [
  { group: 'Basic', items: [
    { value: 'set_field', label: 'Set Field' },
    { value: 'change_state', label: 'Change State' },
    { value: 'assign_to', label: 'Assign To User' },
    { value: 'assign_to_group', label: 'Assign To Group' },
    { value: 'update_record', label: 'Update Record' },
  ]},
  { group: 'Communication', items: [
    { value: 'send_notification', label: 'Send Notification' },
    { value: 'send_email', label: 'Send Email' },
    { value: 'send_slack', label: 'Send Slack Message' },
    { value: 'create_journal_entry', label: 'Create Journal Entry' },
  ]},
  { group: 'Automation', items: [
    { value: 'create_approval', label: 'Create Approval' },
    { value: 'create_task', label: 'Create Task' },
    { value: 'http_request', label: 'HTTP Request' },
    { value: 'escalate', label: 'Escalate' },
    { value: 'run_script', label: 'Run Script' },
  ]},
  { group: 'Flow Control', items: [
    { value: 'launch_form', label: 'Launch Form Task' },
    { value: 'delay', label: 'Delay / Timer' },
    { value: 'call_workflow', label: 'Call Sub-Workflow' },
    { value: 'log_message', label: 'Log Message' },
  ]},
];

const JOURNAL_TYPE_OPTIONS = [
  { value: 'comment', label: 'Comment' },
  { value: 'work_note', label: 'Work Note' },
];

function ActionConfigFields({
  type,
  config,
  onConfigChange,
  tableColumns,
}: {
  type: string;
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  tableColumns: { name: string; label: string }[];
}) {
  const columnOptions = tableColumns.map((col) => ({
    value: col.name,
    label: col.label,
  }));

  const updateField = (key: string, value: unknown) => {
    onConfigChange({ ...config, [key]: value });
  };

  switch (type) {
    case 'set_field':
      return (
        <>
          <Select label="Field" placeholder="Select field to set" data={columnOptions}
            value={(config.field as string) || ''} onChange={(v) => updateField('field', v || '')} searchable />
          <TextInput label="Value" placeholder="New value"
            value={(config.value as string) || ''} onChange={(e) => updateField('value', e.currentTarget.value)} />
        </>
      );

    case 'change_state':
      return (
        <TextInput label="State" placeholder="Target state value"
          value={(config.state as string) || ''} onChange={(e) => updateField('state', e.currentTarget.value)} />
      );

    case 'assign_to':
      return (
        <TextInput label="User ID" placeholder="User ID to assign to"
          value={(config.user_id as string) || ''} onChange={(e) => updateField('user_id', e.currentTarget.value)} />
      );

    case 'assign_to_group':
      return (
        <TextInput label="Group ID" placeholder="Group ID to assign to"
          value={(config.group_id as string) || ''} onChange={(e) => updateField('group_id', e.currentTarget.value)} />
      );

    case 'send_notification':
      return (
        <>
          <TextInput label="Title" placeholder="Notification title"
            value={(config.title as string) || ''} onChange={(e) => updateField('title', e.currentTarget.value)} />
          <Textarea label="Body" placeholder="Notification body" minRows={3}
            value={(config.body as string) || ''} onChange={(e) => updateField('body', e.currentTarget.value)} />
        </>
      );

    case 'create_journal_entry':
      return (
        <>
          <Select label="Journal Type" data={JOURNAL_TYPE_OPTIONS}
            value={(config.journal_type as string) || 'comment'} onChange={(v) => updateField('journal_type', v || 'comment')} />
          <Textarea label="Body" placeholder="Journal entry content" minRows={3}
            value={(config.body as string) || ''} onChange={(e) => updateField('body', e.currentTarget.value)} />
        </>
      );

    case 'launch_form':
      return (
        <>
          <TextInput label="Form Template ID" placeholder="UUID of the form template"
            value={(config.form_template_id as string) || ''} onChange={(e) => updateField('form_template_id', e.currentTarget.value)} />
          <Select label="Assign To Field" description="Record field that determines who fills the form" data={columnOptions}
            value={(config.assign_to_field as string) || ''} onChange={(v) => updateField('assign_to_field', v || '')} searchable />
        </>
      );

    case 'delay':
      return (
        <TextInput label="Duration (minutes)" placeholder="Number of minutes to delay"
          value={String((config.duration_minutes as number) || '')}
          onChange={(e) => updateField('duration_minutes', Number(e.currentTarget.value) || 0)} />
      );

    case 'call_workflow':
      return (
        <TextInput label="Target Workflow ID" placeholder="UUID of the workflow to call"
          value={(config.target_workflow_id as string) || ''} onChange={(e) => updateField('target_workflow_id', e.currentTarget.value)} />
      );

    // ── New action types ──────────────────────────────────

    case 'create_approval':
      return (
        <>
          <TagsInput label="Approver User IDs" placeholder="Enter user ID and press Enter"
            value={(config.approver_ids as string[]) || []}
            onChange={(v) => updateField('approver_ids', v)} />
          <Select label="Approval Type"
            data={[{ value: 'all', label: 'All must approve' }, { value: 'any', label: 'Any one can approve' }]}
            value={(config.approval_type as string) || 'all'}
            onChange={(v) => updateField('approval_type', v || 'all')} />
          <Switch label="Wait for completion" checked={!!config.wait_for_completion}
            onChange={(e) => updateField('wait_for_completion', e.currentTarget.checked)} />
        </>
      );

    case 'create_task':
      return (
        <>
          <TextInput label="Table Name" placeholder="Table to create task in (leave empty for same table)"
            value={(config.table_name as string) || ''} onChange={(e) => updateField('table_name', e.currentTarget.value)} />
          <JsonInput label="Fields (JSON)" placeholder='{"short_description": "{{record.number}} follow-up"}'
            value={typeof config.fields === 'string' ? config.fields : JSON.stringify(config.fields || {}, null, 2)}
            onChange={(v) => { try { updateField('fields', JSON.parse(v)); } catch { updateField('fields', v); }}}
            minRows={4} formatOnBlur />
        </>
      );

    case 'http_request':
      return (
        <>
          <Group grow>
            <Select label="Method"
              data={['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m }))}
              value={(config.method as string) || 'GET'}
              onChange={(v) => updateField('method', v || 'GET')} />
            <TextInput label="URL" placeholder="https://api.example.com/endpoint"
              value={(config.url as string) || ''} onChange={(e) => updateField('url', e.currentTarget.value)} style={{ flex: 2 }} />
          </Group>
          <Textarea label="Body" placeholder="Request body (supports {{record.field}} templates)" minRows={3}
            value={(config.body as string) || ''} onChange={(e) => updateField('body', e.currentTarget.value)} />
          <TextInput label="Store Response In" placeholder="Variable name for response"
            value={(config.store_response_in as string) || 'http_response'}
            onChange={(e) => updateField('store_response_in', e.currentTarget.value)} />
        </>
      );

    case 'send_email':
      return (
        <>
          <TextInput label="To" placeholder="Email address or {{record.field}}"
            value={(config.to as string) || ''} onChange={(e) => updateField('to', e.currentTarget.value)} />
          <TextInput label="Subject" placeholder="Email subject (supports templates)"
            value={(config.subject as string) || ''} onChange={(e) => updateField('subject', e.currentTarget.value)} />
          <Textarea label="Body Template" placeholder="Email body (supports {{record.field}} templates)" minRows={4}
            value={(config.body_template as string) || ''} onChange={(e) => updateField('body_template', e.currentTarget.value)} />
        </>
      );

    case 'send_slack':
      return (
        <Textarea label="Message Template" placeholder="Slack message (supports {{record.field}} templates)" minRows={3}
          value={(config.message_template as string) || ''}
          onChange={(e) => updateField('message_template', e.currentTarget.value)} />
      );

    case 'run_script':
      return (
        <Textarea label="Expression" placeholder="JavaScript expression to run" minRows={4}
          value={(config.expression as string) || ''}
          onChange={(e) => updateField('expression', e.currentTarget.value)}
          description="Has access to: record, context, variables" />
      );

    case 'escalate':
      return (
        <>
          <Select label="Escalation Type"
            data={[
              { value: 'manager', label: 'Escalate to Manager' },
              { value: 'group', label: 'Escalate to Group' },
              { value: 'user', label: 'Escalate to User' },
            ]}
            value={(config.escalation_type as string) || 'manager'}
            onChange={(v) => updateField('escalation_type', v || 'manager')} />
          {(config.escalation_type as string) !== 'manager' && (
            <TextInput label="Target ID" placeholder="User or Group ID"
              value={(config.target as string) || ''} onChange={(e) => updateField('target', e.currentTarget.value)} />
          )}
          <TextInput label="Reason" placeholder="Reason for escalation"
            value={(config.reason as string) || ''} onChange={(e) => updateField('reason', e.currentTarget.value)} />
        </>
      );

    case 'update_record':
      return (
        <>
          <TextInput label="Table Name" placeholder="Leave empty for same table"
            value={(config.table_name as string) || ''} onChange={(e) => updateField('table_name', e.currentTarget.value)} />
          <Select label="Record ID Field" description="Field on current record that holds the target record ID"
            data={columnOptions} value={(config.record_id_field as string) || ''}
            onChange={(v) => updateField('record_id_field', v || '')} searchable clearable />
          <JsonInput label="Updates (JSON)" placeholder='{"state": "resolved"}'
            value={typeof config.updates === 'string' ? config.updates : JSON.stringify(config.updates || {}, null, 2)}
            onChange={(v) => { try { updateField('updates', JSON.parse(v)); } catch { updateField('updates', v); }}}
            minRows={3} formatOnBlur />
        </>
      );

    case 'log_message':
      return (
        <>
          <Select label="Level"
            data={[{ value: 'info', label: 'Info' }, { value: 'warn', label: 'Warning' }, { value: 'error', label: 'Error' }]}
            value={(config.level as string) || 'info'}
            onChange={(v) => updateField('level', v || 'info')} />
          <TextInput label="Message" placeholder="Log message (supports {{record.field}} templates)"
            value={(config.message as string) || ''} onChange={(e) => updateField('message', e.currentTarget.value)} />
        </>
      );

    default:
      return (
        <Text size="sm" c="dimmed">
          Select an action type to configure it.
        </Text>
      );
  }
}

export function ActionEditor({
  opened,
  onClose,
  action,
  onChange,
  tableColumns,
}: ActionEditorProps) {
  const [draft, setDraft] = useState<Action>(
    () => structuredClone(action) || { type: '', config: {} },
  );

  const { data: providers } = useQuery({
    queryKey: ['integration-providers'],
    queryFn: () => integrationsApi.getProviders(),
    enabled: opened,
  });

  // Build combined action type options including provider actions
  const providerActionOptions = (providers || []).flatMap((p: any) =>
    (p.workflowActions || []).map((a: any) => ({
      value: a.type,
      label: a.label,
    })),
  );

  const allOptions = [
    ...ACTION_TYPE_OPTIONS,
    ...(providerActionOptions.length > 0
      ? [{ group: 'Integrations', items: providerActionOptions }]
      : []),
  ];

  // Find if current action type is a provider action
  const providerAction = (providers || []).flatMap((p: any) =>
    (p.workflowActions || []).map((a: any) => ({ ...a, providerName: p.name })),
  ).find((a: any) => a.type === draft.type);

  const handleTypeChange = (newType: string | null) => {
    setDraft({ type: newType || '', config: {} });
  };

  const handleConfigChange = (config: Record<string, unknown>) => {
    setDraft((prev) => ({ ...prev, config }));
  };

  const handleApply = () => {
    onChange(draft);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title="Edit Action"
      size="lg"
    >
      <Stack>
        <Select
          label="Action Type"
          placeholder="Select action type"
          data={allOptions}
          value={draft.type}
          onChange={handleTypeChange}
          searchable
        />

        {providerAction ? (
          <ProviderConfigForm
            fields={providerAction.configFields}
            values={draft.config}
            onChange={handleConfigChange}
          />
        ) : (
          <ActionConfigFields
            type={draft.type}
            config={draft.config}
            onConfigChange={handleConfigChange}
            tableColumns={tableColumns}
          />
        )}

        <Group justify="flex-end" mt="md">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!draft.type}>
            Apply
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
