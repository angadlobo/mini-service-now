import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Paper, Text, Grid, Badge, TextInput, Table, Progress, RingProgress, SimpleGrid, Box, ThemeIcon } from '@mantine/core';
import { IconChartBar, IconTrendingUp, IconAlertTriangle, IconClock, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { changesApi } from '../../api/changes.api';
import dayjs from 'dayjs';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description?: string;
  color?: string;
}

function StatCard({ icon, label, value, description, color = 'blue' }: StatCardProps) {
  return (
    <Paper p="md" radius="md" withBorder>
      <Group>
        <ThemeIcon size="lg" radius="md" variant="light" color={color}>
          {icon}
        </ThemeIcon>
        <div style={{ flex: 1 }}>
          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
            {label}
          </Text>
          <Text size="xl" fw={700}>
            {value}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </div>
      </Group>
    </Paper>
  );
}

const STATE_COLORS: Record<string, string> = {
  draft: 'gray',
  submitted: 'blue',
  assessment: 'indigo',
  approved: 'teal',
  scheduled: 'cyan',
  implementing: 'orange',
  completed: 'green',
  cancelled: 'red',
  failed: 'red',
};

const TYPE_COLORS: Record<string, string> = {
  normal: 'blue',
  standard: 'green',
  emergency: 'red',
  expedited: 'orange',
};

const RISK_COLORS: Record<string, string> = {
  low: 'green',
  moderate: 'yellow',
  high: 'orange',
  critical: 'red',
};

export function ChangeDashboard() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['change-metrics', startDate, endDate],
    queryFn: () => changesApi.getMetrics(startDate || undefined, endDate || undefined),
  });

  if (isLoading || !metrics) {
    return (
      <Stack p="md">
        <Title order={2}>Change Management Dashboard</Title>
        <Text c="dimmed">Loading metrics...</Text>
      </Stack>
    );
  }

  const maxStateCount = Math.max(...(metrics.by_state?.map((s: { count: string }) => Number(s.count)) || [1]));
  const maxMonthlyCount = Math.max(...(metrics.monthly_trend?.map((m: { count: string }) => Number(m.count)) || [1]));
  const totalByType = metrics.by_type?.reduce((sum: number, t: { count: string }) => sum + Number(t.count), 0) || 1;

  return (
    <Stack p="md" gap="lg">
      <Group justify="space-between" align="flex-end">
        <Title order={2}>Change Management Dashboard</Title>
        <Group>
          <TextInput
            label="Start Date"
            placeholder="YYYY-MM-DD"
            size="xs"
            value={startDate}
            onChange={(e) => setStartDate(e.currentTarget.value)}
          />
          <TextInput
            label="End Date"
            placeholder="YYYY-MM-DD"
            size="xs"
            value={endDate}
            onChange={(e) => setEndDate(e.currentTarget.value)}
          />
        </Group>
      </Group>

      {/* KPI Stat Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 3, lg: 5 }}>
        <StatCard
          icon={<IconChartBar size={20} />}
          label="Total Changes"
          value={metrics.total}
          description="All changes in period"
          color="blue"
        />
        <StatCard
          icon={<IconCheck size={20} />}
          label="Success Rate"
          value={`${(metrics.success_rate?.rate ?? 0).toFixed(1)}%`}
          description={`${metrics.success_rate?.successful ?? 0} of ${metrics.success_rate?.total_closed ?? 0} closed`}
          color="green"
        />
        <StatCard
          icon={<IconTrendingUp size={20} />}
          label="Avg Risk Score"
          value={(metrics.avg_risk_score ?? 0).toFixed(1)}
          description="Across all changes"
          color="yellow"
        />
        <StatCard
          icon={<IconAlertTriangle size={20} />}
          label="Emergency Changes"
          value={metrics.emergency_count ?? 0}
          description="Requires expedited review"
          color="red"
        />
        <StatCard
          icon={<IconClock size={20} />}
          label="Avg Implementation"
          value={`${(metrics.avg_implementation_hours ?? 0).toFixed(1)}h`}
          description="Average hours to implement"
          color="indigo"
        />
      </SimpleGrid>

      <Grid>
        {/* Changes by State */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Changes by State</Text>
            <Stack gap="xs">
              {metrics.by_state?.map((item: { state: string; count: string }) => (
                <div key={item.state}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" tt="capitalize">{item.state}</Text>
                    <Text size="sm" fw={500}>{item.count}</Text>
                  </Group>
                  <Progress
                    value={(Number(item.count) / maxStateCount) * 100}
                    color={STATE_COLORS[item.state] || 'gray'}
                    size="lg"
                    radius="sm"
                  />
                </div>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Changes by Type (donut-like segments) */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Changes by Type</Text>
            <Group justify="center" mb="md">
              <RingProgress
                size={180}
                thickness={24}
                roundCaps
                sections={
                  metrics.by_type?.map((item: { type: string; count: string }) => ({
                    value: (Number(item.count) / totalByType) * 100,
                    color: TYPE_COLORS[item.type] || 'gray',
                    tooltip: `${item.type}: ${item.count}`,
                  })) || []
                }
                label={
                  <Text ta="center" size="lg" fw={700}>
                    {metrics.total}
                    <Text size="xs" c="dimmed">total</Text>
                  </Text>
                }
              />
            </Group>
            <Group justify="center" gap="lg">
              {metrics.by_type?.map((item: { type: string; count: string }) => (
                <Group key={item.type} gap={6}>
                  <Box
                    w={12}
                    h={12}
                    style={{ borderRadius: 3, backgroundColor: `var(--mantine-color-${TYPE_COLORS[item.type] || 'gray'}-6)` }}
                  />
                  <Text size="sm" tt="capitalize">{item.type}: {item.count}</Text>
                </Group>
              ))}
            </Group>
          </Paper>
        </Grid.Col>

        {/* Changes by Risk */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Changes by Risk Level</Text>
            <Stack gap="sm">
              {metrics.by_risk?.map((item: { risk: string; count: string }) => (
                <div key={item.risk}>
                  <Group justify="space-between" mb={4}>
                    <Badge color={RISK_COLORS[item.risk] || 'gray'} variant="light" size="sm">
                      {item.risk}
                    </Badge>
                    <Text size="sm" fw={500}>{item.count}</Text>
                  </Group>
                  <Progress
                    value={(Number(item.count) / maxStateCount) * 100}
                    color={RISK_COLORS[item.risk] || 'gray'}
                    size="md"
                    radius="sm"
                  />
                </div>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Success Rate Donut */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Success Rate</Text>
            <Group justify="center">
              <RingProgress
                size={200}
                thickness={20}
                roundCaps
                sections={[
                  { value: metrics.success_rate?.rate ?? 0, color: 'green' },
                  { value: 100 - (metrics.success_rate?.rate ?? 0), color: 'red' },
                ]}
                label={
                  <Text ta="center" size="xl" fw={700}>
                    {(metrics.success_rate?.rate ?? 0).toFixed(1)}%
                    <Text size="xs" c="dimmed">success</Text>
                  </Text>
                }
              />
            </Group>
            <Group justify="center" gap="xl" mt="md">
              <Group gap={6}>
                <Box w={12} h={12} style={{ borderRadius: 3, backgroundColor: 'var(--mantine-color-green-6)' }} />
                <Text size="sm">Successful: {metrics.success_rate?.successful ?? 0}</Text>
              </Group>
              <Group gap={6}>
                <Box w={12} h={12} style={{ borderRadius: 3, backgroundColor: 'var(--mantine-color-red-6)' }} />
                <Text size="sm">Unsuccessful: {metrics.success_rate?.unsuccessful ?? 0}</Text>
              </Group>
            </Group>
          </Paper>
        </Grid.Col>

        {/* Monthly Trend */}
        <Grid.Col span={12}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Monthly Trend</Text>
            <Group align="flex-end" gap={4} h={160} wrap="nowrap" style={{ overflowX: 'auto' }}>
              {metrics.monthly_trend?.map((item: { month: string; count: string }) => {
                const height = maxMonthlyCount > 0 ? (Number(item.count) / maxMonthlyCount) * 140 : 0;
                return (
                  <Stack key={item.month} align="center" gap={4} style={{ flex: '1 0 40px', minWidth: 40 }}>
                    <Text size="xs" fw={500}>{item.count}</Text>
                    <Box
                      w="70%"
                      h={height}
                      style={{
                        borderRadius: '4px 4px 0 0',
                        backgroundColor: 'var(--mantine-color-blue-6)',
                        minHeight: 4,
                      }}
                    />
                    <Text size="xs" c="dimmed">
                      {dayjs(item.month).format('MMM')}
                    </Text>
                  </Stack>
                );
              })}
            </Group>
          </Paper>
        </Grid.Col>

        {/* Recent Active Changes */}
        <Grid.Col span={12}>
          <Paper p="md" radius="md" withBorder>
            <Text fw={600} mb="md">Recent Active Changes</Text>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Number</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Risk</Table.Th>
                  <Table.Th>State</Table.Th>
                  <Table.Th>Risk Score</Table.Th>
                  <Table.Th>Planned Start</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {metrics.recent_active?.map((change: {
                  id: string;
                  number: string;
                  short_description: string;
                  type: string;
                  risk: string;
                  state: string;
                  risk_score: number;
                  planned_start: string;
                }) => (
                  <Table.Tr
                    key={change.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/changes/${change.id}`)}
                  >
                    <Table.Td>
                      <Text size="sm" fw={500} c="blue">
                        {change.number}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" lineClamp={1}>{change.short_description}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={TYPE_COLORS[change.type] || 'gray'} variant="light" size="sm">
                        {change.type}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={RISK_COLORS[change.risk] || 'gray'} variant="light" size="sm">
                        {change.risk}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Badge color={STATE_COLORS[change.state] || 'gray'} variant="dot" size="sm">
                        {change.state}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={500} c={change.risk_score > 70 ? 'red' : change.risk_score > 40 ? 'orange' : 'green'}>
                        {change.risk_score}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {change.planned_start ? dayjs(change.planned_start).format('MMM D, YYYY HH:mm') : '—'}
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
