import { useQuery } from '@tanstack/react-query';
import { Paper, Text, Stack, Group, Badge, Anchor, Divider, ThemeIcon } from '@mantine/core';
import { IconExternalLink, IconLink, IconBrandGithub } from '@tabler/icons-react';
import { integrationsApi } from '../../api/common.api';
import type { IntegrationLink } from '@shared/interfaces';

interface IntegrationLinksPanelProps {
  tableName: string;
  recordId: string;
}

const PROVIDER_COLORS: Record<string, string> = {
  github: 'dark',
  gitlab: 'orange',
  jira: 'blue',
  pagerduty: 'green',
  teams: 'violet',
  azure_devops: 'cyan',
  datadog: 'grape',
  grafana: 'orange',
};

const TYPE_LABELS: Record<string, string> = {
  issue: 'Issue',
  pull_request: 'Pull Request',
  merge_request: 'Merge Request',
  work_item: 'Work Item',
  alert: 'Alert',
  pipeline: 'Pipeline',
  push: 'Push',
  event: 'Event',
  annotation: 'Annotation',
  action_submit: 'Action',
};

export function IntegrationLinksPanel({ tableName, recordId }: IntegrationLinksPanelProps) {
  const { data: links } = useQuery({
    queryKey: ['integration-links', tableName, recordId],
    queryFn: () => integrationsApi.getLinks(tableName, recordId),
    enabled: !!recordId,
  });

  if (!links || links.length === 0) return null;

  // Group by provider
  const grouped = (links as IntegrationLink[]).reduce<Record<string, IntegrationLink[]>>((acc, link) => {
    const key = link.provider || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(link);
    return acc;
  }, {});

  return (
    <Paper withBorder p="md">
      <Group gap="xs" mb="sm">
        <IconLink size={16} />
        <Text fw={600} size="sm">External Links</Text>
        <Badge size="xs" variant="light">{links.length}</Badge>
      </Group>

      <Stack gap="xs">
        {Object.entries(grouped).map(([provider, providerLinks]) => (
          <div key={provider}>
            <Text size="xs" fw={600} tt="capitalize" c="dimmed" mb={4}>
              {provider.replace(/_/g, ' ')}
            </Text>
            {providerLinks.map((link) => (
              <Group key={link.id} gap="xs" mb={4} wrap="nowrap">
                <Badge
                  size="xs"
                  variant="light"
                  color={PROVIDER_COLORS[provider] || 'gray'}
                >
                  {TYPE_LABELS[link.external_type] || link.external_type}
                </Badge>
                <Text size="xs" truncate style={{ flex: 1 }}>
                  {link.title || link.external_key || link.external_id}
                </Text>
                {link.status && (
                  <Badge size="xs" variant="outline" color={
                    ['closed', 'resolved', 'merged', 'completed'].includes(link.status) ? 'green' :
                    ['open', 'triggered', 'firing'].includes(link.status) ? 'red' : 'gray'
                  }>
                    {link.status}
                  </Badge>
                )}
                {link.external_url && (
                  <Anchor href={link.external_url} target="_blank" size="xs">
                    <IconExternalLink size={14} />
                  </Anchor>
                )}
              </Group>
            ))}
          </div>
        ))}
      </Stack>
    </Paper>
  );
}
