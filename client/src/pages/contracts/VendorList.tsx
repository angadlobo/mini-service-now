import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus, IconStar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { vendorsApi } from '../../api/contracts.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';

const STATUS_COLORS: Record<string, string> = {
  active: 'green',
  inactive: 'gray',
  blacklisted: 'red',
};

const TYPE_COLORS: Record<string, string> = {
  hardware: 'blue',
  software: 'violet',
  service: 'teal',
  consulting: 'orange',
};

function RatingStars({ rating }: { rating: number | null }) {
  if (!rating) return <span>-</span>;
  return (
    <Group gap={2}>
      {[1, 2, 3, 4, 5].map((star) => (
        <IconStar
          key={star}
          size={14}
          fill={star <= rating ? '#fab005' : 'none'}
          color={star <= rating ? '#fab005' : '#dee2e6'}
          stroke={1.5}
        />
      ))}
    </Group>
  );
}

export function VendorList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['vendors', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => vendorsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'type', label: 'Type', sortable: true, width: 120, render: (r: any) => <Badge variant="light" color={TYPE_COLORS[r.type] || 'gray'} size="sm">{r.type}</Badge> },
    { key: 'status', label: 'Status', sortable: true, width: 120, render: (r: any) => <Badge variant="filled" color={STATUS_COLORS[r.status] || 'gray'} size="sm">{r.status}</Badge> },
    { key: 'contact_name', label: 'Contact', width: 150, render: (r: any) => r.contact_name || '-' },
    { key: 'email', label: 'Email', width: 200, render: (r: any) => r.email || '-' },
    { key: 'rating', label: 'Rating', width: 120, render: (r: any) => <RatingStars rating={r.rating} /> },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Vendors</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/vendors/new')} className="gradient-btn">
          New Vendor
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'type', label: 'Type', options: [
            { value: 'hardware', label: 'Hardware' }, { value: 'software', label: 'Software' },
            { value: 'service', label: 'Service' }, { value: 'consulting', label: 'Consulting' },
          ]},
          { key: 'status', label: 'Status', options: [
            { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' },
            { value: 'blacklisted', label: 'Blacklisted' },
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
        onRowClick={(row) => navigate(`/vendors/${row.id}`)}
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
