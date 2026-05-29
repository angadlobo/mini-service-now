import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { costCentersApi } from '../../api/cost-management.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function CostCenterList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['cost-centers', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => costCentersApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'code', label: 'Code', sortable: true, width: 120, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.code}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'department', label: 'Department', sortable: true, width: 150, render: (r: any) => r.department || '-' },
    { key: 'manager_name', label: 'Manager', width: 150, render: (r: any) => r.manager_name || '-' },
    { key: 'budget_annual', label: 'Annual Budget', sortable: true, width: 140, render: (r: any) => formatCurrency(r.budget_annual) },
    { key: 'active', label: 'Active', width: 90, render: (r: any) => (
      <Badge variant="light" color={r.active ? 'green' : 'gray'} size="sm">
        {r.active ? 'Active' : 'Inactive'}
      </Badge>
    )},
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Cost Centers</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/cost-management/cost-centers/new')} className="gradient-btn">
          New Cost Center
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'active', label: 'Status', options: [
            { value: 'true', label: 'Active' }, { value: 'false', label: 'Inactive' },
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
        onRowClick={(row) => navigate(`/cost-management/cost-centers/${row.id}`)}
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
