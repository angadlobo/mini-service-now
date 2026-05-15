import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Table, Button, Modal, TextInput, PasswordInput, Select,
  Switch, Badge, Group, Loader, ActionIcon, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash, IconPlugConnected } from '@tabler/icons-react';
import { aiApi } from '../../api/common.api';
import type { AiProvider } from '@shared/interfaces';

const PROVIDER_TYPES = [
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'custom', label: 'Custom' },
];

const empty = { name: '', provider_type: 'openai', api_key: '', model: '', base_url: '', active: true };

export function AiProviders() {
  const qc = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [form, setForm] = useState<any>({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);

  const { data: providers = [], isLoading } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: aiApi.listProviders,
  });

  const openCreate = () => { setEditId(null); setForm({ ...empty }); setOpened(true); };

  const openEdit = (p: AiProvider) => {
    setEditId(p.id);
    setForm({ name: p.name, provider_type: p.provider_type, api_key: '', model: p.model, base_url: p.base_url || '', active: p.active });
    setOpened(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form };
      if (!payload.api_key) delete payload.api_key;
      if (!payload.base_url) delete payload.base_url;
      return editId ? aiApi.updateProvider(editId, payload) : aiApi.createProvider(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: `Provider ${editId ? 'updated' : 'created'}`, color: 'green' });
      qc.invalidateQueries({ queryKey: ['ai-providers'] });
      setOpened(false);
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deleteProvider(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Provider removed', color: 'green' });
      qc.invalidateQueries({ queryKey: ['ai-providers'] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const testConnection = async (id: string) => {
    setTesting(id);
    try {
      const result = await aiApi.testProvider(id);
      notifications.show({
        title: result.success ? 'Connection OK' : 'Connection Failed',
        message: result.message,
        color: result.success ? 'green' : 'red',
      });
    } catch (err: any) {
      notifications.show({ title: 'Test Failed', message: err.response?.data?.error || 'Could not reach provider', color: 'red' });
    } finally {
      setTesting(null);
    }
  };

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>AI Providers</Title>
        <Button onClick={openCreate}>Add Provider</Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Model</Table.Th>
            <Table.Th w={80}>Active</Table.Th>
            <Table.Th w={140}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {providers.length === 0 ? (
            <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" ta="center" py="lg">No providers configured</Text></Table.Td></Table.Tr>
          ) : providers.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td><Text fw={500} size="sm">{p.name}</Text></Table.Td>
              <Table.Td><Badge variant="light">{p.provider_type}</Badge></Table.Td>
              <Table.Td>{p.model}</Table.Td>
              <Table.Td><Badge color={p.active ? 'green' : 'gray'}>{p.active ? 'Yes' : 'No'}</Badge></Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => testConnection(p.id)} loading={testing === p.id} title="Test connection">
                    <IconPlugConnected size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" onClick={() => openEdit(p)} title="Edit">
                    <IconPencil size={16} />
                  </ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(p.id)} title="Delete">
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editId ? 'Edit Provider' : 'New Provider'}>
        <Stack>
          <TextInput label="Name" required value={form.name} onChange={(e) => set('name', e.currentTarget.value)} />
          <Select label="Provider Type" required data={PROVIDER_TYPES} value={form.provider_type} onChange={(v) => set('provider_type', v)} />
          <PasswordInput label="API Key" description={editId ? 'Leave blank to keep existing key' : undefined} value={form.api_key} onChange={(e) => set('api_key', e.currentTarget.value)} />
          <TextInput label="Model" required placeholder="e.g. gpt-4o, claude-3-sonnet" value={form.model} onChange={(e) => set('model', e.currentTarget.value)} />
          <TextInput label="Base URL" description="Optional, for custom or Ollama endpoints" value={form.base_url} onChange={(e) => set('base_url', e.currentTarget.value)} />
          <Switch label="Active" checked={form.active} onChange={(e) => set('active', e.currentTarget.checked)} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setOpened(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
