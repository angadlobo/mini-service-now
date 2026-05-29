import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { bcPlansApi } from '../../api/business-continuity.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  active: 'green',
  under_review: 'yellow',
  approved: 'teal',
  retired: 'red',
};

const TYPE_COLORS: Record<string, string> = {
  bcp: 'blue',
  drp: 'violet',
  irp: 'orange',
  crp: 'cyan',
};

export function BCPlanList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['bc-plans', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => bcPlansApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'number', label: 'Number', sortable: true, width: 110, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true, width: 80, render: (r: any) => (
      <Badge variant="light" color={TYPE_COLORS[r.type] || 'gray'} size="sm" tt="uppercase">{r.type}</Badge>
    )},
    { key: 'status', label: 'Status', sortable: true, width: 120, render: (r: any) => (
      <Badge variant="filled" color={STATUS_COLORS[r.status] || 'gray'} size="sm">{(r.status || '').replace(/_/g, ' ')}</Badge>
    )},
    { key: 'owner_name', label: 'Owner', width: 150, render: (r: any) => r.owner_name || '-' },
    { key: 'rpo_hours', label: 'RPO (hrs)', sortable: true, width: 100, render: (r: any) => r.rpo_hours != null ? `${r.rpo_hours}h` : '-' },
    { key: 'rto_hours', label: 'RTO (hrs)', sortable: true, width: 100, render: (r: any) => r.rto_hours != null ? `${r.rto_hours}h` : '-' },
    { key: 'last_tested', label: 'Last Tested', sortable: true, width: 120, render: (r: any) => r.last_tested ? dayjs(r.last_tested).format('MMM D, YYYY') : '-' },
    { key: 'next_test_due', label: 'Next Test', sortable: true, width: 120, render: (r: any) => {
      if (!r.next_test_due) return '-';
      const isOverdue = dayjs(r.next_test_due).isBefore(dayjs());
      return (
        <Text size="sm" c={isOverdue ? 'red' : undefined} fw={isOverdue ? 600 : undefined}>
          {dayjs(r.next_test_due).format('MMM D, YYYY')}
        </Text>
      );
    }},
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Business Continuity Plans</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/business-continuity/new')} className="gradient-btn">
          New Plan
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'status', label: 'Status', options: [
            { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' },
            { value: 'under_review', label: 'Under Review' }, { value: 'approved', label: 'Approved' },
            { value: 'retired', label: 'Retired' },
          ]},
          { key: 'type', label: 'Type', options: [
            { value: 'bcp', label: 'BCP' }, { value: 'drp', label: 'DRP' },
            { value: 'irp', label: 'IRP' }, { value: 'crp', label: 'CRP' },
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
        onRowClick={(row) => navigate(`/business-continuity/${row.id}`)}
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
