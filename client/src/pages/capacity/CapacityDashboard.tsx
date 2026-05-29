import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, SimpleGrid, Paper, Text, Progress, Badge, NumberFormatter } from '@mantine/core';
import { IconPlus, IconTargetArrow } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { resourcePoolsApi } from '../../api/capacity.api';

function PoolCard({ pool }: { pool: any }) {
  const used = pool.allocated_hours || 0;
  const total = pool.total_capacity_hours || 0;
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 90 ? 'red' : pct >= 70 ? 'yellow' : 'teal';

  return (
    <Paper p="md" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={600} size="sm">{pool.name}</Text>
        <Badge size="sm" variant="light" color="blue" tt="capitalize">{pool.type || 'team'}</Badge>
      </Group>
      <Text size="xs" c="dimmed" mb="xs">{pool.period ? `Per ${pool.period}` : 'Ongoing'}</Text>
      <Progress value={pct} color={color} size="md" mb="xs" />
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          <NumberFormatter value={used} /> / <NumberFormatter value={total} /> hrs
        </Text>
        <Text size="xs" fw={600} c={color}>{pct}% used</Text>
      </Group>
    </Paper>
  );
}

export function CapacityDashboard() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['capacity-pools'],
    queryFn: () => resourcePoolsApi.list({ pageSize: 100 }),
  });

  const pools = data?.data || [];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Capacity Planning</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/capacity/pools/new')} className="gradient-btn">
          New Resource Pool
        </Button>
      </Group>

      {isLoading ? (
        <Text c="dimmed">Loading resource pools...</Text>
      ) : pools.length === 0 ? (
        <Paper p="xl" radius="md" withBorder ta="center">
          <IconTargetArrow size={48} style={{ opacity: 0.3 }} />
          <Text mt="md" c="dimmed">No resource pools defined yet.</Text>
          <Button mt="md" variant="light" onClick={() => navigate('/capacity/pools/new')}>
            Create First Pool
          </Button>
        </Paper>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }}>
          {pools.map((pool: any) => <PoolCard key={pool.id} pool={pool} />)}
        </SimpleGrid>
      )}
    </Stack>
  );
}
