import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, SegmentedControl } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { catalogApi } from '../../api/catalog.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { StateIndicator } from '../../components/common/StateIndicator';
import dayjs from 'dayjs';

export function CatalogRequestList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [view, setView] = useState('my');

  const { data, isLoading } = useQuery({
    queryKey: ['catalog-requests', page, view],
    queryFn: () => catalogApi.listRequests({ page, pageSize: 20, my: view === 'my' ? 'true' : undefined }),
  });

  const columns = [
    { key: 'number', label: 'Number', width: 110, render: (r: any) => <span style={{ fontWeight: 600, color: '#228be6' }}>{r.number}</span> },
    { key: 'catalog_item_name', label: 'Item', render: (r: any) => r.catalog_item_name || '-' },
    { key: 'requested_by_name', label: 'Requested By', width: 150, render: (r: any) => r.requested_by_name || '-' },
    { key: 'state', label: 'State', width: 120, render: (r: any) => <StateIndicator state={r.state} /> },
    { key: 'created_at', label: 'Created', width: 130, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2}>Catalog Requests</Title>
        <SegmentedControl data={[{ value: 'my', label: 'My Requests' }, { value: 'all', label: 'All Requests' }]} value={view} onChange={setView} />
      </Group>
      <DataTable columns={columns} data={data?.data || []} loading={isLoading} />
      {data && <Pagination page={data.page} totalPages={data.totalPages} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />}
    </Stack>
  );
}
