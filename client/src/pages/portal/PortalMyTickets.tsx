import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Tabs, Text, Badge, Box, LoadingOverlay } from '@mantine/core';
import { IconArrowLeft, IconBug, IconShoppingCart } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { portalApi } from '../../api/portal.api';
import { DataTable } from '../../components/common/DataTable';
import { StateIndicator } from '../../components/common/StateIndicator';
import dayjs from 'dayjs';

export function PortalMyTickets() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['portal-my-tickets'],
    queryFn: portalApi.getMyTickets,
  });

  const incidents = data?.incidents || [];
  const requests = data?.requests || [];

  const incidentColumns = [
    {
      key: 'number',
      label: 'Number',
      width: 110,
      render: (r: any) => (
        <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>
          {r.number}
        </span>
      ),
    },
    { key: 'short_description', label: 'Description' },
    {
      key: 'state',
      label: 'State',
      width: 120,
      render: (r: any) => <StateIndicator state={r.state} />,
    },
    {
      key: 'priority',
      label: 'Priority',
      width: 90,
      render: (r: any) => {
        const colors: Record<number, string> = { 1: 'red', 2: 'orange', 3: 'yellow', 4: 'blue', 5: 'gray' };
        const labels: Record<number, string> = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5' };
        return <Badge color={colors[r.priority] || 'gray'} variant="light" size="sm">{labels[r.priority] || `P${r.priority}`}</Badge>;
      },
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 130,
      render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY'),
    },
  ];

  const requestColumns = [
    {
      key: 'number',
      label: 'Number',
      width: 110,
      render: (r: any) => (
        <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>
          {r.number}
        </span>
      ),
    },
    {
      key: 'item_name',
      label: 'Item',
      render: (r: any) => r.item_name || r.short_description || '-',
    },
    {
      key: 'state',
      label: 'State',
      width: 120,
      render: (r: any) => <StateIndicator state={r.state} />,
    },
    {
      key: 'created_at',
      label: 'Created',
      width: 130,
      render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY'),
    },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Group>
          <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/portal')}>
            Back to Portal
          </Button>
          <Title order={2} className="page-title">My Tickets</Title>
        </Group>
        <Button leftSection={<IconBug size={16} />} onClick={() => navigate('/portal/submit-incident')} className="gradient-btn">
          Report an Issue
        </Button>
      </Group>

      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={isLoading} />

        <Tabs defaultValue="incidents">
          <Tabs.List>
            <Tabs.Tab value="incidents" leftSection={<IconBug size={16} />}>
              Incidents
              {incidents.length > 0 && (
                <Badge size="xs" variant="light" ml={6}>{incidents.length}</Badge>
              )}
            </Tabs.Tab>
            <Tabs.Tab value="requests" leftSection={<IconShoppingCart size={16} />}>
              Catalog Requests
              {requests.length > 0 && (
                <Badge size="xs" variant="light" ml={6}>{requests.length}</Badge>
              )}
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="incidents" pt="md">
            <DataTable
              columns={incidentColumns}
              data={incidents}
              loading={false}
              onRowClick={(row) => navigate(`/incidents/${row.id}`)}
            />
            {incidents.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">No incidents found</Text>
            )}
          </Tabs.Panel>

          <Tabs.Panel value="requests" pt="md">
            <DataTable
              columns={requestColumns}
              data={requests}
              loading={false}
              onRowClick={(row) => navigate(`/catalog/requests`)}
            />
            {requests.length === 0 && (
              <Text c="dimmed" ta="center" py="xl">No catalog requests found</Text>
            )}
          </Tabs.Panel>
        </Tabs>
      </Box>
    </Stack>
  );
}
