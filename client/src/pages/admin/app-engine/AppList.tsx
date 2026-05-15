import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Stack, Title, Button, Modal, TextInput, Textarea, Select, Switch, Badge,
  Group, Loader, ActionIcon, Text, SimpleGrid, Paper,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { appEngineApi } from '../../../api/app-engine.api';

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue' },
  { value: 'red', label: 'Red' },
  { value: 'green', label: 'Green' },
  { value: 'orange', label: 'Orange' },
  { value: 'violet', label: 'Violet' },
  { value: 'teal', label: 'Teal' },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

const emptyForm = {
  name: '',
  slug: '',
  description: '',
  icon: 'IconApps',
  color: 'blue',
  active: true,
};

interface App {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  active: boolean;
  table_count?: number;
}

export function AppList() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [opened, setOpened] = useState(false);
  const [form, setForm] = useState<typeof emptyForm>({ ...emptyForm });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const { data: apps = [], isLoading } = useQuery<App[]>({
    queryKey: ['app-engine-apps'],
    queryFn: () => appEngineApi.listApps(),
  });

  const createMutation = useMutation({
    mutationFn: () => appEngineApi.createApp(form),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'App created', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-apps'] });
      setOpened(false);
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Create failed', color: 'red' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => appEngineApi.deleteApp(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'App removed', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-apps'] });
      setDeleteConfirm(null);
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const set = (key: string, val: unknown) =>
    setForm((f) => ({
      ...f,
      [key]: val,
      ...(key === 'name' ? { slug: slugify(val as string) } : {}),
    }));

  const openCreate = () => {
    setForm({ ...emptyForm });
    setOpened(true);
  };

  if (isLoading) return <Loader />;

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Custom Apps</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New App</Button>
      </Group>

      {apps.length === 0 ? (
        <Paper p="xl" withBorder>
          <Text c="dimmed" ta="center">No custom apps yet. Create your first app to get started.</Text>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          {apps.map((app) => (
            <Paper
              key={app.id}
              p="md"
              withBorder
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(`/admin/app-engine/${app.id}`)}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="sm">
                  <Badge
                    size="xl"
                    circle
                    color={app.color || 'blue'}
                    variant="filled"
                  >
                    {app.name.charAt(0).toUpperCase()}
                  </Badge>
                  <div>
                    <Text fw={600} size="md">{app.name}</Text>
                    <Text size="xs" c="dimmed">{app.slug}</Text>
                  </div>
                </Group>
                <ActionIcon
                  variant="subtle"
                  color="red"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirm(app.id);
                  }}
                  title="Delete"
                >
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
              {app.description && (
                <Text size="sm" c="dimmed" lineClamp={2} mb="xs">{app.description}</Text>
              )}
              <Group gap="xs">
                <Badge variant="light" size="sm">{app.table_count ?? 0} tables</Badge>
                <Badge color={app.active ? 'green' : 'gray'} size="sm">
                  {app.active ? 'Active' : 'Inactive'}
                </Badge>
              </Group>
            </Paper>
          ))}
        </SimpleGrid>
      )}

      {/* Create App Modal */}
      <Modal opened={opened} onClose={() => setOpened(false)} title="New App">
        <Stack>
          <TextInput label="Name" required value={form.name} onChange={(e) => set('name', e.currentTarget.value)} />
          <TextInput label="Slug" description="Auto-generated from name" value={form.slug} onChange={(e) => set('slug', e.currentTarget.value)} />
          <Textarea label="Description" value={form.description} onChange={(e) => set('description', e.currentTarget.value)} />
          <TextInput label="Icon" value={form.icon} onChange={(e) => set('icon', e.currentTarget.value)} />
          <Select label="Color" data={COLOR_OPTIONS} value={form.color} onChange={(v) => set('color', v)} />
          <Switch label="Active" checked={form.active} onChange={(e) => set('active', e.currentTarget.checked)} />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setOpened(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} loading={createMutation.isPending} disabled={!form.name}>
              Create
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal opened={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete">
        <Stack>
          <Text>Are you sure you want to delete this app? This action cannot be undone.</Text>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button
              color="red"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              loading={deleteMutation.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
}
