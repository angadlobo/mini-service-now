import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { cmdbApi } from '../../api/common.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import { StateIndicator } from '../../components/common/StateIndicator';
import type { ConfigurationItem } from '@shared/interfaces';

export function CiList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['cmdb-cis', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => cmdbApi.listCis({ page, pageSize, search, sortBy, sortOrder, ...filters }),
  });

  const { data: ciTypes } = useQuery({
    queryKey: ['cmdb-types'],
    queryFn: () => cmdbApi.listTypes(),
  });

  const handleSort = (key: string) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('asc');
    }
  };

  const typeOptions = (ciTypes || []).map((t) => ({ value: t.id, label: t.name }));

  const columns = [
    {
      key: 'number', label: 'Number', sortable: true, width: 120,
      render: (r: ConfigurationItem) => (
        <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span>
      ),
    },
    { key: 'name', label: 'Name', sortable: true },
    {
      key: 'ci_type_name', label: 'Type', sortable: true, width: 140,
      render: (r: ConfigurationItem) => r.ci_type_name || '-',
    },
    {
      key: 'status', label: 'Status', sortable: true, width: 120,
      render: (r: ConfigurationItem) => <StateIndicator state={r.status} />,
    },
    {
      key: 'location', label: 'Location', sortable: true, width: 160,
      render: (r: ConfigurationItem) => r.location || '-',
    },
    {
      key: 'owner_name', label: 'Owner', width: 150,
      render: (r: ConfigurationItem) => r.owner_name || '-',
    },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Configuration Items</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/cmdb/cis/new')} className="gradient-btn">
          New CI
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          {
            key: 'status', label: 'Status', options: [
              { value: 'inventory', label: 'Inventory' },
              { value: 'active', label: 'Active' },
              { value: 'maintenance', label: 'Maintenance' },
              { value: 'retired', label: 'Retired' },
            ],
          },
          { key: 'ci_type_id', label: 'Type', options: typeOptions },
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
        onRowClick={(row) => navigate(`/cmdb/cis/${row.id}`)}
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
