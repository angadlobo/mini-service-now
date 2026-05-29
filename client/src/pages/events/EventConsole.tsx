import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Stack, Title, Group, Button, Badge } from '@mantine/core';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../../api/events.api';
import { DataTable } from '../../components/common/DataTable';
import { Pagination } from '../../components/common/Pagination';
import { FilterBar } from '../../components/common/FilterBar';
import dayjs from 'dayjs';

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'red',
  major: 'orange',
  minor: 'yellow',
  warning: 'blue',
  info: 'gray',
  clear: 'green',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'red',
  acknowledged: 'blue',
  resolved: 'green',
  closed: 'gray',
};

export function EventConsole() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<Record<string, string>>({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['events', page, pageSize, search, sortBy, sortOrder, filters],
    queryFn: () => eventsApi.list({ page, pageSize, search, sortBy, sortOrder, ...filters }),
    refetchInterval: 15000,
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
    { key: 'number', label: 'Number', sortable: true, width: 120, render: (r: any) => <span style={{ fontWeight: 600, color: 'var(--mantine-primary-color-filled)' }}>{r.number}</span> },
    { key: 'severity', label: 'Severity', sortable: true, width: 100, render: (r: any) => (
      <Badge color={SEVERITY_COLORS[r.severity] || 'gray'} variant="filled" size="sm">
        {r.severity}
      </Badge>
    )},
    { key: 'source', label: 'Source', sortable: true, width: 100, render: (r: any) => (
      <Badge variant="light" size="sm">{r.source}</Badge>
    )},
    { key: 'node', label: 'Node', sortable: true, width: 160, render: (r: any) => r.node || '-' },
    { key: 'type', label: 'Type', sortable: true, width: 110, render: (r: any) => r.type || '-' },
    { key: 'status', label: 'Status', sortable: true, width: 110, render: (r: any) => (
      <Badge color={STATUS_COLORS[r.status] || 'gray'} variant="outline" size="sm">
        {r.status}
      </Badge>
    )},
    { key: 'description', label: 'Description', render: (r: any) => (
      <span title={r.description}>{r.description ? (r.description.length > 60 ? r.description.substring(0, 60) + '...' : r.description) : '-'}</span>
    )},
    { key: 'created_at', label: 'Created', sortable: true, width: 140, render: (r: any) => dayjs(r.created_at).format('MMM D, HH:mm:ss') },
  ];

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Event Console</Title>
        <Group>
          <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => refetch()}>
            Refresh
          </Button>
          <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/events/new')} className="gradient-btn">
            New Event
          </Button>
        </Group>
      </Group>

      <FilterBar
        search={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        filters={[
          { key: 'severity', label: 'Severity', options: [
            { value: 'critical', label: 'Critical' }, { value: 'major', label: 'Major' },
            { value: 'minor', label: 'Minor' }, { value: 'warning', label: 'Warning' },
            { value: 'info', label: 'Info' }, { value: 'clear', label: 'Clear' },
          ]},
          { key: 'source', label: 'Source', options: [
            { value: 'datadog', label: 'Datadog' }, { value: 'grafana', label: 'Grafana' },
            { value: 'pagerduty', label: 'PagerDuty' }, { value: 'custom', label: 'Custom' },
            { value: 'email', label: 'Email' },
          ]},
          { key: 'status', label: 'Status', options: [
            { value: 'open', label: 'Open' }, { value: 'acknowledged', label: 'Acknowledged' },
            { value: 'resolved', label: 'Resolved' }, { value: 'closed', label: 'Closed' },
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
        onRowClick={(row) => navigate(`/events/${row.id}`)}
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
