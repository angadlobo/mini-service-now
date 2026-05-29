import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { oncallApi } from '../../api/oncall.api';
import { DataTable } from '../../components/common/DataTable';

export function OnCallScheduleList() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['oncall-schedules'],
    queryFn: () => oncallApi.listSchedules(),
  });

  const columns = [
    { key: 'name', label: 'Name', sortable: true, render: (r: any) => <span style={{ fontWeight: 600 }}>{r.name}</span> },
    { key: 'rotation_type', label: 'Rotation', width: 120, render: (r: any) => <Badge variant="light">{r.rotation_type}</Badge> },
    { key: 'group_name', label: 'Group', width: 160, render: (r: any) => r.group_name || '-' },
    { key: 'timezone', label: 'Timezone', width: 150 },
    { key: 'handoff_time', label: 'Handoff', width: 100 },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">On-Call Schedules</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/oncall/schedules/new')} className="gradient-btn">
          New Schedule
        </Button>
      </Group>
      <DataTable
        columns={columns}
        data={data || []}
        loading={isLoading}
        onRowClick={(row) => navigate(`/oncall/schedules/${row.id}`)}
      />
    </Stack>
  );
}
