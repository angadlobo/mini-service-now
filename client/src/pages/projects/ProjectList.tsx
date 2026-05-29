import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Progress, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../../api/projects.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import dayjs from 'dayjs';

export function ProjectList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['projects', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => projectsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const columns = [
    { key: 'number', label: 'Number', sortable: true, width: 100, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'status', label: 'Status', sortable: true, width: 120, render: (r: any) => <StateIndicator state={r.status} /> },
    { key: 'priority', label: 'Priority', sortable: true, width: 130, render: (r: any) => <PriorityBadge priority={r.priority} /> },
    { key: 'type', label: 'Type', sortable: true, width: 100, render: (r: any) => <Text size="sm" tt="capitalize">{r.type}</Text> },
    { key: 'owner_name', label: 'Owner', width: 150, render: (r: any) => r.owner_name || '-' },
    { key: 'percent_complete', label: 'Progress', width: 140, render: (r: any) => (
      <Group gap="xs">
        <Progress value={r.percent_complete || 0} size="sm" style={{ flex: 1 }} />
        <Text size="xs" c="dimmed" w={30}>{r.percent_complete || 0}%</Text>
      </Group>
    )},
    { key: 'start_date', label: 'Start', sortable: true, width: 110, render: (r: any) => r.start_date ? dayjs(r.start_date).format('MMM D, YYYY') : '-' },
    { key: 'end_date', label: 'End', sortable: true, width: 110, render: (r: any) => r.end_date ? dayjs(r.end_date).format('MMM D, YYYY') : '-' },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Projects</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/projects/new')} className="gradient-btn">
          New Project
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'status', label: 'Status', options: [
            { value: 'planning', label: 'Planning' }, { value: 'active', label: 'Active' },
            { value: 'on_hold', label: 'On Hold' }, { value: 'completed', label: 'Completed' },
            { value: 'cancelled', label: 'Cancelled' },
          ]},
          { key: 'type', label: 'Type', options: [
            { value: 'waterfall', label: 'Waterfall' }, { value: 'agile', label: 'Agile' },
            { value: 'hybrid', label: 'Hybrid' },
          ]},
        ]}
        filterValues={filters}
        onFilterChange={(k, v) => { setFilters({ ...filters, [k]: v || '' }); setPage(1); }}
        onClear={() => { setSearch(''); setFilters({}); setPage(1); }}
      />

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onRowClick={(row) => navigate(`/projects/${row.id}`)}
      />

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          pageSize={data.pageSize}
          total={data.total}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        />
      )}
    </Stack>
  );
}
