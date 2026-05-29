import { useQuery } from '@tanstack/react-query';
import { Stack, Title, SimpleGrid, Text, Group, Badge, Paper, Progress, Table, ThemeIcon, Loader } from '@mantine/core';
import { IconTarget, IconAlertTriangle, IconCheck, IconX, IconClock, IconActivity } from '@tabler/icons-react';
import { slaApi } from '../../api/sla.api';
import dayjs from 'dayjs';

const glassStyle = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md)',
};

function StatCard({ title, value, sub, color, icon }: { title: string; value: React.ReactNode; sub?: string; color: string; icon: React.ReactNode }) {
  return (
    <Paper p="lg" radius="lg" className="hover-lift" style={glassStyle}>
      <Group justify="space-between" mb="md">
        <ThemeIcon size="xl" radius="md" variant="light" color={color}>{icon}</ThemeIcon>
      </Group>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700}>{title}</Text>
      <Text fw={800} mt={4} style={{ fontSize: '1.8rem', lineHeight: 1.1 }}>{value}</Text>
      {sub && <Text size="xs" c="dimmed" mt={4}>{sub}</Text>}
    </Paper>
  );
}

function priorityColor(p: number | null) {
  return p === 1 ? 'red' : p === 2 ? 'orange' : p === 3 ? 'yellow' : 'blue';
}

export function SlaDashboard() {
  const { data: dash, isLoading } = useQuery({ queryKey: ['sla-dashboard'], queryFn: () => slaApi.getDashboard(), refetchInterval: 30_000 });
  const { data: atRisk } = useQuery({ queryKey: ['sla-at-risk'], queryFn: slaApi.getAtRisk, refetchInterval: 30_000 });
  const { data: breached } = useQuery({ queryKey: ['sla-breached'], queryFn: slaApi.getBreached, refetchInterval: 30_000 });

  if (isLoading) {
    return (
      <Stack align="center" justify="center" py="xl">
        <Loader size="lg" />
        <Text c="dimmed">Loading SLA data...</Text>
      </Stack>
    );
  }

  const s = dash?.summary;
  const rate = s?.complianceRate ?? 100;
  const rateColor = rate >= 95 ? 'green' : rate >= 80 ? 'yellow' : 'red';

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">SLA / OLA Dashboard</Title>
        <Badge size="lg" variant="filled" color={rateColor}>{rate}% compliant</Badge>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
        <StatCard title="Compliance Rate" value={`${rate}%`} sub={`${s?.met ?? 0} met of ${(s?.met ?? 0) + (s?.breached ?? 0)} finished`} color={rateColor} icon={<IconTarget size={24} />} />
        <StatCard title="Active SLAs" value={s?.active ?? 0} sub="currently running" color="blue" icon={<IconActivity size={24} />} />
        <StatCard title="Met" value={s?.met ?? 0} sub="completed in time" color="green" icon={<IconCheck size={24} />} />
        <StatCard title="Breached" value={s?.breached ?? 0} sub="missed target" color="red" icon={<IconX size={24} />} />
      </SimpleGrid>

      {/* At-Risk */}
      <Paper p="lg" radius="lg" style={glassStyle}>
        <Group gap={8} mb="md">
          <ThemeIcon size="md" radius="md" variant="light" color="yellow"><IconAlertTriangle size={16} /></ThemeIcon>
          <Title order={4}>At-Risk</Title>
          <Badge variant="filled" color="yellow" size="sm">{atRisk?.length ?? 0}</Badge>
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Number</Table.Th><Table.Th>Description</Table.Th><Table.Th>SLA</Table.Th>
              <Table.Th>Priority</Table.Th><Table.Th>Time Left</Table.Th><Table.Th style={{ width: 160 }}>Elapsed</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(atRisk || []).map((i: any) => (
              <Table.Tr key={i.id}>
                <Table.Td><Text size="sm" fw={600} c="var(--mantine-primary-color-filled)">{i.record_number || '-'}</Text></Table.Td>
                <Table.Td><Text size="sm" lineClamp={1}>{i.record_short_description || '-'}</Text></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{i.definition_name}</Text></Table.Td>
                <Table.Td>{i.record_priority ? <Badge size="sm" variant="filled" color={priorityColor(i.record_priority)}>P{i.record_priority}</Badge> : '-'}</Table.Td>
                <Table.Td><Text size="sm" fw={600} c={i.minutes_remaining < 30 ? 'red' : 'yellow'}>{i.minutes_remaining} min</Text></Table.Td>
                <Table.Td><Progress value={i.percent_elapsed} color={i.percent_elapsed >= 90 ? 'red' : 'yellow'} size="sm" radius="xl" /></Table.Td>
              </Table.Tr>
            ))}
            {(!atRisk || atRisk.length === 0) && <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md" size="sm">No SLAs at risk. 🎉</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Breached */}
      <Paper p="lg" radius="lg" style={glassStyle}>
        <Group gap={8} mb="md">
          <ThemeIcon size="md" radius="md" variant="light" color="red"><IconX size={16} /></ThemeIcon>
          <Title order={4}>Breached</Title>
          <Badge variant="filled" color="red" size="sm">{breached?.length ?? 0}</Badge>
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Number</Table.Th><Table.Th>Description</Table.Th><Table.Th>SLA</Table.Th>
              <Table.Th>Target</Table.Th><Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(breached || []).map((i: any) => (
              <Table.Tr key={i.id}>
                <Table.Td><Text size="sm" fw={600} c="red">{i.record_number || '-'}</Text></Table.Td>
                <Table.Td><Text size="sm" lineClamp={1}>{i.record_short_description || '-'}</Text></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{i.definition_name}</Text></Table.Td>
                <Table.Td><Text size="xs" c="dimmed">{i.planned_end_time ? dayjs(i.planned_end_time).format('MMM D, HH:mm') : '-'}</Text></Table.Td>
                <Table.Td><Badge size="sm" color={i.actual_end_time ? 'gray' : 'red'} variant="light">{i.actual_end_time ? 'Resolved late' : 'Open & overdue'}</Badge></Table.Td>
              </Table.Tr>
            ))}
            {(!breached || breached.length === 0) && <Table.Tr><Table.Td colSpan={5}><Text c="dimmed" ta="center" py="md" size="sm">No breaches.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* By Definition */}
      <Paper p="lg" radius="lg" style={glassStyle}>
        <Group gap={8} mb="md">
          <ThemeIcon size="md" radius="md" variant="light" color="blue"><IconClock size={16} /></ThemeIcon>
          <Title order={4}>Compliance by SLA Definition</Title>
        </Group>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Definition</Table.Th><Table.Th>Total</Table.Th><Table.Th>Met</Table.Th>
              <Table.Th>Breached</Table.Th><Table.Th>Rate</Table.Th><Table.Th style={{ width: 200 }}>Progress</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {(dash?.byDefinition || []).map((d) => (
              <Table.Tr key={d.name}>
                <Table.Td><Text size="sm" fw={600}>{d.name}</Text></Table.Td>
                <Table.Td>{d.total}</Table.Td>
                <Table.Td><Text size="sm" c="green" fw={600}>{d.met}</Text></Table.Td>
                <Table.Td><Text size="sm" c="red" fw={600}>{d.breached}</Text></Table.Td>
                <Table.Td><Badge variant="filled" color={d.rate >= 95 ? 'green' : d.rate >= 80 ? 'yellow' : 'red'} size="sm">{d.rate}%</Badge></Table.Td>
                <Table.Td><Progress value={d.rate} color={d.rate >= 95 ? 'green' : d.rate >= 80 ? 'yellow' : 'red'} size="sm" radius="xl" /></Table.Td>
              </Table.Tr>
            ))}
            {(!dash?.byDefinition || dash.byDefinition.length === 0) && <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="md" size="sm">No SLA definitions yet.</Text></Table.Td></Table.Tr>}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}
