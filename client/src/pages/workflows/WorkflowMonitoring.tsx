import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, Group, Paper, Text, Table, Badge, Button, Loader,
  SimpleGrid, Modal, ScrollArea, Code,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconRefresh, IconPlayerPlay, IconAlertTriangle, IconCheck,
  IconClock, IconChartBar, IconEye,
} from '@tabler/icons-react';
import { workflowsApi } from '../../api/common.api';

function StatCard({ title, value, icon: Icon, color }: {
  title: string; value: string | number; icon: any; color: string;
}) {
  return (
    <Paper p="md" withBorder radius="md" className="glass-panel">
      <Group gap="sm">
        <Icon size={28} color={`var(--mantine-color-${color}-6)`} />
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
          <Text size="xl" fw={700}>{value}</Text>
        </div>
      </Group>
    </Paper>
  );
}

export function WorkflowMonitoring() {
  const queryClient = useQueryClient();
  const [actionLogsModal, setActionLogsModal] = useState<string | null>(null);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['workflow-monitoring-stats'],
    queryFn: () => workflowsApi.getMonitoringStats(),
    refetchInterval: 30000,
  });

  const { data: actionLogs } = useQuery({
    queryKey: ['workflow-action-logs', actionLogsModal],
    queryFn: () => workflowsApi.getActionLogs(actionLogsModal!),
    enabled: !!actionLogsModal,
  });

  const retryMutation = useMutation({
    mutationFn: (executionId: string) => workflowsApi.retryExecution(executionId),
    onSuccess: () => {
      notifications.show({ title: 'Retry Started', message: 'Workflow execution has been retried', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['workflow-monitoring-stats'] });
    },
    onError: (err: any) => {
      notifications.show({ title: 'Retry Failed', message: err.response?.data?.error || err.message, color: 'red' });
    },
  });

  if (isLoading) {
    return (
      <Stack align="center" justify="center" style={{ height: '60vh' }}>
        <Loader size="lg" />
        <Text>Loading monitoring data...</Text>
      </Stack>
    );
  }

  const s = stats || { total: 0, success: 0, errors: 0, waiting: 0, running: 0, avg_duration_ms: 0, recent_errors: [], per_workflow: [] };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <Title order={2}>Workflow Monitoring</Title>
        <Button variant="light" leftSection={<IconRefresh size={16} />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['workflow-monitoring-stats'] })}>
          Refresh
        </Button>
      </Group>

      {/* ── Stats Cards ── */}
      <SimpleGrid cols={{ base: 2, sm: 3, md: 5 }} spacing="md">
        <StatCard title="Total Executions" value={s.total} icon={IconChartBar} color="blue" />
        <StatCard title="Successful" value={s.success} icon={IconCheck} color="green" />
        <StatCard title="Errors" value={s.errors} icon={IconAlertTriangle} color="red" />
        <StatCard title="Waiting" value={s.waiting} icon={IconClock} color="orange" />
        <StatCard title="Avg Duration" value={`${s.avg_duration_ms}ms`} icon={IconPlayerPlay} color="violet" />
      </SimpleGrid>

      {/* ── Per-Workflow Stats ── */}
      <Paper p="md" withBorder radius="md" className="glass-panel">
        <Text size="sm" fw={700} mb="sm">Per-Workflow Analytics</Text>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Workflow</Table.Th>
                <Table.Th>Total Executions</Table.Th>
                <Table.Th>Errors</Table.Th>
                <Table.Th>Error Rate</Table.Th>
                <Table.Th>Avg Duration</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(s.per_workflow || []).map((pw: any) => {
                const total = Number(pw.total_executions) || 0;
                const errors = Number(pw.error_count) || 0;
                const errorRate = total > 0 ? ((errors / total) * 100).toFixed(1) : '0.0';
                return (
                  <Table.Tr key={pw.id}>
                    <Table.Td><Text size="sm" fw={500}>{pw.name}</Text></Table.Td>
                    <Table.Td>{total}</Table.Td>
                    <Table.Td>
                      <Badge color={errors > 0 ? 'red' : 'green'} variant="light" size="sm">{errors}</Badge>
                    </Table.Td>
                    <Table.Td>{errorRate}%</Table.Td>
                    <Table.Td>{Math.round(Number(pw.avg_duration_ms) || 0)}ms</Table.Td>
                  </Table.Tr>
                );
              })}
              {(!s.per_workflow || s.per_workflow.length === 0) && (
                <Table.Tr><Table.Td colSpan={5}><Text size="sm" c="dimmed" ta="center">No data yet</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* ── Recent Errors ── */}
      <Paper p="md" withBorder radius="md" className="glass-panel">
        <Text size="sm" fw={700} mb="sm">Recent Errors</Text>
        <ScrollArea>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Workflow</Table.Th>
                <Table.Th>Table</Table.Th>
                <Table.Th>Record ID</Table.Th>
                <Table.Th>Error</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Time</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(s.recent_errors || []).map((err: any) => (
                <Table.Tr key={err.id}>
                  <Table.Td><Text size="sm" fw={500}>{err.rule_name}</Text></Table.Td>
                  <Table.Td><Badge variant="light" size="xs">{err.table_name}</Badge></Table.Td>
                  <Table.Td><Code style={{ fontSize: 11 }}>{err.record_id?.substring(0, 8)}</Code></Table.Td>
                  <Table.Td><Text size="xs" c="red" lineClamp={2}>{err.error}</Text></Table.Td>
                  <Table.Td>{err.duration_ms || '-'}ms</Table.Td>
                  <Table.Td><Text size="xs" c="dimmed">{new Date(err.created_at).toLocaleString()}</Text></Table.Td>
                  <Table.Td>
                    <Group gap={4}>
                      <Button size="compact-xs" variant="light" color="blue"
                        leftSection={<IconEye size={12} />}
                        onClick={() => setActionLogsModal(err.id)}>
                        Logs
                      </Button>
                      <Button size="compact-xs" variant="light" color="orange"
                        leftSection={<IconRefresh size={12} />}
                        onClick={() => retryMutation.mutate(err.id)}
                        loading={retryMutation.isPending}>
                        Retry
                      </Button>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {(!s.recent_errors || s.recent_errors.length === 0) && (
                <Table.Tr><Table.Td colSpan={7}><Text size="sm" c="dimmed" ta="center">No errors</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Paper>

      {/* ── Action Logs Modal ── */}
      <Modal opened={!!actionLogsModal} onClose={() => setActionLogsModal(null)}
        title="Action Execution Logs" size="lg">
        <ScrollArea>
          <Table striped>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>#</Table.Th>
                <Table.Th>Action Type</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Duration</Table.Th>
                <Table.Th>Error</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {(actionLogs || []).map((log: any) => (
                <Table.Tr key={log.id}>
                  <Table.Td>{log.action_index}</Table.Td>
                  <Table.Td><Badge variant="light" size="sm">{log.action_type}</Badge></Table.Td>
                  <Table.Td>
                    <Badge color={log.status === 'success' ? 'green' : log.status === 'error' ? 'red' : 'gray'}
                      variant="light" size="sm">{log.status}</Badge>
                  </Table.Td>
                  <Table.Td>{log.duration_ms}ms</Table.Td>
                  <Table.Td><Text size="xs" c="red" lineClamp={2}>{log.error || '-'}</Text></Table.Td>
                </Table.Tr>
              ))}
              {(!actionLogs || actionLogs.length === 0) && (
                <Table.Tr><Table.Td colSpan={5}><Text size="sm" c="dimmed" ta="center">No action logs</Text></Table.Td></Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </ScrollArea>
      </Modal>
    </Stack>
  );
}
