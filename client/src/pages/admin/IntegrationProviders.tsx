import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Group, Stack, Paper, Text, Badge, Button, Modal, TextInput,
  SimpleGrid, CopyButton, ActionIcon, Tooltip, Divider, Code,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlug, IconCheck, IconCopy, IconAlertCircle, IconRefresh,
  IconBrandGithub, IconBrandGitlab, IconBell, IconBrandTeams,
  IconChartBar, IconChartLine, IconTestPipe, IconArrowLeft,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { integrationsApi } from '../../api/common.api';
import { ProviderConfigForm } from '../../components/integrations/ProviderConfigForm';
import { OAuthConnectButton } from '../../components/integrations/OAuthConnectButton';
import type { ProviderMetadata, Integration } from '@shared/interfaces';

const PROVIDER_ICONS: Record<string, any> = {
  IconBrandGithub, IconBrandGitlab, IconBrandJira: IconPlug,
  IconBell, IconBrandTeams, IconBrandAzure: IconPlug,
  IconChartBar, IconChartLine,
};

function ProviderIcon({ icon, size = 24 }: { icon: string; size?: number }) {
  const Icon = PROVIDER_ICONS[icon] || IconPlug;
  return <Icon size={size} />;
}

const STATUS_COLORS: Record<string, string> = {
  connected: 'green',
  error: 'red',
  pending_auth: 'yellow',
};

export function IntegrationProviders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProvider, setSelectedProvider] = useState<ProviderMetadata | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, unknown>>({});
  const [integrationName, setIntegrationName] = useState('');
  const [existingIntegration, setExistingIntegration] = useState<Integration | null>(null);

  const { data: providers } = useQuery({
    queryKey: ['integration-providers'],
    queryFn: () => integrationsApi.getProviders(),
  });

  const { data: integrations } = useQuery({
    queryKey: ['integrations'],
    queryFn: () => integrationsApi.list({ pageSize: 100 }),
  });

  // Map existing integrations by provider
  const integrationByProvider = new Map<string, Integration>();
  (integrations?.data || []).forEach((i: Integration) => {
    if (i.provider) integrationByProvider.set(i.provider, i);
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProvider) return;
      const payload: any = {
        name: integrationName || selectedProvider.displayName,
        provider: selectedProvider.name,
        provider_config: JSON.stringify(configValues),
        active: true,
        type: 'provider',
        url: '',
        auth_type: 'none',
        events: [],
      };

      if (existingIntegration) {
        return integrationsApi.update(existingIntegration.id, payload);
      }
      // Generate inbound webhook ID
      payload.inbound_webhook_id = `${selectedProvider.name}-${Date.now().toString(36)}`;
      return integrationsApi.create(payload);
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'Integration configuration saved', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['integration-providers'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' });
    },
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.test(id),
    onSuccess: (result: any) => {
      notifications.show({
        title: 'Test Complete',
        message: result.success ? result.body || 'Connected' : result.body || 'Failed',
        color: result.success ? 'green' : 'red',
      });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
    },
  });

  const openProviderConfig = (provider: ProviderMetadata) => {
    const existing = integrationByProvider.get(provider.name);
    setSelectedProvider(provider);
    setExistingIntegration(existing || null);
    setIntegrationName(existing?.name || provider.displayName);
    const pc = existing?.provider_config
      ? (typeof existing.provider_config === 'string' ? JSON.parse(existing.provider_config) : existing.provider_config)
      : {};
    setConfigValues(pc);
  };

  const closeModal = () => {
    setSelectedProvider(null);
    setExistingIntegration(null);
    setConfigValues({});
  };

  const baseUrl = window.location.origin;

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between">
          <Group>
            <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/admin/integrations')}>
              Back
            </Button>
            <Title order={2}>Integration Providers</Title>
          </Group>
        </Group>

        <Text c="dimmed" size="sm">
          Configure bidirectional integrations with external tools. Each provider supports inbound webhooks, outbound actions, and linked resources on records.
        </Text>

        <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing="md">
          {(providers || []).map((provider: ProviderMetadata) => {
            const existing = integrationByProvider.get(provider.name);
            const status = existing?.status || null;

            return (
              <Paper
                key={provider.name}
                withBorder
                p="md"
                style={{ cursor: 'pointer' }}
                onClick={() => openProviderConfig(provider)}
              >
                <Stack gap="sm">
                  <Group justify="space-between">
                    <Group gap="xs">
                      <ProviderIcon icon={provider.icon} />
                      <Text fw={600} size="sm">{provider.displayName}</Text>
                    </Group>
                    {status && (
                      <Badge size="sm" color={STATUS_COLORS[status] || 'gray'} variant="light">
                        {status === 'connected' ? 'Connected' : status === 'error' ? 'Error' : 'Pending'}
                      </Badge>
                    )}
                  </Group>
                  <Text size="xs" c="dimmed" lineClamp={2}>{provider.description}</Text>
                  <Group gap="xs">
                    {provider.oauthConfig && <Badge size="xs" variant="outline">OAuth</Badge>}
                    <Badge size="xs" variant="outline">{provider.workflowActions.length} actions</Badge>
                  </Group>
                </Stack>
              </Paper>
            );
          })}
        </SimpleGrid>

        {/* Provider Configuration Modal */}
        <Modal
          opened={!!selectedProvider}
          onClose={closeModal}
          title={selectedProvider ? `Configure ${selectedProvider.displayName}` : ''}
          size="lg"
        >
          {selectedProvider && (
            <Stack>
              <TextInput
                label="Integration Name"
                value={integrationName}
                onChange={(e) => setIntegrationName(e.currentTarget.value)}
              />

              <Divider label="Provider Configuration" />

              <ProviderConfigForm
                fields={selectedProvider.configFields}
                values={configValues}
                onChange={setConfigValues}
              />

              {/* OAuth Connect */}
              {selectedProvider.oauthConfig && existingIntegration && (
                <>
                  <Divider label="OAuth Authentication" />
                  <OAuthConnectButton
                    integrationId={existingIntegration.id}
                    connected={existingIntegration.status === 'connected' && !!existingIntegration.oauth_tokens}
                    onConnected={() => queryClient.invalidateQueries({ queryKey: ['integrations'] })}
                  />
                </>
              )}

              {/* Status */}
              {existingIntegration && (
                <>
                  <Divider label="Status" />
                  <Group>
                    <Badge
                      size="lg"
                      color={STATUS_COLORS[existingIntegration.status || ''] || 'gray'}
                      variant="light"
                    >
                      {existingIntegration.status || 'unknown'}
                    </Badge>
                    {existingIntegration.status_message && (
                      <Text size="sm" c="dimmed">{existingIntegration.status_message}</Text>
                    )}
                  </Group>
                </>
              )}

              {/* Inbound Webhook URL */}
              {existingIntegration?.inbound_webhook_id && (
                <>
                  <Divider label="Inbound Webhook" />
                  <Group gap="xs">
                    <Code style={{ flex: 1, fontSize: 11 }}>
                      {baseUrl}/api/integrations/hooks/{existingIntegration.inbound_webhook_id}
                    </Code>
                    <CopyButton value={`${baseUrl}/api/integrations/hooks/${existingIntegration.inbound_webhook_id}`}>
                      {({ copied, copy }) => (
                        <Tooltip label={copied ? 'Copied' : 'Copy URL'}>
                          <ActionIcon variant="subtle" onClick={copy}>
                            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </CopyButton>
                  </Group>
                </>
              )}

              {/* Actions */}
              <Divider />
              <Group justify="flex-end">
                {existingIntegration && (
                  <Button
                    variant="light"
                    color="teal"
                    leftSection={<IconTestPipe size={16} />}
                    onClick={() => testMutation.mutate(existingIntegration.id)}
                    loading={testMutation.isPending}
                  >
                    Test Connection
                  </Button>
                )}
                <Button variant="subtle" onClick={closeModal}>Cancel</Button>
                <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending}>
                  {existingIntegration ? 'Update' : 'Create'}
                </Button>
              </Group>
            </Stack>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}
