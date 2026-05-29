import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { assetsApi } from '../../api/assets.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  on_order: 'blue',
  in_stock: 'cyan',
  in_use: 'green',
  in_repair: 'orange',
  retired: 'gray',
  disposed: 'red',
};

const TYPE_COLORS: Record<string, string> = {
  hardware: 'indigo',
  software: 'violet',
  consumable: 'teal',
};

export function AssetList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['assets', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => assetsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'number', label: 'Number', sortable: true, width: 130, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span> },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'type', label: 'Type', sortable: true, width: 110, render: (r: any) => <Badge variant="light" color={TYPE_COLORS[r.type] || 'gray'} size="sm">{r.type}</Badge> },
    { key: 'status', label: 'Status', sortable: true, width: 110, render: (r: any) => <Badge variant="light" color={STATUS_COLORS[r.status] || 'gray'} size="sm">{r.status?.replace(/_/g, ' ')}</Badge> },
    { key: 'model', label: 'Model', sortable: true, width: 150, render: (r: any) => r.model || '-' },
    { key: 'assigned_to_name', label: 'Assigned To', width: 150, render: (r: any) => r.assigned_to_name || '-' },
    { key: 'location', label: 'Location', width: 140, render: (r: any) => r.location || '-' },
    { key: 'created_at', label: 'Created', sortable: true, width: 130, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Assets</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/assets/new')} className="gradient-btn">
          New Asset
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'type', label: 'Type', options: [
            { value: 'hardware', label: 'Hardware' },
            { value: 'software', label: 'Software' },
            { value: 'consumable', label: 'Consumable' },
          ]},
          { key: 'status', label: 'Status', options: [
            { value: 'on_order', label: 'On Order' },
            { value: 'in_stock', label: 'In Stock' },
            { value: 'in_use', label: 'In Use' },
            { value: 'in_repair', label: 'In Repair' },
            { value: 'retired', label: 'Retired' },
            { value: 'disposed', label: 'Disposed' },
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
        onRowClick={(row) => navigate(`/assets/${row.id}`)}
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
