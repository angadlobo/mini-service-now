import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Table, Button, Modal, TextInput, Select, Textarea,
  Switch, Badge, Tabs, Group, Stack, Paper, NumberInput, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import { workflowsApi } from '../../api/common.api';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';
import type { WorkflowRule } from '@shared/interfaces';

const TABLE_OPTIONS = [
  { value: 'incidents', label: 'Incidents' },
  { value: 'changes', label: 'Changes' },
  { value: 'problems', label: 'Problems' },
  { value: 'cis', label: 'Configuration Items' },
];

const TRIGGER_OPTIONS = [
  { value: 'record.created', label: 'Record Created' },
  { value: 'record.updated', label: 'Record Updated' },
  { value: 'record.state_changed', label: 'State Changed' },
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
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin');

  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [activeTab, setActiveTab] = useState<string | null>('rules');

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

  const rows = (data?.data || []).map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td>{r.name}</Table.Td>
      <Table.Td>{r.table_name}</Table.Td>
      <Table.Td>{r.trigger_event}</Table.Td>
      <Table.Td><Badge color={r.active ? 'green' : 'gray'}>{r.active ? 'Active' : 'Inactive'}</Badge></Table.Td>
      <Table.Td>{r.execution_order}</Table.Td>
      <Table.Td>
        {isAdmin && (
          <Group gap="xs">
            <Button size="xs" variant="light" leftSection={<IconEdit size={14} />} onClick={() => openEdit(r)}>Edit</Button>
            <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />}
              onClick={() => { if (confirm('Delete this workflow rule?')) deleteMutation.mutate(r.id); }}>
              Delete
            </Button>
          </Group>
        )}
      </Table.Td>
    </Table.Tr>
  ));

  const execRows = (execData?.data || []).map((e) => (
    <Table.Tr key={e.id}>
      <Table.Td>{e.rule_name || e.rule_id}</Table.Td>
      <Table.Td>{e.table_name}</Table.Td>
      <Table.Td>{e.record_id}</Table.Td>
      <Table.Td><Badge color={e.status === 'success' ? 'green' : 'red'}>{e.status}</Badge></Table.Td>
      <Table.Td>{e.error || '-'}</Table.Td>
      <Table.Td>{dayjs(e.created_at).format('MMM D, HH:mm')}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Workflow Rules</Title>
          {isAdmin && (
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New Rule</Button>
          )}
        </Group>

        <Tabs value={activeTab} onChange={setActiveTab}>
          <Tabs.List>
            <Tabs.Tab value="rules">Rules</Tabs.Tab>
            <Tabs.Tab value="executions">Execution Log</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="rules" pt="md">
            <Paper withBorder>
              <Table striped highlightOnHover>
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

          <Tabs.Panel value="executions" pt="md">
            <Paper withBorder>
              <Table striped highlightOnHover>
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

        <Modal opened={modalOpen} onClose={closeModal} title={editId ? 'Edit Workflow Rule' : 'New Workflow Rule'} size="lg">
          <Stack>
            <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
            <Select label="Table" required data={TABLE_OPTIONS} value={form.table_name} onChange={(v) => setForm({ ...form, table_name: v || '' })} />
            <Select label="Trigger Event" required data={TRIGGER_OPTIONS} value={form.trigger_event} onChange={(v) => setForm({ ...form, trigger_event: v || '' })} />
            <Textarea label="Conditions (JSON)" required minRows={3} value={form.conditions} onChange={(e) => setForm({ ...form, conditions: e.currentTarget.value })} />
            <Textarea label="Actions (JSON)" required minRows={4} value={form.actions} onChange={(e) => setForm({ ...form, actions: e.currentTarget.value })} />
            <NumberInput label="Execution Order" value={form.execution_order} onChange={(v) => setForm({ ...form, execution_order: Number(v) || 100 })} />
            <Switch label="Active" checked={form.active} onChange={(e) => setForm({ ...form, active: e.currentTarget.checked })} />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSave} loading={saveMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
