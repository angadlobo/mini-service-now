import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { costItemsApi } from '../../api/cost-management.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

function formatCurrency(value: number | null | undefined) {
  if (value == null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

const CATEGORY_COLORS: Record<string, string> = {
  hardware: 'blue',
  software: 'violet',
  licensing: 'grape',
  cloud: 'cyan',
  personnel: 'teal',
  consulting: 'orange',
  maintenance: 'yellow',
  other: 'gray',
};

export function CostItemList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['cost-items', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => costItemsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'description', label: 'Description', sortable: true },
    { key: 'category', label: 'Category', sortable: true, width: 120, render: (r: any) => (
      <Badge variant="light" color={CATEGORY_COLORS[r.category] || 'gray'} size="sm">{r.category || '-'}</Badge>
    )},
    { key: 'amount', label: 'Amount', sortable: true, width: 130, render: (r: any) => formatCurrency(r.amount) },
    { key: 'cost_center_name', label: 'Cost Center', width: 150, render: (r: any) => r.cost_center_name || '-' },
    { key: 'date', label: 'Date', sortable: true, width: 120, render: (r: any) => r.date ? dayjs(r.date).format('MMM D, YYYY') : '-' },
    { key: 'recurring', label: 'Recurring', width: 100, render: (r: any) => (
      <Badge variant="light" color={r.recurring ? 'blue' : 'gray'} size="sm">
        {r.recurring ? 'Yes' : 'No'}
      </Badge>
    )},
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Cost Items</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/cost-management/cost-items/new')} className="gradient-btn">
          New Cost Item
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'category', label: 'Category', options: [
            { value: 'hardware', label: 'Hardware' }, { value: 'software', label: 'Software' },
            { value: 'licensing', label: 'Licensing' }, { value: 'cloud', label: 'Cloud' },
            { value: 'personnel', label: 'Personnel' }, { value: 'consulting', label: 'Consulting' },
            { value: 'maintenance', label: 'Maintenance' }, { value: 'other', label: 'Other' },
          ]},
          { key: 'recurring', label: 'Recurring', options: [
            { value: 'true', label: 'Yes' }, { value: 'false', label: 'No' },
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
        onRowClick={(row) => navigate(`/cost-management/cost-items/${row.id}`)}
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
