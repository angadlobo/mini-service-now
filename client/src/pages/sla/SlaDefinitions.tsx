import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Group, Button, Paper, Table, Badge, Text, Modal, TextInput, Select,
  NumberInput, Switch, ActionIcon, Tooltip, Divider, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit, IconArrowLeft, IconClock } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { slaApi } from '../../api/sla.api';
import { ConditionBuilder, ConditionField } from '../../components/common/ConditionBuilder';

// Per-table condition fields used by the structured builder (no JSON).
const TABLE_FIELDS: Record<string, ConditionField[]> = {
  incidents: [
    { key: 'priority', label: 'Priority', type: 'select', operatorLabel: 'is', options: [
      { value: '1', label: '1 — Critical' }, { value: '2', label: '2 — High' }, { value: '3', label: '3 — Moderate' }, { value: '4', label: '4 — Low' }, { value: '5', label: '5 — Planning' },
    ], hint: 'Tip: most teams set one SLA per priority (P1 fastest).' },
    { key: 'urgency', label: 'Urgency', type: 'select', operatorLabel: 'is', options: [{ value: '1', label: 'High' }, { value: '2', label: 'Medium' }, { value: '3', label: 'Low' }] },
    { key: 'impact', label: 'Impact', type: 'select', operatorLabel: 'is', options: [{ value: '1', label: 'High' }, { value: '2', label: 'Medium' }, { value: '3', label: 'Low' }] },
    { key: 'state', label: 'State', type: 'select', operatorLabel: 'is', options: [
      { value: 'new', label: 'New' }, { value: 'in_progress', label: 'In Progress' }, { value: 'on_hold', label: 'On Hold' },
    ] },
  ],
  problems: [
    { key: 'priority', label: 'Priority', type: 'select', operatorLabel: 'is', options: [{ value: '1', label: '1 — Critical' }, { value: '2', label: '2 — High' }, { value: '3', label: '3 — Moderate' }, { value: '4', label: '4 — Low' }, { value: '5', label: '5 — Planning' }] },
  ],
};

const TABLE_OPTIONS = [
  { value: 'incidents', label: 'Incidents' },
  { value: 'problems', label: 'Problems' },
];

const emptyForm = { id: '', name: '', table_name: 'incidents', condition: {} as Record<string, any>, duration_minutes: 60, active: true };

function fmtDuration(mins: number) {
  if (mins % 1440 === 0) return `${mins / 1440}d`;
  if (mins % 60 === 0) return `${mins / 60}h`;
  return `${mins}m`;
}

export function SlaDefinitions() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: defs, isLoading } = useQuery({ queryKey: ['sla-definitions'], queryFn: () => slaApi.listDefinitions() });

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: form.name, table_name: form.table_name, condition: form.condition, duration_minutes: form.duration_minutes, active: form.active };
      return form.id ? slaApi.updateDefinition(form.id, payload) : slaApi.createDefinition(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'SLA definition saved', color: 'green' });
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ['sla-definitions'] });
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const del = useMutation({
    mutationFn: (id: string) => slaApi.deleteDefinition(id),
    onSuccess: () => { notifications.show({ title: 'Deleted', message: 'SLA definition removed', color: 'green' }); qc.invalidateQueries({ queryKey: ['sla-definitions'] }); },
  });

  const openNew = () => { setForm(emptyForm); setModalOpen(true); };
  const openEdit = (d: any) => {
    setForm({
      id: d.id, name: d.name, table_name: d.table_name,
      condition: typeof d.condition === 'string' ? JSON.parse(d.condition) : (d.condition || {}),
      duration_minutes: d.duration_minutes, active: d.active,
    });
    setModalOpen(true);
  };

  const describe = (cond: any) => {
    const c = typeof cond === 'string' ? JSON.parse(cond) : (cond || {});
    const entries = Object.entries(c);
    if (entries.length === 0) return 'Any record';
    return entries.map(([k, v]) => `${k} is ${v}`).join(' AND ');
  };

  const fields = TABLE_FIELDS[form.table_name] || TABLE_FIELDS.incidents;

  return (
    <Stack className="fade-in">
      <Group>
        <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/sla')}>Back to dashboard</Button>
      </Group>
      <Group justify="space-between">
        <div>
          <Title order={2} className="page-title">SLA Definitions</Title>
          <Text c="dimmed" size="sm">Define which records get an SLA and how long the target is. No JSON required.</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} onClick={openNew}>New SLA</Button>
      </Group>

      <Paper withBorder radius="md">
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th><Table.Th>Applies to</Table.Th><Table.Th>When</Table.Th>
              <Table.Th>Target</Table.Th><Table.Th>Active</Table.Th><Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(defs || []).map((d: any) => (
              <Table.Tr key={d.id}>
                <Table.Td><Text size="sm" fw={600}>{d.name}</Text></Table.Td>
                <Table.Td><Badge size="sm" variant="light" tt="capitalize">{d.table_name}</Badge></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{describe(d.condition)}</Text></Table.Td>
                <Table.Td><Group gap={4}><IconClock size={13} /><Text size="sm">{fmtDuration(d.duration_minutes)}</Text></Group></Table.Td>
                <Table.Td><Badge size="sm" color={d.active ? 'green' : 'gray'} variant="light">{d.active ? 'Active' : 'Off'}</Badge></Table.Td>
                <Table.Td>
                  <Group gap={4}>
                    <Tooltip label="Edit"><ActionIcon variant="subtle" onClick={() => openEdit(d)}><IconEdit size={16} /></ActionIcon></Tooltip>
                    <Tooltip label="Delete"><ActionIcon color="red" variant="subtle" onClick={() => del.mutate(d.id)}><IconTrash size={16} /></ActionIcon></Tooltip>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
            {!isLoading && (!defs || defs.length === 0) && (
              <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md" size="sm">No SLA definitions yet. Create one to start tracking targets.</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={form.id ? 'Edit SLA Definition' : 'New SLA Definition'} size="lg">
        <Stack>
          <TextInput
            label="Name"
            description="A clear label shown on the SLA dashboard"
            placeholder="e.g. Critical Incident Response"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <Select
            label="Applies to"
            description="Which record type this SLA tracks"
            data={TABLE_OPTIONS}
            value={form.table_name}
            onChange={(v) => setForm({ ...form, table_name: v || 'incidents', condition: {} })}
          />
          <Box>
            <Text size="sm" fw={500} mb={4}>When (conditions)</Text>
            <Text size="xs" c="dimmed" mb={8}>The SLA starts on records matching all of these. Leave empty to apply to every {form.table_name.replace(/s$/, '')}.</Text>
            <ConditionBuilder
              fields={fields}
              value={form.condition}
              onChange={(condition) => setForm({ ...form, condition })}
              emptyLabel={`Applies to every ${form.table_name.replace(/s$/, '')}.`}
            />
          </Box>
          <Divider />
          <NumberInput
            label="Target (minutes)"
            description="How long until the SLA is due. 60 = 1h · 240 = 4h · 480 = 8h · 1440 = 1 day"
            min={1}
            value={form.duration_minutes}
            onChange={(v) => setForm({ ...form, duration_minutes: Number(v) || 60 })}
          />
          <Switch
            label="Active"
            description="Inactive definitions stop attaching to new records"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.currentTarget.checked })}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={save.isPending} disabled={!form.name.trim()} onClick={() => save.mutate()}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
