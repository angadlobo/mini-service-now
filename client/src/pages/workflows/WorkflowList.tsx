import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Table, Button, Modal, TextInput, Select, Textarea,
  Switch, Badge, Tabs, Group, Stack, Paper, NumberInput, Text, FileButton,
  ActionIcon, Box, Card, SimpleGrid, ThemeIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconDownload, IconUpload, IconX, IconArrowUp, IconArrowDown,
  IconBrush, IconPlayerPlay, IconAlertTriangle, IconExchange, IconBug, IconChecklist,
  IconBell, IconUserPlus, IconShieldCheck, IconClock, IconServer,
} from '@tabler/icons-react';
import { workflowsApi } from '../../api/common.api';
import { useAuthStore } from '../../store/auth';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { WorkflowRule } from '@shared/interfaces';

const FIELD_OPTIONS = [
  { value: 'state', label: 'State' },
  { value: 'priority', label: 'Priority' },
  { value: 'assigned_to', label: 'Assigned To' },
  { value: 'assignment_group', label: 'Assignment Group' },
  { value: 'category', label: 'Category' },
  { value: 'urgency', label: 'Urgency' },
  { value: 'impact', label: 'Impact' },
  { value: 'type', label: 'Type' },
  { value: 'risk', label: 'Risk' },
  { value: 'short_description', label: 'Short Description' },
  { value: 'description', label: 'Description' },
];

const OPERATOR_OPTIONS = [
  { value: '==', label: 'equals (==)' },
  { value: '!=', label: 'not equals (!=)' },
  { value: '>', label: 'greater than (>)' },
  { value: '<', label: 'less than (<)' },
  { value: '>=', label: 'greater or equal (>=)' },
  { value: '<=', label: 'less or equal (<=)' },
  { value: 'contains', label: 'contains' },
  { value: 'starts_with', label: 'starts with' },
  { value: 'in', label: 'in' },
  { value: 'not_in', label: 'not in' },
  { value: 'is_empty', label: 'is empty' },
  { value: 'is_not_empty', label: 'is not empty' },
];

const ACTION_TYPE_OPTIONS = [
  { value: 'set_field', label: 'Set Field' },
  { value: 'send_notification', label: 'Send Notification' },
  { value: 'add_comment', label: 'Add Comment' },
  { value: 'create_approval', label: 'Create Approval' },
  { value: 'launch_form', label: 'Launch Form' },
  { value: 'delay', label: 'Delay' },
  { value: 'call_workflow', label: 'Call Workflow' },
];

const ACTION_COLORS: Record<string, string> = {
  set_field: '#40c057',
  send_notification: '#339af0',
  add_comment: '#fab005',
  create_approval: '#fa5252',
  launch_form: '#be4bdb',
  delay: '#fd7e14',
  call_workflow: '#20c997',
};

interface Condition {
  field: string;
  operator: string;
  value: string;
}

interface ActionItem {
  type: string;
  config: Record<string, any>;
}

function ConditionBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let parsed: { all?: Condition[]; any?: Condition[] };
  try {
    parsed = JSON.parse(value);
    if (!parsed || (typeof parsed !== 'object') || (!parsed.all && !parsed.any)) {
      parsed = { all: [] };
    }
  } catch {
    parsed = { all: [] };
  }

  const matchType = parsed.any ? 'any' : 'all';
  const conditions: Condition[] = (parsed[matchType] || []) as Condition[];

  const emit = (type: string, conds: Condition[]) => {
    onChange(JSON.stringify({ [type]: conds }, null, 2));
  };

  const updateCondition = (index: number, field: keyof Condition, val: string) => {
    const updated = conditions.map((c, i) => (i === index ? { ...c, [field]: val } : c));
    emit(matchType, updated);
  };

  const removeCondition = (index: number) => {
    emit(matchType, conditions.filter((_, i) => i !== index));
  };

  const addCondition = () => {
    emit(matchType, [...conditions, { field: 'state', operator: '==', value: '' }]);
  };

  const changeMatchType = (type: string) => {
    emit(type, conditions);
  };

  return (
    <Box>
      <Text fw={500} size="sm" mb={4}>Conditions</Text>
      <Select
        size="xs"
        label="Match"
        data={[
          { value: 'all', label: 'All conditions (AND)' },
          { value: 'any', label: 'Any condition (OR)' },
        ]}
        value={matchType}
        onChange={(v) => changeMatchType(v || 'all')}
        mb="xs"
        w={220}
      />
      <Stack gap="xs">
        {conditions.map((cond, i) => (
          <Group
            key={i}
            gap="xs"
            wrap="nowrap"
            style={{
              background: 'rgba(102, 126, 234, 0.04)',
              borderRadius: 'var(--mantine-radius-md)',
              padding: '8px 10px',
            }}
          >
            <Select
              size="xs"
              placeholder="Field"
              data={FIELD_OPTIONS}
              value={cond.field}
              onChange={(v) => updateCondition(i, 'field', v || '')}
              style={{ flex: 1 }}
              searchable
            />
            <Select
              size="xs"
              placeholder="Operator"
              data={OPERATOR_OPTIONS}
              value={cond.operator}
              onChange={(v) => updateCondition(i, 'operator', v || '')}
              style={{ flex: 1 }}
            />
            {cond.operator !== 'is_empty' && cond.operator !== 'is_not_empty' && (
              <TextInput
                size="xs"
                placeholder="Value"
                value={cond.value}
                onChange={(e) => updateCondition(i, 'value', e.currentTarget.value)}
                style={{ flex: 1 }}
              />
            )}
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeCondition(i)}>
              <IconX size={14} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
      <Button
        size="xs"
        variant="light"
        color="violet"
        leftSection={<IconPlus size={14} />}
        mt="xs"
        onClick={addCondition}
      >
        Add Condition
      </Button>
    </Box>
  );
}

function ActionBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  let actions: ActionItem[];
  try {
    const parsed = JSON.parse(value);
    actions = Array.isArray(parsed) ? parsed : [];
  } catch {
    actions = [];
  }

  const emit = (items: ActionItem[]) => {
    onChange(JSON.stringify(items, null, 2));
  };

  const updateAction = (index: number, updates: Partial<ActionItem>) => {
    const updated = actions.map((a, i) => (i === index ? { ...a, ...updates } : a));
    emit(updated);
  };

  const updateConfig = (index: number, key: string, val: any) => {
    const updated = actions.map((a, i) =>
      i === index ? { ...a, config: { ...a.config, [key]: val } } : a,
    );
    emit(updated);
  };

  const changeType = (index: number, type: string) => {
    const defaultConfigs: Record<string, Record<string, any>> = {
      set_field: { field: 'state', value: '' },
      send_notification: { to_field: 'assigned_to', template: '' },
      add_comment: { body: '' },
      create_approval: { approvers_field: '' },
      launch_form: { form_template_id: '', assign_to_field: '' },
      delay: { duration_minutes: 60 },
      call_workflow: { target_workflow_id: '' },
    };
    updateAction(index, { type, config: defaultConfigs[type] || {} });
  };

  const removeAction = (index: number) => {
    emit(actions.filter((_, i) => i !== index));
  };

  const moveAction = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= actions.length) return;
    const copy = [...actions];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    emit(copy);
  };

  const addAction = () => {
    emit([...actions, { type: 'set_field', config: { field: 'state', value: '' } }]);
  };

  const renderConfig = (action: ActionItem, index: number) => {
    switch (action.type) {
      case 'set_field':
        return (
          <Group gap="xs" grow>
            <Select size="xs" label="Field" data={FIELD_OPTIONS} searchable
              value={action.config.field || ''} onChange={(v) => updateConfig(index, 'field', v || '')} />
            <TextInput size="xs" label="Value"
              value={action.config.value || ''} onChange={(e) => updateConfig(index, 'value', e.currentTarget.value)} />
          </Group>
        );
      case 'send_notification':
        return (
          <Group gap="xs" grow>
            <Select size="xs" label="To Field" data={FIELD_OPTIONS} searchable
              value={action.config.to_field || ''} onChange={(v) => updateConfig(index, 'to_field', v || '')} />
            <TextInput size="xs" label="Template"
              value={action.config.template || ''} onChange={(e) => updateConfig(index, 'template', e.currentTarget.value)} />
          </Group>
        );
      case 'add_comment':
        return (
          <Textarea size="xs" label="Comment Body" minRows={2}
            value={action.config.body || ''} onChange={(e) => updateConfig(index, 'body', e.currentTarget.value)} />
        );
      case 'create_approval':
        return (
          <TextInput size="xs" label="Approvers Field"
            value={action.config.approvers_field || ''} onChange={(e) => updateConfig(index, 'approvers_field', e.currentTarget.value)} />
        );
      case 'launch_form':
        return (
          <Group gap="xs" grow>
            <TextInput size="xs" label="Form Template ID"
              value={action.config.form_template_id || ''} onChange={(e) => updateConfig(index, 'form_template_id', e.currentTarget.value)} />
            <TextInput size="xs" label="Assign To Field"
              value={action.config.assign_to_field || ''} onChange={(e) => updateConfig(index, 'assign_to_field', e.currentTarget.value)} />
          </Group>
        );
      case 'delay':
        return (
          <NumberInput size="xs" label="Duration (minutes)" min={1}
            value={action.config.duration_minutes || 60} onChange={(v) => updateConfig(index, 'duration_minutes', Number(v) || 60)} />
        );
      case 'call_workflow':
        return (
          <TextInput size="xs" label="Target Workflow ID"
            value={action.config.target_workflow_id || ''} onChange={(e) => updateConfig(index, 'target_workflow_id', e.currentTarget.value)} />
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      <Text fw={500} size="sm" mb={4}>Actions</Text>
      <Stack gap="xs">
        {actions.map((action, i) => (
          <Paper
            key={i}
            radius="md"
            p="sm"
            withBorder
            style={{
              borderLeftWidth: 4,
              borderLeftColor: ACTION_COLORS[action.type] || '#868e96',
            }}
          >
            <Group justify="space-between" mb="xs">
              <Select
                size="xs"
                data={ACTION_TYPE_OPTIONS}
                value={action.type}
                onChange={(v) => changeType(i, v || 'set_field')}
                w={200}
              />
              <Group gap={4}>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => moveAction(i, -1)} disabled={i === 0}>
                  <IconArrowUp size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => moveAction(i, 1)} disabled={i === actions.length - 1}>
                  <IconArrowDown size={14} />
                </ActionIcon>
                <ActionIcon variant="subtle" color="red" size="sm" onClick={() => removeAction(i)}>
                  <IconX size={14} />
                </ActionIcon>
              </Group>
            </Group>
            {renderConfig(action, i)}
          </Paper>
        ))}
      </Stack>
      <Button
        size="xs"
        variant="light"
        color="violet"
        leftSection={<IconPlus size={14} />}
        mt="xs"
        onClick={addAction}
      >
        Add Action
      </Button>
    </Box>
  );
}

const TABLE_OPTIONS = [
  { value: 'incidents', label: 'Incidents' },
  { value: 'changes', label: 'Changes' },
  { value: 'problems', label: 'Problems' },
  { value: 'cis', label: 'Configuration Items' },
  { value: 'sc_requests', label: 'Catalog Requests' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'kb_articles', label: 'Knowledge Articles' },
  { value: 'form_submissions', label: 'Form Submissions' },
  { value: 'sla_instances', label: 'SLA Instances' },
];

const TRIGGER_OPTIONS = [
  { value: 'record.created', label: 'Record Created' },
  { value: 'record.updated', label: 'Record Updated' },
  { value: 'record.state_changed', label: 'State Changed' },
  { value: 'approval.decided', label: 'Approval Decided' },
  { value: 'sla.breached', label: 'SLA Breached' },
  { value: 'webhook.received', label: 'Webhook Received' },
  { value: 'scheduled', label: 'Scheduled' },
];

const WORKFLOW_TEMPLATES: {
  name: string; table: string; trigger: string; color: string;
  icon: typeof IconAlertTriangle; description: string;
  conditions: any; actions: any[];
}[] = [
  {
    name: 'Auto-Assign P1 Incidents',
    table: 'incidents', trigger: 'record.created', color: 'red',
    icon: IconAlertTriangle,
    description: 'Automatically assign critical (P1) incidents to the on-call team and send an urgent notification.',
    conditions: { logic: 'AND', conditions: [{ field: 'priority', operator: 'equals', value: '1' }] },
    actions: [
      { type: 'assign_to_group', config: { group_id: 'on-call-team' } },
      { type: 'send_notification', config: { title: 'P1 Incident Created', body: 'A critical incident requires immediate attention.' } },
    ],
  },
  {
    name: 'Incident Escalation on SLA Breach',
    table: 'incidents', trigger: 'sla.breached', color: 'orange',
    icon: IconClock,
    description: 'Escalate incidents to management when SLA is breached.',
    conditions: { logic: 'AND', conditions: [] },
    actions: [
      { type: 'escalate', config: { escalation_type: 'manager', reason: 'SLA breached - requires attention' } },
      { type: 'send_notification', config: { title: 'SLA Breach Alert', body: 'Incident SLA has been breached and escalated.' } },
    ],
  },
  {
    name: 'Incident State Notification',
    table: 'incidents', trigger: 'record.state_changed', color: 'blue',
    icon: IconBell,
    description: 'Notify the assigned user whenever the incident state changes.',
    conditions: { logic: 'AND', conditions: [] },
    actions: [
      { type: 'send_notification', config: { title: 'Incident State Changed', body: 'The state of your assigned incident has been updated.' } },
      { type: 'create_journal_entry', config: { journal_type: 'comment', body: 'State changed automatically.' } },
    ],
  },
  {
    name: 'Change Approval Required',
    table: 'changes', trigger: 'record.state_changed', color: 'violet',
    icon: IconChecklist,
    description: 'Create an approval request when a change moves to "authorize" state.',
    conditions: { logic: 'AND', conditions: [{ field: 'state', operator: 'equals', value: 'authorize' }] },
    actions: [
      { type: 'create_approval', config: { approver_ids: [], approval_type: 'all', wait_for_completion: true } },
      { type: 'send_notification', config: { title: 'Change Approval Needed', body: 'A change request requires your approval.' } },
    ],
  },
  {
    name: 'Emergency Change Fast-Track',
    table: 'changes', trigger: 'record.created', color: 'red',
    icon: IconExchange,
    description: 'Auto-approve and notify when an emergency change is created.',
    conditions: { logic: 'AND', conditions: [{ field: 'type', operator: 'equals', value: 'emergency' }] },
    actions: [
      { type: 'change_state', config: { state: 'implement' } },
      { type: 'send_notification', config: { title: 'Emergency Change Approved', body: 'Emergency change has been fast-tracked for implementation.' } },
    ],
  },
  {
    name: 'CAB Review for High-Risk Changes',
    table: 'changes', trigger: 'record.updated', color: 'grape',
    icon: IconShieldCheck,
    description: 'Flag high-risk changes for CAB review and notify the CAB chair.',
    conditions: { logic: 'AND', conditions: [{ field: 'risk', operator: 'equals', value: 'high' }] },
    actions: [
      { type: 'create_approval', config: { approver_ids: [], approval_type: 'all', wait_for_completion: true } },
      { type: 'send_notification', config: { title: 'CAB Review Required', body: 'A high-risk change needs CAB review before proceeding.' } },
      { type: 'create_journal_entry', config: { journal_type: 'work_note', body: 'Flagged for CAB review due to high risk.' } },
    ],
  },
  {
    name: 'Problem Auto-Assign',
    table: 'problems', trigger: 'record.created', color: 'teal',
    icon: IconBug,
    description: 'Automatically assign new problems to the problem management group.',
    conditions: { logic: 'AND', conditions: [] },
    actions: [
      { type: 'assign_to_group', config: { group_id: 'problem-management' } },
      { type: 'send_notification', config: { title: 'New Problem Created', body: 'A new problem record has been assigned to your group.' } },
    ],
  },
  {
    name: 'CMDB Change Detection',
    table: 'cis', trigger: 'record.updated', color: 'cyan',
    icon: IconServer,
    description: 'Log and notify when a configuration item is modified.',
    conditions: { logic: 'AND', conditions: [] },
    actions: [
      { type: 'create_journal_entry', config: { journal_type: 'work_note', body: 'Configuration item updated.' } },
      { type: 'send_notification', config: { title: 'CI Modified', body: 'A configuration item has been updated.' } },
    ],
  },
  {
    name: 'New User Onboarding',
    table: 'sc_requests', trigger: 'record.created', color: 'indigo',
    icon: IconUserPlus,
    description: 'Trigger onboarding tasks when a new user access request is submitted.',
    conditions: { logic: 'AND', conditions: [] },
    actions: [
      { type: 'create_task', config: { table_name: 'sc_requests', short_description: 'Provision user access' } },
      { type: 'send_notification', config: { title: 'Onboarding Request', body: 'A new catalog request has been submitted.' } },
    ],
  },
];

const emptyForm = {
  name: '',
  table_name: '',
  trigger_event: '',
  conditions: '{}',
  actions: '[]',
  active: true,
  execution_order: 100,
};

export function WorkflowList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin');

  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState<string | null>('rules');
  const resetFileRef = useRef<() => void>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['workflows', page],
    queryFn: () => workflowsApi.list({ page, pageSize: 20 }),
  });

  const { data: execData } = useQuery({
    queryKey: ['workflow-executions'],
    queryFn: () => workflowsApi.getExecutions({ page: 1, pageSize: 50 }),
    enabled: activeTab === 'executions',
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<WorkflowRule>) =>
      editId ? workflowsApi.update(editId, payload) : workflowsApi.create(payload),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editId ? 'Workflow updated' : 'Workflow created', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      closeModal();
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => workflowsApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Workflow rule removed', color: 'orange' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const importMutation = useMutation({
    mutationFn: (pkg: any) => workflowsApi.importWorkflow(pkg),
    onSuccess: (result: any) => {
      notifications.show({ title: 'Imported', message: `Workflow "${result.name}" imported successfully`, color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Import Failed', message: err.response?.data?.error || 'Import failed', color: 'red' }),
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = async (rule: WorkflowRule) => {
    const full = await workflowsApi.get(rule.id);
    setForm({
      name: full.name,
      table_name: full.table_name,
      trigger_event: full.trigger_event,
      conditions: JSON.stringify(full.conditions, null, 2),
      actions: JSON.stringify(full.actions, null, 2),
      active: full.active,
      execution_order: full.execution_order,
    });
    setEditId(rule.id);
    setModalOpen(true);
  };

  const handleSave = () => {
    try {
      const payload: Partial<WorkflowRule> = {
        name: form.name,
        table_name: form.table_name,
        trigger_event: form.trigger_event,
        conditions: JSON.parse(form.conditions),
        actions: JSON.parse(form.actions),
        active: form.active,
        execution_order: form.execution_order,
      };
      saveMutation.mutate(payload);
    } catch {
      notifications.show({ title: 'Validation Error', message: 'Conditions and Actions must be valid JSON', color: 'red' });
    }
  };

  const handleExport = async (workflowId: string) => {
    try {
      const pkg = await workflowsApi.exportWorkflow(workflowId);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${pkg.metadata?.name || workflowId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notifications.show({ title: 'Exported', message: 'Workflow exported successfully', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Export Failed', message: err.response?.data?.error || 'Export failed', color: 'red' });
    }
  };

  const handleImportFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const pkg = JSON.parse(e.target?.result as string);
        importMutation.mutate(pkg);
      } catch {
        notifications.show({ title: 'Invalid File', message: 'Could not parse JSON file', color: 'red' });
      }
    };
    reader.readAsText(file);
    resetFileRef.current?.();
  };

  const rows = (data?.data || []).map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.name}</Table.Td>
      <Table.Td>{r.table_name}</Table.Td>
      <Table.Td>{r.trigger_event}</Table.Td>
      <Table.Td><Badge color={r.active ? 'green' : 'gray'}>{r.active ? 'Active' : 'Inactive'}</Badge></Table.Td>
      <Table.Td>{r.execution_order}</Table.Td>
      <Table.Td>
          <Group gap="xs">
            <Button size="xs" variant="light" color="violet" leftSection={<IconBrush size={14} />} onClick={() => navigate(`/admin/workflows/${r.id}/edit`)}>Design</Button>
            <Button size="xs" variant="light" leftSection={<IconEdit size={14} />} onClick={() => openEdit(r)}>Edit</Button>
            <Button size="xs" variant="light" color="teal" leftSection={<IconDownload size={14} />}
              onClick={() => handleExport(r.id)}>
              Export
            </Button>
            <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />}
              onClick={() => { if (confirm('Delete this workflow rule?')) deleteMutation.mutate(r.id); }}>
              Delete
            </Button>
          </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const execRows = (execData?.data || []).map((e) => (
    <Table.Tr key={e.id}>
      <Table.Td>{e.rule_name || e.rule_id}</Table.Td>
      <Table.Td>{e.table_name}</Table.Td>
      <Table.Td>{e.record_id}</Table.Td>
      <Table.Td>
        <Badge color={
          e.status === 'success' ? 'green' :
          e.status === 'delayed' ? 'orange' :
          e.status === 'waiting_for_form' ? 'grape' :
          e.status === 'running' ? 'blue' : 'red'
        }>
          {e.status}
        </Badge>
      </Table.Td>
      <Table.Td>{e.error || '-'}</Table.Td>
      <Table.Td>{dayjs(e.created_at).format('MMM D, HH:mm')}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2} className="page-title">Workflow Rules</Title>
          <Group gap="sm">
            <FileButton resetRef={resetFileRef} onChange={handleImportFile} accept="application/json">
              {(props) => (
                <Button variant="light" leftSection={<IconUpload size={16} />} loading={importMutation.isPending} {...props}>
                  Import
                </Button>
              )}
            </FileButton>
            <Button variant="light" leftSection={<IconPlus size={16} />} onClick={openCreate}>Quick Rule</Button>
            <Button className="gradient-btn" leftSection={<IconBrush size={16} />} onClick={() => navigate('/admin/workflows/new')}>Visual Designer</Button>
          </Group>
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="rules">Rules</Tabs.Tab>
            <Tabs.Tab value="templates">Starter Templates</Tabs.Tab>
            <Tabs.Tab value="executions">Execution Log</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="rules" pt="md">
            <Paper withBorder>
              <Table className="glass-table" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Table</Table.Th>
                    <Table.Th>Trigger Event</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Order</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {isLoading ? (
                    <Table.Tr><Table.Td colSpan={6}><Text ta="center" py="md">Loading...</Text></Table.Td></Table.Tr>
                  ) : rows.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={6}><Text ta="center" py="md">No workflow rules found</Text></Table.Td></Table.Tr>
                  ) : rows}
                </Table.Tbody>
              </Table>
            </Paper>
            {data && data.totalPages > 1 && (
              <Group justify="center" mt="md">
                <Button size="xs" variant="light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                <Text size="sm">Page {data.page} of {data.totalPages}</Text>
                <Button size="xs" variant="light" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </Group>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="templates" pt="md">
            <Text size="sm" c="dimmed" mb="md">
              One-click import pre-built workflow automations. These create active rules you can customize in the Visual Designer.
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {WORKFLOW_TEMPLATES.map((tpl, i) => (
                <Card key={i} shadow="sm" padding="lg" radius="md" withBorder
                  style={{ borderLeft: `4px solid ${tpl.color}` }}>
                  <Group gap="sm" mb="xs">
                    <ThemeIcon size="lg" radius="md" color={tpl.color} variant="light">
                      <tpl.icon size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm">{tpl.name}</Text>
                      <Badge size="xs" variant="light" color="gray">{tpl.table}</Badge>
                    </div>
                  </Group>
                  <Text size="xs" c="dimmed" mb="sm">{tpl.description}</Text>
                  <Group gap="xs" mb="sm">
                    <Badge size="xs" variant="outline">{tpl.trigger}</Badge>
                    <Badge size="xs" variant="outline" color="blue">{tpl.actions.length} action{tpl.actions.length > 1 ? 's' : ''}</Badge>
                  </Group>
                  <Button size="xs" variant="light" fullWidth
                    leftSection={<IconPlus size={14} />}
                    onClick={() => {
                      saveMutation.mutate({
                        name: tpl.name,
                        table_name: tpl.table,
                        trigger_event: tpl.trigger,
                        conditions: tpl.conditions,
                        actions: tpl.actions,
                        active: true,
                        execution_order: 100,
                      });
                    }}
                    loading={saveMutation.isPending}
                  >
                    Import & Activate
                  </Button>
                </Card>
              ))}
            </SimpleGrid>
          </Tabs.Panel>

          <Tabs.Panel value="executions" pt="md">
            <Paper withBorder>
              <Table className="glass-table" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Rule</Table.Th>
                    <Table.Th>Table</Table.Th>
                    <Table.Th>Record</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Error</Table.Th>
                    <Table.Th>Executed</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {execRows.length === 0 ? (
                    <Table.Tr><Table.Td colSpan={6}><Text ta="center" py="md">No executions found</Text></Table.Td></Table.Tr>
                  ) : execRows}
                </Table.Tbody>
              </Table>
            </Paper>
          </Tabs.Panel>
        </Tabs>

        <Modal opened={modalOpen} onClose={closeModal} title={editId ? 'Edit Workflow Rule' : 'New Workflow Rule'} size="xl">
          <Stack>
            <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
            <Select label="Table" required data={TABLE_OPTIONS} value={form.table_name} onChange={(v) => setForm({ ...form, table_name: v || '' })} />
            <Select label="Trigger Event" required data={TRIGGER_OPTIONS} value={form.trigger_event} onChange={(v) => setForm({ ...form, trigger_event: v || '' })} />
            <ConditionBuilder value={form.conditions} onChange={(v) => setForm({ ...form, conditions: v })} />
            <ActionBuilder value={form.actions} onChange={(v) => setForm({ ...form, actions: v })} />
            <NumberInput label="Execution Order" value={form.execution_order} onChange={(v) => setForm({ ...form, execution_order: Number(v) || 100 })} />
            <Switch label="Active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.currentTarget.checked })} />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button className="gradient-btn" onClick={handleSave} loading={saveMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
