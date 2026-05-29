import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Text, Paper, Group, Button, TextInput, PasswordInput, Switch,
  Badge, Table, Box, Alert, CopyButton, ActionIcon, Tooltip, Divider, ThemeIcon, LoadingOverlay,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconBrandTelegram, IconBrandSlack, IconBrandWhatsapp, IconBrandDiscord,
  IconDeviceLaptop, IconCopy, IconCheck, IconRefresh, IconDeviceFloppy,
  IconRobot, IconTrash, IconAlertTriangle, IconPlugConnected,
} from '@tabler/icons-react';
import { chatbotApi, ChatbotPlatform } from '../../api/chatbot.api';
import dayjs from 'dayjs';

const PLATFORM_META: Record<string, { label: string; icon: any; color: string }> = {
  telegram: { label: 'Telegram', icon: IconBrandTelegram, color: '#0088cc' },
  slack: { label: 'Slack', icon: IconBrandSlack, color: '#611f69' },
  teams: { label: 'Microsoft Teams', icon: IconDeviceLaptop, color: '#4b53bc' },
  whatsapp: { label: 'WhatsApp', icon: IconBrandWhatsapp, color: '#25d366' },
  discord: { label: 'Discord', icon: IconBrandDiscord, color: '#5865f2' },
};

const KEY_LABELS: Record<string, string> = {
  TELEGRAM_BOT_TOKEN: 'Bot Token (from @BotFather)',
  TELEGRAM_WEBHOOK_SECRET: 'Webhook Secret (optional)',
  SLACK_BOT_TOKEN: 'Bot OAuth Token',
  SLACK_SIGNING_SECRET: 'Signing Secret',
  TEAMS_APP_ID: 'App / Bot ID',
  TEAMS_APP_PASSWORD: 'App Password (client secret)',
  WHATSAPP_VERIFY_TOKEN: 'Webhook Verify Token',
  WHATSAPP_PHONE_NUMBER_ID: 'Phone Number ID',
  WHATSAPP_ACCESS_TOKEN: 'Access Token',
  DISCORD_BOT_TOKEN: 'Bot Token',
  DISCORD_APPLICATION_ID: 'Application ID',
  DISCORD_PUBLIC_KEY: 'Public Key',
};

function PlatformCard({ platform, baseUrl, onSaved }: { platform: ChatbotPlatform; baseUrl: string; onSaved: () => void }) {
  const meta = PLATFORM_META[platform.platform];
  const Icon = meta?.icon || IconRobot;
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [publicUrl, setPublicUrl] = useState(baseUrl);

  const save = useMutation({
    mutationFn: () => {
      const settings = Object.entries(edits)
        .filter(([, v]) => v !== '')
        .map(([key, value]) => ({ key, value }));
      return chatbotApi.saveConfig(settings);
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: `${meta?.label} credentials updated`, color: 'green' });
      setEdits({});
      onSaved();
    },
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Save failed', color: 'red' }),
  });

  const setupTelegram = useMutation({
    mutationFn: () => chatbotApi.setupTelegram(publicUrl),
    onSuccess: (r: any) => notifications.show({
      title: r.success ? 'Webhook registered' : 'Webhook failed',
      message: r.success ? `Telegram will deliver to ${r.webhookUrl}` : 'Check the bot token and public URL',
      color: r.success ? 'green' : 'red',
    }),
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Setup failed', color: 'red' }),
  });

  const setupDiscord = useMutation({
    mutationFn: () => chatbotApi.setupDiscord(),
    onSuccess: (r: any) => notifications.show({
      title: r.success ? 'Commands registered' : 'Registration failed',
      message: r.success ? 'Discord slash commands are live' : 'Check the bot token and application ID',
      color: r.success ? 'green' : 'red',
    }),
    onError: (e: any) => notifications.show({ title: 'Error', message: e.response?.data?.error || 'Setup failed', color: 'red' }),
  });

  return (
    <Paper p="lg" radius="md" withBorder pos="relative">
      <LoadingOverlay visible={save.isPending} />
      <Group justify="space-between" mb="md">
        <Group>
          <ThemeIcon size="lg" radius="md" variant="light" style={{ color: meta?.color }}>
            <Icon size={22} />
          </ThemeIcon>
          <div>
            <Text fw={600}>{meta?.label || platform.platform}</Text>
            <Text size="xs" c="dimmed">{platform.webhookUrl}</Text>
          </div>
        </Group>
        <Badge color={platform.configured ? 'green' : platform.anySet ? 'yellow' : 'gray'} variant="light">
          {platform.configured ? 'Configured' : platform.anySet ? 'Partial' : 'Not set'}
        </Badge>
      </Group>

      <Stack gap="sm">
        {platform.keys.map((k) => (
          k.secret ? (
            <PasswordInput
              key={k.key}
              label={KEY_LABELS[k.key] || k.key}
              placeholder={k.set ? '•••••••• (set — leave blank to keep)' : 'Not set'}
              value={edits[k.key] ?? ''}
              onChange={(e) => setEdits({ ...edits, [k.key]: e.currentTarget.value })}
            />
          ) : (
            <TextInput
              key={k.key}
              label={KEY_LABELS[k.key] || k.key}
              placeholder="Not set"
              value={edits[k.key] ?? k.value}
              onChange={(e) => setEdits({ ...edits, [k.key]: e.currentTarget.value })}
            />
          )
        ))}

        <Group gap="xs" align="flex-end">
          <Box style={{ flex: 1 }}>
            <Text size="xs" fw={500} mb={2}>Webhook URL (register this with {meta?.label})</Text>
            <Group gap={4}>
              <TextInput readOnly value={platform.webhookUrl} style={{ flex: 1 }} size="xs" />
              <CopyButton value={platform.webhookUrl}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? 'Copied' : 'Copy'}>
                    <ActionIcon variant="light" color={copied ? 'green' : 'gray'} onClick={copy}>
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>
          </Box>
        </Group>

        {platform.platform === 'telegram' && (
          <TextInput
            label="Public server URL (for webhook registration)"
            description="Must be a public HTTPS URL Telegram can reach, e.g. https://itsm.example.com"
            value={publicUrl}
            onChange={(e) => setPublicUrl(e.currentTarget.value)}
          />
        )}

        <Group justify="space-between" mt="xs">
          <Group gap="xs">
            {platform.platform === 'telegram' && (
              <Button size="xs" variant="light" leftSection={<IconPlugConnected size={14} />}
                loading={setupTelegram.isPending} onClick={() => setupTelegram.mutate()}>
                Register webhook
              </Button>
            )}
            {platform.platform === 'discord' && (
              <Button size="xs" variant="light" leftSection={<IconPlugConnected size={14} />}
                loading={setupDiscord.isPending} onClick={() => setupDiscord.mutate()}>
                Register slash commands
              </Button>
            )}
          </Group>
          <Button size="xs" leftSection={<IconDeviceFloppy size={14} />}
            disabled={Object.keys(edits).length === 0} loading={save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </Group>
      </Stack>
    </Paper>
  );
}

export function ChatbotConfig() {
  const qc = useQueryClient();
  const { data: config, isLoading } = useQuery({ queryKey: ['chatbot-config'], queryFn: chatbotApi.getConfig });
  const { data: links } = useQuery({ queryKey: ['chatbot-links'], queryFn: chatbotApi.listLinks });
  const { data: sessions } = useQuery({ queryKey: ['chatbot-sessions'], queryFn: chatbotApi.listSessions });

  const [nlu, setNlu] = useState(false);
  useEffect(() => { if (config) setNlu(config.nluEnabled); }, [config]);

  const toggleNlu = useMutation({
    mutationFn: (val: boolean) => chatbotApi.saveConfig([{ key: 'CHATBOT_NLU_ENABLED', value: String(val) }]),
    onSuccess: () => {
      notifications.show({ title: 'Updated', message: 'NLU setting saved', color: 'green' });
      qc.invalidateQueries({ queryKey: ['chatbot-config'] });
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => chatbotApi.deactivateLink(id),
    onSuccess: () => {
      notifications.show({ title: 'Deactivated', message: 'Account link deactivated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['chatbot-links'] });
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['chatbot-config'] });

  return (
    <Stack className="fade-in" pos="relative">
      <LoadingOverlay visible={isLoading} />
      <Group justify="space-between">
        <div>
          <Title order={2} className="page-title">Chatbot & Messaging</Title>
          <Text c="dimmed" size="sm">Configure Telegram, Slack, Teams, WhatsApp and Discord bots that let users create tickets from chat.</Text>
        </div>
      </Group>

      {/* NLU */}
      <Paper p="lg" radius="md" withBorder>
        <Group justify="space-between">
          <Group>
            <ThemeIcon size="lg" radius="md" variant="light" color="violet"><IconRobot size={22} /></ThemeIcon>
            <div>
              <Text fw={600}>Natural Language Understanding</Text>
              <Text size="xs" c="dimmed">Let users describe issues in plain language instead of slash commands. Uses your active AI provider.</Text>
            </div>
          </Group>
          <Switch
            checked={nlu}
            onChange={(e) => { setNlu(e.currentTarget.checked); toggleNlu.mutate(e.currentTarget.checked); }}
            size="lg"
          />
        </Group>
        {nlu && !config?.aiProviderActive && (
          <Alert mt="md" color="yellow" icon={<IconAlertTriangle size={16} />} variant="light">
            No active AI provider. NLU will stay off until one is configured in <b>Admin → AI Providers</b>. The bot still works with slash commands.
          </Alert>
        )}
      </Paper>

      {/* Platforms */}
      <Title order={4} mt="sm">Platforms</Title>
      <Box style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
        {config?.platforms.map((p) => (
          <PlatformCard key={p.platform} platform={p} baseUrl={config.baseUrl} onSaved={refresh} />
        ))}
      </Box>

      {/* Account links */}
      <Group justify="space-between" mt="md">
        <Title order={4}>Linked Accounts</Title>
        <ActionIcon variant="subtle" onClick={() => qc.invalidateQueries({ queryKey: ['chatbot-links'] })}>
          <IconRefresh size={16} />
        </ActionIcon>
      </Group>
      <Paper withBorder radius="md">
        <Table highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Platform</Table.Th>
              <Table.Th>Chat Username</Table.Th>
              <Table.Th>Linked</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th></Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(links || []).map((l: any) => (
              <Table.Tr key={l.id}>
                <Table.Td>{l.user_name || l.username || '-'}</Table.Td>
                <Table.Td><Badge size="sm" variant="light">{l.platform}</Badge></Table.Td>
                <Table.Td>{l.platform_username || l.platform_user_id}</Table.Td>
                <Table.Td>{l.linked_at ? dayjs(l.linked_at).format('MMM D, YYYY') : '-'}</Table.Td>
                <Table.Td><Badge size="sm" color={l.active ? 'green' : 'gray'} variant="light">{l.active ? 'Active' : 'Inactive'}</Badge></Table.Td>
                <Table.Td>
                  {l.active && (
                    <Tooltip label="Deactivate link">
                      <ActionIcon color="red" variant="subtle" onClick={() => deactivate.mutate(l.id)}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Table.Td>
              </Table.Tr>
            ))}
            {(!links || links.length === 0) && (
              <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md" size="sm">No linked accounts yet. Users link via <code>/link &lt;username&gt; &lt;password&gt;</code> in chat.</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Active sessions */}
      <Divider my="sm" />
      <Title order={4}>Active Conversations</Title>
      <Paper withBorder radius="md">
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>User</Table.Th>
              <Table.Th>Platform</Table.Th>
              <Table.Th>Flow</Table.Th>
              <Table.Th>Step</Table.Th>
              <Table.Th>Expires</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(sessions || []).map((s: any) => (
              <Table.Tr key={s.id}>
                <Table.Td>{s.user_name || '-'}</Table.Td>
                <Table.Td><Badge size="sm" variant="light">{s.platform}</Badge></Table.Td>
                <Table.Td tt="capitalize">{s.command}</Table.Td>
                <Table.Td>{s.current_step}</Table.Td>
                <Table.Td>{s.expires_at ? dayjs(s.expires_at).format('HH:mm') : '-'}</Table.Td>
              </Table.Tr>
            ))}
            {(!sessions || sessions.length === 0) && (
              <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" ta="center" py="md" size="sm">No active conversations.</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
