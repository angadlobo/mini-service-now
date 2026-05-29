import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge, Text, NumberFormatter } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { demandsApi } from '../../api/demands.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import { StateIndicator } from '../../components/common/StateIndicator';

const TYPE_COLORS: Record<string, string> = {
  project: 'blue', enhancement: 'teal', initiative: 'violet',
};

export function DemandList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['demands', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => demandsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortOrder('asc'); }
  };

  const columns = [
    { key: 'number', label: 'Number', sortable: true, width: 110, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span> },
    { key: 'title', label: 'Title', sortable: true },
    { key: 'type', label: 'Type', sortable: true, width: 110, render: (r: any) => r.type ? <Badge color={TYPE_COLORS[r.type] || 'gray'} variant="light" size="sm" tt="capitalize">{r.type}</Badge> : '-' },
    { key: 'status', label: 'Status', sortable: true, width: 130, render: (r: any) => <StateIndicator state={r.status} /> },
    { key: 'priority', label: 'Priority', sortable: true, width: 80, render: (r: any) => r.priority ?? '-' },
    { key: 'business_unit', label: 'Business Unit', sortable: true, width: 150, render: (r: any) => r.business_unit || '-' },
    { key: 'requested_by_name', label: 'Requested By', width: 150, render: (r: any) => r.requested_by_name || '-' },
    { key: 'estimated_cost', label: 'Est. Cost', sortable: true, width: 120, render: (r: any) => r.estimated_cost ? <NumberFormatter value={r.estimated_cost} prefix="$" thousandSeparator /> : '-' },
    { key: 'target_quarter', label: 'Target', sortable: true, width: 90, render: (r: any) => r.target_quarter ? <Text size="sm">{r.target_quarter}</Text> : '-' },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Demand Management</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/demands/new')} className="gradient-btn">
          New Demand
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'status', label: 'Status', options: [
            { value: 'submitted', label: 'Submitted' }, { value: 'screening', label: 'Screening' },
            { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' },
            { value: 'committed', label: 'Committed' }, { value: 'completed', label: 'Completed' },
          ]},
          { key: 'type', label: 'Type', options: [
            { value: 'project', label: 'Project' }, { value: 'enhancement', label: 'Enhancement' },
            { value: 'initiative', label: 'Initiative' },
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
        onRowClick={(row) => navigate(`/demands/${row.id}`)}
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
