import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Paper, Text, Group, Stack, Badge, Box, LoadingOverlay, Collapse, UnstyledButton, Tooltip } from '@mantine/core';
import { IconBolt, IconChevronDown, IconChevronRight, IconClock } from '@tabler/icons-react';
import { workflowsApi } from '../../api/common.api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface Props {
  tableName: string;
  recordId: string;
}

const STATUS_COLORS: Record<string, string> = {
  success: 'green',
  error: 'red',
  running: 'blue',
  waiting_for_approval: 'yellow',
  waiting_for_form: 'yellow',
  delayed: 'orange',
};

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function ExecutionRow({ execution }: { execution: any }) {
  const [expanded, setExpanded] = useState(false);

  const { data: actionLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['workflow-action-logs', execution.id],
    queryFn: () => workflowsApi.getActionLogs(execution.id),
    enabled: expanded,
  });

  const logs = Array.isArray(actionLogs) ? actionLogs : [];

  return (
    <Box>
      <UnstyledButton onClick={() => setExpanded(!expanded)} w="100%" py={6}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
            {expanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
            <Text size="sm" fw={600} truncate>{execution.rule_name}</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <Badge size="xs" color={STATUS_COLORS[execution.status] || 'gray'} variant="light">
              {execution.status.replace(/_/g, ' ')}
            </Badge>
            <Tooltip label={dayjs(execution.created_at).format('MMM D, YYYY HH:mm:ss')}>
              <Text size="xs" c="dimmed" style={{ whiteSpace: 'nowrap' }}>
                {dayjs(execution.created_at).fromNow()}
              </Text>
            </Tooltip>
          </Group>
        </Group>
        <Group gap="xs" ml={22} mt={2}>
          <Badge size="xs" variant="outline" color="gray">{execution.trigger_type || 'event'}</Badge>
          {execution.duration_ms != null && (
            <Group gap={2}>
              <IconClock size={10} style={{ opacity: 0.5 }} />
              <Text size="xs" c="dimmed">{formatDuration(execution.duration_ms)}</Text>
            </Group>
          )}
        </Group>
      </UnstyledButton>
      <Collapse in={expanded}>
        <Box ml={22} mb="xs" pl="xs" style={{ borderLeft: '2px solid var(--mantine-color-gray-3)' }}>
          {logsLoading && <LoadingOverlay visible loaderProps={{ size: 'xs' }} />}
          {logs.length === 0 && !logsLoading && (
            <Text size="xs" c="dimmed" py="xs">No action logs</Text>
          )}
          {logs.map((log: any, i: number) => (
            <Group key={log.id || i} gap="xs" py={3} wrap="nowrap">
              <Badge size="xs" color={log.status === 'success' ? 'green' : log.status === 'error' ? 'red' : 'gray'} variant="dot" style={{ flexShrink: 0 }}>
                {log.action_type}
              </Badge>
              {log.error_message && <Text size="xs" c="red" truncate>{log.error_message}</Text>}
              {log.duration_ms != null && <Text size="xs" c="dimmed">{formatDuration(log.duration_ms)}</Text>}
            </Group>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

export function WorkflowActivity({ tableName, recordId }: Props) {
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['workflow-record-executions', tableName, recordId],
    queryFn: () => workflowsApi.getRecordExecutions(tableName, recordId),
  });

  const list = Array.isArray(executions) ? executions : [];
  const activeCount = list.filter((e: any) => ['running', 'waiting_for_approval', 'waiting_for_form', 'delayed'].includes(e.status)).length;

  return (
    <Paper withBorder p="md">
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <IconBolt size={16} />
          <Text fw={600} size="sm">Workflow Activity</Text>
        </Group>
        {activeCount > 0 && (
          <Badge size="sm" color="blue" variant="light">{activeCount} active</Badge>
        )}
      </Group>

      <Box pos="relative" mih={40}>
        <LoadingOverlay visible={isLoading} loaderProps={{ size: 'sm' }} />
        {list.length === 0 && !isLoading ? (
          <Text c="dimmed" size="sm" ta="center" py="md">No automations have run on this record yet</Text>
        ) : (
          <Stack gap={0}>
            {list.map((exec: any) => (
              <ExecutionRow key={exec.id} execution={exec} />
            ))}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}
