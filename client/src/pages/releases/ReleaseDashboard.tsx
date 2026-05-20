import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Paper, Text, Grid, Badge, TextInput, Table, Progress, RingProgress, SimpleGrid, Box } from '@mantine/core';
import { IconRocket, IconArrowBackUp, IconClock, IconCheck, IconChartBar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { releasesApi } from '../../api/releases.api';
import { StatCard } from '../../components/charts/StatCard';
import dayjs from 'dayjs';

const STATE_COLORS: Record<string, string> = {
  planning: 'gray', review: 'blue', approved: 'teal',
  in_progress: 'orange', completed: 'green', rolled_back: 'red', cancelled: 'red',
};

const TYPE_COLORS: Record<string, string> = {
  major: 'red', minor: 'blue', patch: 'green', hotfix: 'orange',
};

export function ReleaseDashboard() {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['release-metrics', startDate, endDate],
    queryFn: () => releasesApi.getMetrics(startDate || undefined, endDate || undefined),
  });

  if (isLoading || !metrics) {
    return (
      <Stack p="md">
        <Title order={2}>Release Management Dashboard</Title>
        <Text c="dimmed">Loading metrics...</Text>
      </Stack>
    );
  }

  const maxStateCount = Math.max(...(metrics.by_state?.map((s: { count: string }) => Number(s.count)) || [1]));
  const maxMonthlyCount = Math.max(...(metrics.monthly_trend?.map((m: { count: string }) => Number(m.count)) || [1]));
  const totalByType = metrics.by_type?.reduce((sum: number, t: { count: string }) => sum + Number(t.count), 0) || 1;

  return (
    <Stack p="md" gap="lg" className="fade-in">
      <Group justify="space-between" align="flex-end">
        <Group gap="sm">
          <IconRocket size={28} />
          <Title order={2} className="page-title">Release Management Dashboard</Title>
        </Group>
        <Group>
          <TextInput label="Start Date" placeholder="YYYY-MM-DD" size="xs" value={startDate} onChange={(e) => setStartDate(e.currentTarget.value)} />
          <TextInput label="End Date" placeholder="YYYY-MM-DD" size="xs" value={endDate} onChange={(e) => setEndDate(e.currentTarget.value)} />
        </Group>
      </Group>

      {/* KPI Stat Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }}>
        <StatCard icon={IconRocket} title="Total Releases" value={metrics.total} subtitle="All releases in period" color="blue" />
        <StatCard icon={IconCheck} title="Success Rate" value={`${(metrics.success_rate?.rate ?? 0).toFixed(1)}%`} subtitle={`${metrics.success_rate?.successful ?? 0} of ${metrics.success_rate?.total_finished ?? 0} finished`} color="green" />
        <StatCard icon={IconArrowBackUp} title="Rolled Back" value={metrics.success_rate?.rolled_back ?? 0} subtitle="Releases that were rolled back" color="red" />
        <StatCard icon={IconClock} title="Avg Deployment" value={`${(metrics.avg_deployment_hours ?? 0).toFixed(1)}h`} subtitle="Average hours to deploy" color="indigo" />
      </SimpleGrid>

      <Grid>
        {/* Releases by State */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder className="glass-panel hover-glow">
            <div className="section-header">Releases by State</div>
            <Stack gap="xs">
              {metrics.by_state?.map((item: { state: string; count: string }) => (
                <div key={item.state}>
                  <Group justify="space-between" mb={4}>
                    <Text size="sm" tt="capitalize">{item.state.replace(/_/g, ' ')}</Text>
                    <Text size="sm" fw={500}>{item.count}</Text>
                  </Group>
                  <Progress value={(Number(item.count) / maxStateCount) * 100} color={STATE_COLORS[item.state] || 'gray'} size="lg" radius="sm" />
                </div>
              ))}
            </Stack>
          </Paper>
        </Grid.Col>

        {/* Releases by Type */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder className="glass-panel hover-glow">
            <div className="section-header">Releases by Type</div>
            <Group justify="center" mb="md">
              <RingProgress
                size={180} thickness={24} roundCaps
                sections={
                  metrics.by_type?.map((item: { release_type: string; count: string }) => ({
                    value: (Number(item.count) / totalByType) * 100,
                    color: TYPE_COLORS[item.release_type] || 'gray',
                    tooltip: `${item.release_type}: ${item.count}`,
                  })) || []
                }
                label={<Text ta="center" size="lg" fw={700}>{metrics.total}<Text size="xs" c="dimmed">total</Text></Text>}
              />
            </Group>
            <Group justify="center" gap="lg">
              {metrics.by_type?.map((item: { release_type: string; count: string }) => (
                <Group key={item.release_type} gap={6}>
                  <Box w={12} h={12} style={{ borderRadius: 3, backgroundColor: `var(--mantine-color-${TYPE_COLORS[item.release_type] || 'gray'}-6)` }} />
                  <Text size="sm" tt="capitalize">{item.release_type}: {item.count}</Text>
                </Group>
              ))}
            </Group>
          </Paper>
        </Grid.Col>

        {/* Success Rate Donut */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder className="glass-panel hover-glow">
            <div className="section-header">Success Rate</div>
            <Group justify="center">
              <RingProgress
                size={200} thickness={20} roundCaps
                sections={[
                  { value: metrics.success_rate?.rate ?? 0, color: 'green' },
                  { value: 100 - (metrics.success_rate?.rate ?? 0), color: 'red' },
                ]}
                label={<Text ta="center" size="xl" fw={700}>{(metrics.success_rate?.rate ?? 0).toFixed(1)}%<Text size="xs" c="dimmed">success</Text></Text>}
              />
            </Group>
            <Group justify="center" gap="xl" mt="md">
              <Group gap={6}>
                <Box w={12} h={12} style={{ borderRadius: 3, backgroundColor: 'var(--mantine-color-green-6)' }} />
                <Text size="sm">Completed: {metrics.success_rate?.successful ?? 0}</Text>
              </Group>
              <Group gap={6}>
                <Box w={12} h={12} style={{ borderRadius: 3, backgroundColor: 'var(--mantine-color-red-6)' }} />
                <Text size="sm">Rolled Back: {metrics.success_rate?.rolled_back ?? 0}</Text>
              </Group>
            </Group>
          </Paper>
        </Grid.Col>

        {/* Monthly Trend */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper p="md" radius="md" withBorder className="glass-panel hover-glow">
            <div className="section-header">Monthly Trend</div>
            <Group align="flex-end" gap={4} h={160} wrap="nowrap" style={{ overflowX: 'auto' }}>
              {metrics.monthly_trend?.map((item: { month: string; count: string }) => {
                const height = maxMonthlyCount > 0 ? (Number(item.count) / maxMonthlyCount) * 140 : 0;
                return (
                  <Stack key={item.month} align="center" gap={4} style={{ flex: '1 0 40px', minWidth: 40 }}>
                    <Text size="xs" fw={500}>{item.count}</Text>
                    <Box w="70%" h={height} style={{ borderRadius: '4px 4px 0 0', backgroundColor: 'var(--mantine-color-blue-6)', minHeight: 4 }} />
                    <Text size="xs" c="dimmed">{dayjs(item.month).format('MMM')}</Text>
                  </Stack>
                );
              })}
            </Group>
          </Paper>
        </Grid.Col>

        {/* Recent Active Releases */}
        <Grid.Col span={12}>
          <Paper p="md" radius="md" withBorder className="glass-panel hover-glow">
            <div className="section-header">Recent Active Releases</div>
            <Table striped highlightOnHover className="glass-table">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Number</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Type</Table.Th>
                  <Table.Th>Risk</Table.Th>
                  <Table.Th>State</Table.Th>
                  <Table.Th>Risk Score</Table.Th>
                  <Table.Th>Scheduled Start</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {metrics.recent_active?.map((rel: any) => (
                  <Table.Tr key={rel.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/releases/${rel.id}`)}>
                    <Table.Td><Text size="sm" fw={500} c="blue">{rel.number}</Text></Table.Td>
                    <Table.Td><Text size="sm" lineClamp={1}>{rel.short_description}</Text></Table.Td>
                    <Table.Td><Badge color={TYPE_COLORS[rel.release_type] || 'gray'} variant="light" size="sm">{rel.release_type}</Badge></Table.Td>
                    <Table.Td><Badge color={rel.risk === 'high' ? 'red' : rel.risk === 'moderate' ? 'yellow' : 'green'} variant="light" size="sm">{rel.risk}</Badge></Table.Td>
                    <Table.Td><Badge color={STATE_COLORS[rel.state] || 'gray'} variant="dot" size="sm">{rel.state.replace(/_/g, ' ')}</Badge></Table.Td>
                    <Table.Td><Text size="sm" fw={500} c={rel.risk_score > 70 ? 'red' : rel.risk_score > 40 ? 'orange' : 'green'}>{rel.risk_score}</Text></Table.Td>
                    <Table.Td><Text size="sm" c="dimmed">{rel.scheduled_start ? dayjs(rel.scheduled_start).format('MMM D, YYYY HH:mm') : '\u2014'}</Text></Table.Td>
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
