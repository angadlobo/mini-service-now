import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { problemsApi } from '../../api/common.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import { StateIndicator } from '../../components/common/StateIndicator';
import { PriorityBadge } from '../../components/common/PriorityBadge';
import dayjs from 'dayjs';

export function ProblemList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['problems', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => problemsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'number', label: 'Number', sortable: true, width: 110, render: (r: any) => <span style={{ fontWeight: 600, color: '#228be6' }}>{r.number}</span> },
    { key: 'short_description', label: 'Short Description', sortable: true },
    { key: 'state', label: 'State', sortable: true, width: 140, render: (r: any) => <StateIndicator state={r.state} /> },
    { key: 'priority', label: 'Priority', sortable: true, width: 130, render: (r: any) => <PriorityBadge priority={r.priority} /> },
    { key: 'assigned_to_name', label: 'Assigned To', width: 150, render: (r: any) => r.assigned_to_name || '-' },
    { key: 'assignment_group_name', label: 'Group', width: 160, render: (r: any) => r.assignment_group_name || '-' },
    { key: 'created_at', label: 'Created', sortable: true, width: 130, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Problems</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/problems/new')}>
          New Problem
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'state', label: 'State', options: [
            { value: 'new', label: 'New' },
            { value: 'investigation', label: 'Investigation' },
            { value: 'root_cause_found', label: 'Root Cause Found' },
            { value: 'fix_in_progress', label: 'Fix in Progress' },
            { value: 'resolved', label: 'Resolved' },
            { value: 'closed', label: 'Closed' },
          ]},
          { key: 'priority', label: 'Priority', options: [
            { value: '1', label: 'P1 - Critical' },
            { value: '2', label: 'P2 - High' },
            { value: '3', label: 'P3 - Moderate' },
            { value: '4', label: 'P4 - Low' },
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
        onRowClick={(row) => navigate(`/problems/${row.id}`)}
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
