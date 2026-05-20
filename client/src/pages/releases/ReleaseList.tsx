import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge, Tooltip } from '@mantine/core';
import { IconPlus, IconCalendarEvent, IconChartBar, IconRocket } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { releasesApi } from '../../api/releases.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

const typeColors: Record<string, string> = { major: 'red', minor: 'blue', patch: 'green', hotfix: 'orange' };
const riskColors: Record<string, string> = { high: 'red', moderate: 'yellow', low: 'green' };

export function ReleaseList() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.roles.some((r: string) => ['admin', 'itil'].includes(r));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['releases', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => releasesApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  };

  const columns = [
    { key: 'number', label: 'Number', sortable: true, width: 120, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span> },
    { key: 'short_description', label: 'Short Description', sortable: true },
    { key: 'state', label: 'State', sortable: true, width: 120, render: (r: any) => <StateIndicator state={r.state} /> },
    { key: 'release_type', label: 'Type', width: 100, render: (r: any) => <Badge size="sm" color={typeColors[r.release_type] || 'gray'} variant="filled">{r.release_type}</Badge> },
    { key: 'risk', label: 'Risk', width: 100, render: (r: any) => <Badge size="sm" color={riskColors[r.risk] || 'gray'} variant="light">{r.risk}</Badge> },
    { key: 'risk_score', label: 'Score', sortable: true, width: 80, render: (r: any) => (
      <Tooltip label={`Risk Score: ${r.risk_score || 0}/100`}>
        <Badge size="sm" color={r.risk_score >= 70 ? 'red' : r.risk_score >= 40 ? 'yellow' : 'green'}>{r.risk_score || 0}</Badge>
      </Tooltip>
    )},
    { key: 'priority', label: 'Priority', sortable: true, width: 120, render: (r: any) => <PriorityBadge priority={r.priority} /> },
    { key: 'assigned_to_name', label: 'Assigned To', width: 150, render: (r: any) => r.assigned_to_name || '-' },
    { key: 'scheduled_start', label: 'Scheduled Start', sortable: true, width: 130, render: (r: any) => r.scheduled_start ? dayjs(r.scheduled_start).format('MMM D, HH:mm') : '-' },
    { key: 'created_at', label: 'Created', sortable: true, width: 110, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Group gap="sm">
          <IconRocket size={28} />
          <Title order={2} className="page-title">Release Management</Title>
        </Group>
        <Group>
          <Button variant="light" leftSection={<IconChartBar size={16} />} onClick={() => navigate('/releases/dashboard')}>Dashboard</Button>
          <Button variant="light" leftSection={<IconCalendarEvent size={16} />} onClick={() => navigate('/releases/calendar')}>Calendar</Button>
          {canCreate && <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/releases/new')} className="gradient-btn">New Release</Button>}
        </Group>
      </Group>
      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'state', label: 'State', options: [
            { value: 'planning', label: 'Planning' }, { value: 'review', label: 'Review' },
            { value: 'approved', label: 'Approved' }, { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' }, { value: 'rolled_back', label: 'Rolled Back' },
            { value: 'cancelled', label: 'Cancelled' },
          ]},
          { key: 'release_type', label: 'Type', options: [
            { value: 'major', label: 'Major' }, { value: 'minor', label: 'Minor' },
            { value: 'patch', label: 'Patch' }, { value: 'hotfix', label: 'Hotfix' },
          ]},
          { key: 'risk', label: 'Risk', options: [
            { value: 'high', label: 'High' }, { value: 'moderate', label: 'Moderate' }, { value: 'low', label: 'Low' },
          ]},
        ]}
        filterValues={filters}
        onFilterChange={(k, v) => { setFilters({ ...filters, [k]: v || '' }); setPage(1); }}
        onClear={() => { setSearch(''); setFilters({}); setPage(1); }}
      />
      <DataTable columns={columns} data={data?.data || []} loading={isLoading} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} onRowClick={(row) => navigate(`/releases/${row.id}`)} />
      {data && <Pagination page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
    </Stack>
  );
}
