import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { changesApi } from '../../api/changes.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import { useAuthStore } from '../../store/auth';
import dayjs from 'dayjs';

export function ChangeList() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canCreate = user?.roles.some((r) => ['admin', 'itil'].includes(r));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['changes', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => changesApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  };

  const columns = [
    { key: 'number', label: 'Number', sortable: true, width: 110, render: (r: any) => <span style={{ fontWeight: 600, color: '#228be6' }}>{r.number}</span> },
    { key: 'short_description', label: 'Short Description', sortable: true },
    { key: 'state', label: 'State', sortable: true, width: 120, render: (r: any) => <StateIndicator state={r.state} /> },
    { key: 'type', label: 'Type', width: 100, render: (r: any) => r.type },
    { key: 'risk', label: 'Risk', width: 100, render: (r: any) => r.risk },
    { key: 'priority', label: 'Priority', sortable: true, width: 130, render: (r: any) => <PriorityBadge priority={r.priority} /> },
    { key: 'assigned_to_name', label: 'Assigned To', width: 150, render: (r: any) => r.assigned_to_name || '-' },
    { key: 'created_at', label: 'Created', sortable: true, width: 120, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Changes</Title>
        {canCreate && <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/changes/new')}>New Change</Button>}
      </Group>
      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'state', label: 'State', options: [
            { value: 'new', label: 'New' }, { value: 'assess', label: 'Assess' },
            { value: 'authorize', label: 'Authorize' }, { value: 'scheduled', label: 'Scheduled' },
            { value: 'implement', label: 'Implement' }, { value: 'review', label: 'Review' },
            { value: 'closed', label: 'Closed' },
          ]},
          { key: 'type', label: 'Type', options: [
            { value: 'normal', label: 'Normal' }, { value: 'standard', label: 'Standard' }, { value: 'emergency', label: 'Emergency' },
          ]},
        ]}
        filterValues={filters}
        onFilterChange={(k, v) => { setFilters({ ...filters, [k]: v || '' }); setPage(1); }}
        onClear={() => { setSearch(''); setFilters({}); setPage(1); }}
      />
      <DataTable columns={columns} data={data?.data || []} loading={isLoading} sortBy={sortBy} sortOrder={sortOrder} onSort={handleSort} onRowClick={(row) => navigate(`/changes/${row.id}`)} />
      {data && <Pagination page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />}
    </Stack>
  );
}
