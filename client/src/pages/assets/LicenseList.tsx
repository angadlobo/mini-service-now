import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { licensesApi } from '../../api/assets.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import dayjs from 'dayjs';

const COMPLIANCE_COLORS: Record<string, string> = {
  compliant: 'green',
  over_licensed: 'blue',
  under_licensed: 'red',
};

const LICENSE_TYPE_COLORS: Record<string, string> = {
  perpetual: 'blue',
  subscription: 'violet',
  open_source: 'teal',
  trial: 'yellow',
  oem: 'cyan',
};

export function LicenseList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading } = useQuery({
    queryKey: ['licenses', page, pageSize, search, sortBy, sortOrder],
    queryFn: () => licensesApi.list({ page, pageSize, search, sortBy, sortOrder }),
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
    { key: 'number', label: 'Number', sortable: true, width: 110, render: (r: any) => (
      <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number || r.product_name}</span>
    )},
    { key: 'product_name', label: 'Product', sortable: true },
    { key: 'license_type', label: 'License Type', sortable: true, width: 130, render: (r: any) => (
      <Badge variant="light" size="sm" color={LICENSE_TYPE_COLORS[r.license_type] || 'gray'} tt="capitalize">
        {(r.license_type || '').replace(/_/g, ' ')}
      </Badge>
    )},
    { key: 'total_entitlements', label: 'Entitlements', sortable: true, width: 120, render: (r: any) => r.total_entitlements ?? '-' },
    { key: 'allocated_count', label: 'Allocated', width: 100, render: (r: any) => r.allocated_count ?? '-' },
    { key: 'compliance_status', label: 'Compliance', sortable: true, width: 140, render: (r: any) => (
      <Badge variant="filled" size="sm" color={COMPLIANCE_COLORS[r.compliance_status] || 'gray'} tt="capitalize">
        {(r.compliance_status || '').replace(/_/g, ' ')}
      </Badge>
    )},
    { key: 'expiry_date', label: 'Expiry', sortable: true, width: 120, render: (r: any) => {
      if (!r.expiry_date) return '-';
      const isExpired = new Date(r.expiry_date) < new Date();
      return (
        <span style={{ color: isExpired ? 'var(--mantine-color-red-6)' : undefined }}>
          {dayjs(r.expiry_date).format('MMM D, YYYY')}
        </span>
      );
    }},
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Software Licenses</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/assets/licenses/new')} className="gradient-btn">
          New License
        </Button>
      </Group>

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onRowClick={(row) => navigate(`/assets/licenses/${row.id}`)}
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
