import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Table, Button, Modal, TextInput, Select, MultiSelect,
  Switch, Badge, Tabs, Group, Stack, Paper, Text, Code, Tooltip, ActionIcon,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconTestPipe, IconList, IconPlug, IconHelp } from '@tabler/icons-react';
import { integrationsApi } from '../../api/common.api';
import { useAuthStore } from '../../store/auth';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import type { Integration } from '@shared/interfaces';

const AUTH_TYPE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'bearer', label: 'Bearer Token' },
  { value: 'basic', label: 'Basic Auth' },
  { value: 'api_key', label: 'API Key' },
];

const EVENT_OPTIONS = [
  { value: 'incident.created', label: 'Incident Created' },
  { value: 'incident.updated', label: 'Incident Updated' },
  { value: 'incident.resolved', label: 'Incident Resolved' },
  { value: 'change.created', label: 'Change Created' },
  { value: 'change.updated', label: 'Change Updated' },
  { value: 'change.approved', label: 'Change Approved' },
  { value: 'problem.created', label: 'Problem Created' },
  { value: 'problem.updated', label: 'Problem Updated' },
  { value: 'ci.created', label: 'CI Created' },
  { value: 'ci.updated', label: 'CI Updated' },
];

const PROVIDER_HELP: Record<string, { description: string; setup: string; example: string }> = {
  slack: {
    description: 'Send ServiceNow events to Slack channels via webhooks. Get real-time notifications about incidents, changes, and problems.',
    setup: '1. Get a webhook URL from Slack (api.slack.com/apps)\n2. Create a new integration and paste the webhook URL\n3. Select which events to subscribe to\n4. Test the connection\n5. Messages will appear in your chosen Slack channel',
    example: '🔴 New Incident: Database Down - Urgency: High',
  },
  github: {
    description: 'Create and update GitHub issues automatically when incidents or changes occur. Track work across ServiceNow and GitHub.',
    setup: '1. Generate a GitHub token (settings/tokens)\n2. Add token and repository info\n3. Select incident/change events\n4. Issues will auto-create in your GitHub repo',
    example: 'GitHub Issue #42 created: Critical Database Connection Error',
  },
  gitlab: {
    description: 'Sync incidents and changes with GitLab issues. Keep your development and operations teams in sync.',
    setup: '1. Get GitLab token from account settings\n2. Add token, project ID, and namespace\n3. Select events to sync\n4. Test and activate',
    example: 'GitLab Issue created in project',
  },
  jira: {
    description: 'Create Jira tickets automatically when incidents occur. Link ServiceNow incidents to Jira tickets.',
    setup: '1. Create API token in Jira\n2. Add Jira instance URL and credentials\n3. Configure project and issue type\n4. Select incident events\n5. Tickets auto-create in Jira',
    example: 'Jira Ticket PROJ-123 created: Email server down',
  },
  pagerduty: {
    description: 'Trigger PagerDuty incidents for critical ServiceNow events. Escalate to on-call teams automatically.',
    setup: '1. Get PagerDuty API key\n2. Add key and service ID\n3. Map incident urgency to PagerDuty severity\n4. Select trigger events\n5. Incidents auto-escalate to on-call',
    example: 'PagerDuty incident triggered for critical database issue',
  },
  teams: {
    description: 'Send notifications to Microsoft Teams channels. Keep your team informed about incidents and changes.',
    setup: '1. Create Teams webhook connector\n2. Paste webhook URL\n3. Select events\n4. Test and save\n5. Messages appear in Teams channel',
    example: 'Teams notification: High priority incident assigned to you',
  },
  'azure-devops': {
    description: 'Create work items in Azure DevOps. Link ServiceNow incidents to Azure DevOps stories and bugs.',
    setup: '1. Get Azure DevOps token\n2. Add token and project URL\n3. Select work item type\n4. Choose trigger events\n5. Work items auto-create',
    example: 'Azure DevOps work item created: API Performance Degradation',
  },
  datadog: {
    description: 'Send events to Datadog. Correlate infrastructure alerts with ServiceNow incidents.',
    setup: '1. Get Datadog API key\n2. Add API key and region\n3. Choose events\n4. Events appear in Datadog timeline',
    example: 'Datadog event: New incident created for monitoring alert',
  },
  grafana: {
    description: 'Send annotations to Grafana. Mark incidents on your monitoring dashboards.',
    setup: '1. Get Grafana API token\n2. Add token and Grafana URL\n3. Select events\n4. Annotations appear on dashboards',
    example: 'Grafana annotation: Incident marked on dashboard at time of creation',
  },
};

const emptyForm = {
  name: '',
  type: 'webhook',
  url: '',
  auth_type: 'none',
  events: [] as string[],
  active: true,
};

export function IntegrationList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin');

  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [logsId, setLogsId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [helpProvider, setHelpProvider] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['integrations', page],
    queryFn: () => integrationsApi.list({ page, pageSize: 20 }),
  });

  const { data: logsData } = useQuery({
    queryKey: ['integration-logs', logsId],
    queryFn: () => integrationsApi.getLogs(logsId!, { page: 1, pageSize: 30 }),
    enabled: !!logsId,
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Integration>) =>
      editId ? integrationsApi.update(editId, payload) : integrationsApi.create(payload),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editId ? 'Integration updated' : 'Integration created', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      closeModal();
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Integration removed', color: 'orange' });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.test(id),
    onSuccess: (result: any) => {
      setTestResult(result);
      notifications.show({ title: 'Test Complete', message: result.message, color: result.success ? 'green' : 'red' });
      setTestingId(null);
    },
    onError: (err: any) => {
      const message = err.response?.data?.error || 'Test failed';
      setTestResult({ success: false, message });
      notifications.show({ title: 'Test Failed', message, color: 'red' });
      setTestingId(null);
    },
  });

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
    setTestResult(null);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setTestResult(null);
    setModalOpen(true);
  };

  const openEdit = async (item: Integration) => {
    const full = await integrationsApi.get(item.id);
    setForm({
      name: full.name,
      type: full.type || 'webhook',
      url: full.url,
      auth_type: full.auth_type,
      events: full.events || [],
      active: full.active,
    });
    setEditId(item.id);
    setTestResult(null);
    setModalOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      name: form.name,
      type: form.type,
      url: form.url,
      auth_type: form.auth_type,
      events: form.events,
      active: form.active,
    });
  };

  const rows = (data?.data || []).map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.name}</Table.Td>
      <Table.Td>
        <Group gap={4}>
          <Badge variant="light">{r.type === 'provider' ? r.provider : (r.type || 'webhook')}</Badge>
          {r.type === 'provider' && r.provider && PROVIDER_HELP[r.provider.toLowerCase()] && (
            <Tooltip label="Click for help">
              <ActionIcon
                size="xs"
                variant="subtle"
                onClick={() => setHelpProvider(r.provider.toLowerCase())}
              >
                <IconHelp size={14} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      </Table.Td>
      <Table.Td><Text size="sm" truncate maw={250}>{r.url}</Text></Table.Td>
      <Table.Td><Badge color={r.active ? 'green' : 'gray'}>{r.active ? 'Active' : 'Inactive'}</Badge></Table.Td>
      <Table.Td>{(r.events || []).length} events</Table.Td>
      <Table.Td>
        {isAdmin && (
          <Group gap="xs" wrap="nowrap">
            <Button size="xs" variant="light" leftSection={<IconEdit size={14} />} onClick={() => openEdit(r)}>Edit</Button>
            <Button size="xs" variant="light" color="teal" leftSection={<IconTestPipe size={14} />}
              onClick={() => { setTestingId(r.id); testMutation.mutate(r.id); }}
              loading={testingId === r.id && testMutation.isPending}
              disabled={testingId !== null && testingId !== r.id}>
              Test
            </Button>
            <Button size="xs" variant="light" color="violet" leftSection={<IconList size={14} />}
              onClick={() => setLogsId(r.id)}>
              Logs
            </Button>
            <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />}
              onClick={() => { if (confirm('Delete this integration?')) deleteMutation.mutate(r.id); }}>
              Delete
            </Button>
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const logRows = (logsData?.data || []).map((l) => (
    <Table.Tr key={l.id}>
      <Table.Td>{l.event}</Table.Td>
      <Table.Td><Badge color={l.status === 'success' ? 'green' : 'red'}>{l.status}</Badge></Table.Td>
      <Table.Td>{l.status_code}</Table.Td>
      <Table.Td><Text size="xs" truncate maw={200}>{l.response_body || '-'}</Text></Table.Td>
      <Table.Td>{dayjs(l.created_at).format('MMM D, HH:mm:ss')}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Integrations</Title>
          {isAdmin && (
            <Group gap="xs">
              <Button variant="light" leftSection={<IconPlug size={16} />} onClick={() => navigate('/admin/integrations/providers')}>
                Providers
              </Button>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New Integration</Button>
            </Group>
          )}
        </Group>

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Type</Table.Th>
                <Table.Th>URL</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Events</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr><Table.Td colSpan={6}><Text ta="center" py="md">Loading...</Text></Table.Td></Table.Tr>
              ) : rows.length === 0 ? (
                <Table.Tr><Table.Td colSpan={6}><Text ta="center" py="md">No integrations found</Text></Table.Td></Table.Tr>
              ) : rows}
            </Table.Tbody>
          </Table>
        </Paper>

        {data && data.totalPages > 1 && (
          <Group justify="center">
            <Button size="xs" variant="light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Text size="sm">Page {data.page} of {data.totalPages}</Text>
            <Button size="xs" variant="light" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </Group>
        )}

        {/* Create / Edit Modal */}
        <Modal opened={modalOpen} onClose={closeModal} title={editId ? 'Edit Integration' : 'New Integration'} size="lg">
          <Stack>
            <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
            <TextInput label="URL" required value={form.url} onChange={(e) => setForm({ ...form, url: e.currentTarget.value })} placeholder="https://example.com/webhook" />
            <Select label="Auth Type" data={AUTH_TYPE_OPTIONS} value={form.auth_type} onChange={(v) => setForm({ ...form, auth_type: v || 'none' })} />
            <MultiSelect label="Events" data={EVENT_OPTIONS} value={form.events} onChange={(v) => setForm({ ...form, events: v })} searchable />
            <Switch label="Active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.currentTarget.checked })} />
            {editId && (
              <Group>
                <Button variant="light" color="teal" leftSection={<IconTestPipe size={14} />}
                  onClick={() => { setTestingId(editId); testMutation.mutate(editId); }}
                  loading={testingId === editId && testMutation.isPending}>
                  Test Connection
                </Button>
                {testResult && (
                  <Badge color={testResult.success ? 'green' : 'red'} size="lg">{testResult.message}</Badge>
                )}
              </Group>
            )}
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSave} loading={saveMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Logs Modal */}
        <Modal opened={!!logsId} onClose={() => setLogsId(null)} title="Integration Logs" size="xl">
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Event</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Code</Table.Th>
                  <Table.Th>Response</Table.Th>
                  <Table.Th>Time</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {logRows.length === 0 ? (
                  <Table.Tr><Table.Td colSpan={5}><Text ta="center" py="md">No logs found</Text></Table.Td></Table.Tr>
                ) : logRows}
              </Table.Tbody>
            </Table>
          </Paper>
        </Modal>

        {/* Help Modal */}
        {helpProvider && PROVIDER_HELP[helpProvider] && (
          <Modal opened={!!helpProvider} onClose={() => setHelpProvider(null)} title={`${helpProvider.charAt(0).toUpperCase() + helpProvider.slice(1)} Integration Help`} size="lg">
            <Stack gap="md">
              <div>
                <Text fw={600} mb="xs">What it does</Text>
                <Text size="sm">{PROVIDER_HELP[helpProvider].description}</Text>
              </div>
              <div>
                <Text fw={600} mb="xs">How to set it up</Text>
                <Text size="sm" component="pre" style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {PROVIDER_HELP[helpProvider].setup}
                </Text>
              </div>
              <div>
                <Text fw={600} mb="xs">Example notification</Text>
                <Text size="sm" c="blue">{PROVIDER_HELP[helpProvider].example}</Text>
              </div>
              <Button onClick={() => setHelpProvider(null)}>Got it</Button>
            </Stack>
          </Modal>
        )}
      </Stack>
    </Container>
  );
}
