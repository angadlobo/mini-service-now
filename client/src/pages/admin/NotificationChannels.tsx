import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Paper, Button, Group, Stack, Select, Switch, Textarea,
  TextInput, Table, Modal, Text, Divider, Badge, Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconTrash, IconEdit, IconTestPipe, IconBrandTelegram, IconBrandWhatsapp, IconMail, IconBell, IconBrandSlack } from '@tabler/icons-react';
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
  { value: 'telegram', label: 'Telegram' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'in_app', label: 'In-App' },
];

const CHANNEL_ICONS: Record<string, any> = {
  email: IconMail,
  slack: IconBrandSlack,
  telegram: IconBrandTelegram,
  whatsapp: IconBrandWhatsapp,
  in_app: IconBell,
};

const CHANNEL_COLORS: Record<string, string> = {
  email: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  slack: 'linear-gradient(135deg, #667eea, #764ba2)',
  telegram: 'linear-gradient(135deg, #0088cc, #00bbee)',
  whatsapp: 'linear-gradient(135deg, #25d366, #128c7e)',
  in_app: 'linear-gradient(135deg, #f7971e, #ffd200)',
};

const emptyForm = { name: '', type: 'email', config: '{}', active: true, telegram_bot_token: '', telegram_chat_id: '', whatsapp_phone_number_id: '', whatsapp_access_token: '', whatsapp_test_phone: '' };

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
    const config = ch.config || {};
    setForm({
      name: ch.name,
      type: ch.type,
      config: JSON.stringify(config, null, 2),
      active: ch.active,
      telegram_bot_token: config.bot_token || '',
      telegram_chat_id: config.chat_id || config.default_chat_id || '',
      whatsapp_phone_number_id: config.phone_number_id || '',
      whatsapp_access_token: config.access_token || '',
      whatsapp_test_phone: config.test_phone || config.phone_number || '',
    });
    setConfigError('');
    setModalOpen(true);
  };

  const buildConfig = () => {
    if (form.type === 'telegram') {
      return { bot_token: form.telegram_bot_token, chat_id: form.telegram_chat_id, default_chat_id: form.telegram_chat_id };
    }
    if (form.type === 'whatsapp') {
      return { phone_number_id: form.whatsapp_phone_number_id, access_token: form.whatsapp_access_token, test_phone: form.whatsapp_test_phone, phone_number: form.whatsapp_test_phone };
    }
    try {
      return JSON.parse(form.config);
    } catch {
      throw new Error('Invalid JSON in configuration');
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const parsedConfig = buildConfig();
      const payload = { name: form.name, type: form.type, config: parsedConfig, active: form.active };
      return editId
        ? notificationPrefsApi.updateChannel(editId, payload)
        : notificationPrefsApi.createChannel(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editId ? 'Channel updated' : 'Channel created', color: 'green' });
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

  const testMutation = useMutation({
    mutationFn: (id: string) => notificationPrefsApi.testChannel(id),
    onSuccess: (result) => {
      notifications.show({
        title: result.success ? 'Test Passed' : 'Test Failed',
        message: result.message,
        color: result.success ? 'green' : 'red',
      });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Test Failed', message: err.response?.data?.error || 'Test failed', color: 'red' });
    },
  });

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.65)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
  };

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2} className="page-title">Notification Channels</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={openCreate}
          className="gradient-btn"
        >
          New Channel
        </Button>
      </Group>

      <Paper radius="lg" style={{ ...glassStyle, overflow: 'hidden' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.08), rgba(118,75,162,0.08))' }}>
              <Table.Th>Channel</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th w={200}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {isLoading ? (
              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">Loading...</Text></Table.Td></Table.Tr>
            ) : channels.length === 0 ? (
              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" py="md">No channels configured</Text></Table.Td></Table.Tr>
            ) : (
              channels.map((ch) => {
                const ChannelIcon = CHANNEL_ICONS[ch.type] || IconBell;
                return (
                  <Table.Tr key={ch.id}>
                    <Table.Td>
                      <Group gap="sm">
                        <Box style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: CHANNEL_COLORS[ch.type] || 'linear-gradient(135deg, #a0aec0, #718096)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <ChannelIcon size={18} color="white" />
                        </Box>
                        <Text fw={500}>{ch.name}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        size="sm"
                        radius="md"
                        className="gradient-badge"
                        style={{ background: CHANNEL_COLORS[ch.type] || 'linear-gradient(135deg, #a0aec0, #718096)' }}
                      >
                        {ch.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={ch.active ? 'green' : 'gray'} variant="light" size="sm" radius="md">
                        {ch.active ? 'Active' : 'Inactive'}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Button variant="light" size="xs" radius="md" onClick={() => openEdit(ch)}>
                          <IconEdit size={14} />
                        </Button>
                        <Button variant="light" color="teal" size="xs" radius="md"
                          onClick={() => testMutation.mutate(ch.id)} loading={testMutation.isPending}>
                          <IconTestPipe size={14} />
                        </Button>
                        <Button variant="light" color="red" size="xs" radius="md"
                          onClick={() => { if (confirm('Delete this channel?')) deleteMutation.mutate(ch.id); }}
                          loading={deleteMutation.isPending}>
                          <IconTrash size={14} />
                        </Button>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? 'Edit Channel' : 'Create Channel'}
        size="lg"
        radius="lg"
      >
        <Stack>
          <TextInput
            label="Name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
            placeholder="e.g., Production Alerts"
          />
          <Select
            label="Type"
            required
            data={CHANNEL_TYPES}
            value={form.type}
            onChange={(v) => setForm((f) => ({ ...f, type: v || 'email' }))}
          />

          {/* Telegram-specific config */}
          {form.type === 'telegram' && (
            <Paper p="md" radius="md" withBorder style={{ borderColor: 'rgba(0, 136, 204, 0.3)', background: 'rgba(0, 136, 204, 0.03)' }}>
              <Group gap="xs" mb="sm">
                <IconBrandTelegram size={20} color="#0088cc" />
                <Text size="sm" fw={600} c="#0088cc">Telegram Configuration</Text>
              </Group>
              <Stack gap="sm">
                <TextInput
                  label="Bot Token"
                  required
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  description="Get this from @BotFather on Telegram"
                  value={form.telegram_bot_token}
                  onChange={(e) => setForm((f) => ({ ...f, telegram_bot_token: e.currentTarget.value }))}
                />
                <TextInput
                  label="Default Chat ID"
                  required
                  placeholder="-1001234567890"
                  description="Group/channel ID or user ID to send messages to"
                  value={form.telegram_chat_id}
                  onChange={(e) => setForm((f) => ({ ...f, telegram_chat_id: e.currentTarget.value }))}
                />
              </Stack>
            </Paper>
          )}

          {/* WhatsApp-specific config */}
          {form.type === 'whatsapp' && (
            <Paper p="md" radius="md" withBorder style={{ borderColor: 'rgba(37, 211, 102, 0.3)', background: 'rgba(37, 211, 102, 0.03)' }}>
              <Group gap="xs" mb="sm">
                <IconBrandWhatsapp size={20} color="#25d366" />
                <Text size="sm" fw={600} c="#25d366">WhatsApp Cloud API Configuration</Text>
              </Group>
              <Stack gap="sm">
                <TextInput
                  label="Phone Number ID"
                  required
                  placeholder="1234567890"
                  description="From Meta Business Manager > WhatsApp > API Setup"
                  value={form.whatsapp_phone_number_id}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_phone_number_id: e.currentTarget.value }))}
                />
                <TextInput
                  label="Access Token"
                  required
                  placeholder="EAABsbCS..."
                  description="Permanent access token from Meta Business Manager"
                  value={form.whatsapp_access_token}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_access_token: e.currentTarget.value }))}
                />
                <TextInput
                  label="Test Phone Number"
                  placeholder="+1234567890"
                  description="Phone number to send test messages to (with country code)"
                  value={form.whatsapp_test_phone}
                  onChange={(e) => setForm((f) => ({ ...f, whatsapp_test_phone: e.currentTarget.value }))}
                />
              </Stack>
            </Paper>
          )}

          {/* Generic JSON config for other types */}
          {!['telegram', 'whatsapp'].includes(form.type) && (
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
          )}

          <Switch
            label="Active"
            checked={form.active}
            onChange={(e) => setForm((f) => ({ ...f, active: e.currentTarget.checked }))}
          />
          <Divider />
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} className="gradient-btn">
              {editId ? 'Update' : 'Create'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
