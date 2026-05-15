import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Paper, Button, Group, Stack, Select, Switch, Textarea,
  TextInput, Table, Modal, Text, Divider,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit } from '@tabler/icons-react';
import { notificationPrefsApi } from '../../api/common.api';

interface NotificationChannel {
  id: string;
  name: string;
  type: string;
  config: Record<string, any>;
  active: boolean;
}

const CHANNEL_TYPES = [
  { value: 'email', label: 'Email' },
  { value: 'slack', label: 'Slack' },
  { value: 'in_app', label: 'In-App' },
];

const emptyForm = { name: '', type: 'email', config: '{}', active: true };

export function NotificationChannels() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [configError, setConfigError] = useState('');

  const { data: channels = [], isLoading } = useQuery<NotificationChannel[]>({
    queryKey: ['notification-channels'],
    queryFn: notificationPrefsApi.getChannels,
  });

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setConfigError('');
    setModalOpen(true);
  };

  const openEdit = (ch: NotificationChannel) => {
    setEditId(ch.id);
    setForm({
      name: ch.name,
      type: ch.type,
      config: JSON.stringify(ch.config || {}, null, 2),
      active: ch.active,
    });
    setConfigError('');
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      let parsedConfig: Record<string, any>;
      try {
        parsedConfig = JSON.parse(form.config);
      } catch {
        throw new Error('Invalid JSON in configuration');
      }
      const payload = { name: form.name, type: form.type, config: parsedConfig, active: form.active };
      return editId
        ? notificationPrefsApi.updateChannel(editId, payload)
        : notificationPrefsApi.createChannel(payload);
    },
    onSuccess: () => {
      notifications.show({
        title: 'Success',
        message: editId ? 'Channel updated' : 'Channel created',
        color: 'green',
      });
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
      setModalOpen(false);
    },
    onError: (err: any) => {
      const msg = err.message === 'Invalid JSON in configuration'
        ? err.message
        : err.response?.data?.error || 'Failed to save channel';
      setConfigError(err.message === 'Invalid JSON in configuration' ? msg : '');
      notifications.show({ title: 'Error', message: msg, color: 'red' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => notificationPrefsApi.deleteChannel(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Channel removed', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['notification-channels'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Failed to delete', color: 'red' });
    },
  });

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2}>Notification Channels</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          New Channel
        </Button>
      </Group>

      <Paper shadow="xs" radius="md" withBorder>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Name</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Active</Table.Th>
              <Table.Th w={140}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">Loading...</Text></Table.Td></Table.Tr>
            ) : channels.length === 0 ? (
              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">No channels configured</Text></Table.Td></Table.Tr>
            ) : (
              channels.map((ch) => (
                <Table.Tr key={ch.id}>
                  <Table.Td>{ch.name}</Table.Td>
                  <Table.Td>{ch.type}</Table.Td>
                  <Table.Td>
                    <Text c={ch.active ? 'green' : 'red'} size="sm">{ch.active ? 'Yes' : 'No'}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Button variant="subtle" size="xs" onClick={() => openEdit(ch)}>
                        <IconEdit size={16} />
                      </Button>
                      <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        onClick={() => deleteMutation.mutate(ch.id)}
                        loading={deleteMutation.isPending}
                      >
                        <IconTrash size={16} />
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Channel' : 'Create Channel'}
      >
        <Stack>
          <TextInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
          />
          <Select
            label="Type"
            required
            data={CHANNEL_TYPES}
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v || 'email' }))}
          />
          <Textarea
            label="Configuration (JSON)"
            autosize
            minRows={3}
            maxRows={8}
            value={form.config}
            error={configError || undefined}
            onChange={(e) => {
              setForm((f) => ({ ...f, config: e.currentTarget.value }));
              setConfigError('');
            }}
          />
          <Switch
            label="Active"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.currentTarget.checked }))}
          />
          <Divider />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
              {editId ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
