import { useQuery } from '@tanstack/react-query';
import { Grid, Title, Text, Paper, Stack, Group, Table, Badge, SimpleGrid, LoadingOverlay, Box } from '@mantine/core';
import { IconAlertTriangle, IconExchange, IconShoppingCart, IconBook, IconAlertOctagon, IconClock, IconBug, IconServer } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { dashboardApi } from '../api/common.api';
import { StatCard } from '../components/charts/StatCard';
import { StateIndicator } from '../components/common/StateIndicator';
import { PriorityBadge } from '../components/common/PriorityBadge';
import { PRIORITY_LABELS } from '@shared/constants';

const CHART_COLORS = ['#228be6', '#40c057', '#fab005', '#fa5252', '#7950f2', '#15aabf', '#868e96', '#e64980'];

export function Dashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
  });
  const { data: myWork, isLoading: workLoading } = useQuery({
    queryKey: ['dashboard-my-work'],
    queryFn: dashboardApi.getMyWork,
  });

  const priorityData = stats ? Object.entries(stats.incidents.by_priority).map(([k, v]) => ({
    name: `P${k} ${PRIORITY_LABELS[Number(k)] || ''}`,
    count: v,
  })) : [];

  const changeStateData = stats ? Object.entries(stats.changes.by_state).map(([k, v], i) => ({
    name: k.replace(/_/g, ' '),
    value: v,
    color: CHART_COLORS[i % CHART_COLORS.length],
  })) : [];

  return (
    <Stack>
      <Title order={2}>Dashboard</Title>

      <Box pos="relative">
        <LoadingOverlay visible={statsLoading} />
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
          <StatCard title="Open Incidents" value={stats?.incidents.open ?? 0} subtitle={`${stats?.incidents.critical ?? 0} critical`} icon={IconAlertTriangle} color="red" />
          <StatCard title="Open Changes" value={stats?.changes.open ?? 0} subtitle={`${stats?.changes.pending_approval ?? 0} pending approval`} icon={IconExchange} color="blue" />
          <StatCard title="Catalog Requests" value={stats?.catalog.total_requests ?? 0} subtitle={`${stats?.catalog.pending ?? 0} pending`} icon={IconShoppingCart} color="green" />
          <StatCard title="KB Articles" value={stats?.knowledge.published ?? 0} subtitle={`${stats?.knowledge.total_articles ?? 0} total`} icon={IconBook} color="violet" />
          <StatCard title="Open Problems" value={stats?.problems?.open ?? 0} subtitle={`${stats?.problems?.total ?? 0} total`} icon={IconBug} color="orange" />
          <StatCard title="Active CIs" value={stats?.cmdb?.active ?? 0} subtitle={`${stats?.cmdb?.total ?? 0} total`} icon={IconServer} color="teal" />
        </SimpleGrid>
      </Box>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md">
            <Text fw={600} mb="md">Incidents by Priority</Text>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData}>
                <XAxis dataKey="name" fontSize={12} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#228be6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md">
            <Text fw={600} mb="md">Changes by State</Text>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={changeStateData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {changeStateData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid.Col>
      </Grid>

      <Grid>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={workLoading} />
            <Text fw={600} mb="md">My Incidents</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Number</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>Priority</Table.Th>
                  <Table.Th>State</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(myWork?.incidents || []).map((inc: any) => (
                  <Table.Tr key={inc.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/incidents/${inc.id}`)}>
                    <Table.Td><Text size="sm" fw={500} c="blue">{inc.number}</Text></Table.Td>
                    <Table.Td><Text size="sm" lineClamp={1}>{inc.short_description}</Text></Table.Td>
                    <Table.Td><PriorityBadge priority={inc.priority} /></Table.Td>
                    <Table.Td><StateIndicator state={inc.state} /></Table.Td>
                  </Table.Tr>
                ))}
                {(!myWork?.incidents || myWork.incidents.length === 0) && (
                  <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" size="sm">No assigned incidents</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Paper withBorder p="md" pos="relative">
            <LoadingOverlay visible={workLoading} />
            <Text fw={600} mb="md">My Changes</Text>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Number</Table.Th>
                  <Table.Th>Description</Table.Th>
                  <Table.Th>State</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {(myWork?.changes || []).map((chg: any) => (
                  <Table.Tr key={chg.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/changes/${chg.id}`)}>
                    <Table.Td><Text size="sm" fw={500} c="blue">{chg.number}</Text></Table.Td>
                    <Table.Td><Text size="sm" lineClamp={1}>{chg.short_description}</Text></Table.Td>
                    <Table.Td><StateIndicator state={chg.state} /></Table.Td>
                  </Table.Tr>
                ))}
                {(!myWork?.changes || myWork.changes.length === 0) && (
                  <Table.Tr><Table.Td colSpan={3}><Text c="dimmed" ta="center" size="sm">No assigned changes</Text></Table.Td></Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Paper>
        </Grid.Col>
      </Grid>

      <Paper withBorder p="md" pos="relative">
        <LoadingOverlay visible={workLoading} />
        <Text fw={600} mb="md">My Problems</Text>
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Number</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Priority</Table.Th>
              <Table.Th>State</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(myWork?.problems || []).map((prb: any) => (
              <Table.Tr key={prb.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/problems/${prb.id}`)}>
                <Table.Td><Text size="sm" fw={500} c="blue">{prb.number}</Text></Table.Td>
                <Table.Td><Text size="sm" lineClamp={1}>{prb.short_description}</Text></Table.Td>
                <Table.Td><PriorityBadge priority={prb.priority} /></Table.Td>
                <Table.Td><StateIndicator state={prb.state} /></Table.Td>
              </Table.Tr>
            ))}
            {(!myWork?.problems || myWork.problems.length === 0) && (
              <Table.Tr><Table.Td colSpan={4}><Text c="dimmed" ta="center" size="sm">No assigned problems</Text></Table.Td></Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
