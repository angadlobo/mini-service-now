import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { surveysApi } from '../../api/surveys.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  active: 'green',
  closed: 'red',
};

export function SurveyList() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['surveys', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => surveysApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
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
    { key: 'title', label: 'Title', sortable: true },
    { key: 'type', label: 'Type', sortable: true, width: 130, render: (r: any) => (
      <Badge variant="light" size="sm" tt="capitalize">{r.type}</Badge>
    )},
    { key: 'status', label: 'Status', sortable: true, width: 110, render: (r: any) => (
      <Badge variant="filled" size="sm" color={STATUS_COLORS[r.status] || 'gray'} tt="capitalize">
        {r.status}
      </Badge>
    )},
    { key: 'created_at', label: 'Created', sortable: true, width: 130, render: (r: any) => dayjs(r.created_at).format('MMM D, YYYY') },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Surveys</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/surveys/new')} className="gradient-btn">
          New Survey
        </Button>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'status', label: 'Status', options: [
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'closed', label: 'Closed' },
          ]},
          { key: 'type', label: 'Type', options: [
            { value: 'satisfaction', label: 'Satisfaction' },
            { value: 'feedback', label: 'Feedback' },
            { value: 'assessment', label: 'Assessment' },
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
        onRowClick={(row) => navigate(`/surveys/${row.id}`)}
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
