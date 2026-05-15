import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Table, Button, Modal, TextInput, Select, Textarea,
  Switch, Badge, Group, Loader, ActionIcon, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPencil, IconTrash } from '@tabler/icons-react';
import { aiApi } from '../../api/common.api';
import type { AiPrompt, AiProvider } from '@shared/interfaces';

const USE_CASES = [
  { value: 'incident_summary', label: 'Incident Summary' },
  { value: 'incident_suggest_resolution', label: 'Suggest Resolution' },
  { value: 'change_risk_assessment', label: 'Change Risk Assessment' },
  { value: 'problem_root_cause', label: 'Problem Root Cause' },
  { value: 'kb_article_draft', label: 'KB Article Draft' },
  { value: 'ticket_classify', label: 'Ticket Classification' },
];

const empty = { name: '', use_case: 'incident_summary', system_prompt: '', user_prompt_template: '', provider_id: '', active: true };

export function AiPrompts() {
  const qc = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [form, setForm] = useState<any>({ ...empty });
  const [editId, setEditId] = useState<string | null>(null);

  const { data: prompts = [], isLoading } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: aiApi.listPrompts,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['ai-providers'],
    queryFn: aiApi.listProviders,
  });

  const providerOptions = providers.map((p: AiProvider) => ({ value: p.id, label: `${p.name} (${p.provider_type})` }));

  const openCreate = () => { setEditId(null); setForm({ ...empty }); setOpened(true); };

  const openEdit = (p: AiPrompt) => {
    setEditId(p.id);
    setForm({
      name: p.name, use_case: p.use_case, system_prompt: p.system_prompt,
      user_prompt_template: p.user_prompt_template, provider_id: p.provider_id || '', active: p.active,
    });
    setOpened(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { ...form, provider_id: form.provider_id || null };
      return editId ? aiApi.updatePrompt(editId, payload) : aiApi.createPrompt(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: `Prompt ${editId ? 'updated' : 'created'}`, color: 'green' });
      qc.invalidateQueries({ queryKey: ['ai-prompts'] });
      setOpened(false);
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => aiApi.deletePrompt(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Prompt removed', color: 'green' });
      qc.invalidateQueries({ queryKey: ['ai-prompts'] });
    },
    onError: (err: any) => notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const set = (key: string, val: any) => setForm((f: any) => ({ ...f, [key]: val }));

  const useCaseLabel = (uc: string) => USE_CASES.find((u) => u.value === uc)?.label || uc;

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>AI Prompts</Title>
        <Button onClick={openCreate}>Add Prompt</Button>
      </Group>

      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Use Case</Table.Th>
            <Table.Th w={80}>Active</Table.Th>
            <Table.Th w={100}>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {prompts.length === 0 ? (
            <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="lg">No prompts configured</Text></Table.Td></Table.Tr>
          ) : prompts.map((p) => (
            <Table.Tr key={p.id}>
              <Table.Td><Text fw={500} size="sm">{p.name}</Text></Table.Td>
              <Table.Td><Badge variant="light">{useCaseLabel(p.use_case)}</Badge></Table.Td>
              <Table.Td><Badge color={p.active ? 'green' : 'gray'}>{p.active ? 'Yes' : 'No'}</Badge></Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <ActionIcon variant="subtle" onClick={() => openEdit(p)} title="Edit"><IconPencil size={16} /></ActionIcon>
                  <ActionIcon variant="subtle" color="red" onClick={() => deleteMutation.mutate(p.id)} title="Delete"><IconTrash size={16} /></ActionIcon>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>

      <Modal opened={opened} onClose={() => setOpened(false)} title={editId ? 'Edit Prompt' : 'New Prompt'} size="lg">
        <Stack>
          <TextInput label="Name" required value={form.name} onChange={(e) => set('name', e.currentTarget.value)} />
          <Select label="Use Case" required data={USE_CASES} value={form.use_case} onChange={(v) => set('use_case', v)} />
          <Textarea label="System Prompt" required minRows={3} autosize value={form.system_prompt} onChange={(e) => set('system_prompt', e.currentTarget.value)} />
          <Textarea
            label="User Prompt Template" required minRows={3} autosize
            description="Use {{variable}} placeholders, e.g. {{description}}, {{priority}}, {{category}}"
            value={form.user_prompt_template}
            onChange={(e) => set('user_prompt_template', e.currentTarget.value)}
          />
          <Select
            label="Provider" description="Optional; uses default if not set" clearable
            data={providerOptions} value={form.provider_id || null}
            onChange={(v) => set('provider_id', v || '')}
          />
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
