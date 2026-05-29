import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge, Text } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { contractsApi } from '../../api/contracts.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  active: 'green',
  expired: 'red',
  cancelled: 'orange',
  renewed: 'blue',
};

const TYPE_COLORS: Record<string, string> = {
  lease: 'blue',
  maintenance: 'teal',
  support: 'green',
  subscription: 'violet',
  nda: 'orange',
  msa: 'cyan',
};

function formatCurrency(value: number | null, currency: string) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency || 'USD' }).format(value);
}

export function ContractList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['contracts', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => contractsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'short_description', label: 'Description', sortable: true },
    { key: 'vendor_name', label: 'Vendor', width: 160, render: (r: any) => r.vendor_name || '-' },
    { key: 'type', label: 'Type', sortable: true, width: 120, render: (r: any) => <Badge variant="light" color={TYPE_COLORS[r.type] || 'gray'} size="sm">{r.type?.toUpperCase()}</Badge> },
    { key: 'status', label: 'Status', sortable: true, width: 110, render: (r: any) => <Badge variant="filled" color={STATUS_COLORS[r.status] || 'gray'} size="sm">{r.status}</Badge> },
    { key: 'value', label: 'Value', sortable: true, width: 130, render: (r: any) => <Text size="sm" fw={500}>{formatCurrency(r.value, r.currency)}</Text> },
    { key: 'start_date', label: 'Start', sortable: true, width: 110, render: (r: any) => r.start_date ? dayjs(r.start_date).format('MMM D, YYYY') : '-' },
    { key: 'end_date', label: 'End', sortable: true, width: 110, render: (r: any) => {
      if (!r.end_date) return '-';
      const isExpired = dayjs(r.end_date).isBefore(dayjs());
      return <Text size="sm" c={isExpired ? 'red' : undefined}>{dayjs(r.end_date).format('MMM D, YYYY')}</Text>;
    }},
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Contracts</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/contracts/new')} className="gradient-btn">
          New Contract
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'type', label: 'Type', options: [
            { value: 'lease', label: 'Lease' }, { value: 'maintenance', label: 'Maintenance' },
            { value: 'support', label: 'Support' }, { value: 'subscription', label: 'Subscription' },
            { value: 'nda', label: 'NDA' }, { value: 'msa', label: 'MSA' },
          ]},
          { key: 'status', label: 'Status', options: [
            { value: 'draft', label: 'Draft' }, { value: 'active', label: 'Active' },
            { value: 'expired', label: 'Expired' }, { value: 'cancelled', label: 'Cancelled' },
            { value: 'renewed', label: 'Renewed' },
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
        onRowClick={(row) => navigate(`/contracts/${row.id}`)}
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
