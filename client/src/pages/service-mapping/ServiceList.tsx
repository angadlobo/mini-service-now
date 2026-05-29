import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { businessServicesApi } from '../../api/service-mapping.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  planned: 'blue',
};

const CRITICALITY_COLORS: Record<string, string> = {
  critical: 'red',
  high: 'orange',
  medium: 'blue',
  low: 'gray',
};

export function ServiceList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['business-services', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => businessServicesApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'status', label: 'Status', sortable: true, width: 110, render: (r: any) => (
      <Badge variant="light" color={STATUS_COLORS[r.status] || 'gray'} size="sm">{r.status}</Badge>
    )},
    { key: 'criticality', label: 'Criticality', sortable: true, width: 120, render: (r: any) => (
      <Badge variant="filled" color={CRITICALITY_COLORS[r.criticality] || 'gray'} size="sm">{r.criticality}</Badge>
    )},
    { key: 'owner_name', label: 'Owner', width: 150, render: (r: any) => r.owner_name || '-' },
    { key: 'portfolio', label: 'Portfolio', sortable: true, width: 150, render: (r: any) => r.portfolio || '-' },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Business Services</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/service-mapping/new')} className="gradient-btn">
          New Service
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'status', label: 'Status', options: [
            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
            { value: 'planned', label: 'Planned' },
          ]},
          { key: 'criticality', label: 'Criticality', options: [
            { value: 'critical', label: 'Critical' }, { value: 'high', label: 'High' },
            { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' },
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
        onRowClick={(row) => navigate(`/service-mapping/${row.id}`)}
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
