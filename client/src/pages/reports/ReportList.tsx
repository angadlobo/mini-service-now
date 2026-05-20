import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Container, Title, Button, Group, Stack, Paper, Text, Badge, Box,
  SimpleGrid, Card, ThemeIcon, ActionIcon, Menu, Loader, Center,
  TextInput, SegmentedControl, ScrollArea, Tooltip, Modal,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconPlus, IconEdit, IconTrash, IconDownload,
  IconChartBar, IconChartPie, IconChartLine, IconChartDonut, IconTable,
  IconDotsVertical, IconSearch, IconLayoutGrid, IconLayoutList,
  IconChartArea, IconEye, IconCopy,
} from '@tabler/icons-react';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { reportsApi } from '../../api/common.api';
import { useAuthStore } from '../../store/auth';
import type { Report } from '@shared/interfaces';

const CHART_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
  '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#a18cd1',
];

const CHART_ICONS: Record<string, any> = {
  table: IconTable,
  bar: IconChartBar,
  line: IconChartLine,
  area: IconChartArea,
  pie: IconChartPie,
  donut: IconChartDonut,
};

function MiniChart({ reportId, chartType }: { reportId: string; chartType: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['report-run', reportId],
    queryFn: () => reportsApi.run(reportId),
    staleTime: 60000,
    retry: false,
  });

  if (isLoading) return <Center h={140}><Loader size="sm" /></Center>;
  if (isError) return <Center h={140}><Text size="xs" c="dimmed">Failed to load</Text></Center>;
  if (!data || !data.data || data.data.length === 0) {
    return <Center h={140}><Text size="xs" c="dimmed">No data</Text></Center>;
  }

  const rows = data.data.slice(0, 20);
  const cols = data.columns || [];
  const labelKey = cols[0];
  const valueKey = cols.length > 1 ? cols[1] : cols[0];

  const chartData = rows.map((row: any) => ({
    name: String(row[labelKey] ?? '').substring(0, 15),
    value: Number(row[valueKey]) || 0,
  }));

  if (chartType === 'table') {
    return (
      <ScrollArea h={140}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
          <thead>
            <tr>
              {cols.slice(0, 4).map((col: string) => (
                <th key={col} style={{ padding: '3px 6px', textAlign: 'left', borderBottom: '1px solid #e9ecef', fontWeight: 600 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 5).map((row: any, idx: number) => (
              <tr key={idx}>
                {cols.slice(0, 4).map((col: string) => (
                  <td key={col} style={{ padding: '2px 6px', borderBottom: '1px solid #f8f9fa', maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(row[col] ?? '-').substring(0, 20)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={chartData}>
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={chartData}>
          <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData}>
          <Area type="monotone" dataKey="value" stroke="#667eea" fill="#667eea" fillOpacity={0.15} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height={140}>
        <PieChart>
          <Pie data={chartData} cx="50%" cy="50%" innerRadius={chartType === 'donut' ? 25 : 0} outerRadius={55} dataKey="value">
            {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// Full screen report view modal
function ReportViewModal({ report, opened, onClose }: { report: Report | null; opened: boolean; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-run-full', report?.id],
    queryFn: () => reportsApi.run(report!.id),
    enabled: opened && !!report,
  });

  if (!report) return null;

  const chartType = report.chart_type || 'table';
  const rows = data?.data || [];
  const cols = data?.columns || [];
  const labelKey = cols[0];
  const valueKey = cols.length > 1 ? cols[1] : cols[0];

  const chartData = rows.slice(0, 100).map((row: any) => ({
    ...row,
    name: String(row[labelKey] ?? 'N/A'),
    value: Number(row[valueKey]) || 0,
  }));

  return (
    <Modal opened={opened} onClose={onClose} title={report.name} size="xl">
      {isLoading ? (
        <Center h={400}><Loader /></Center>
      ) : rows.length === 0 ? (
        <Center h={300}><Text c="dimmed">No data found</Text></Center>
      ) : chartType === 'table' ? (
        <ScrollArea h={500}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {cols.map((col: string) => (
                  <th key={col} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e9ecef', fontWeight: 600, position: 'sticky', top: 0, backgroundColor: '#fff' }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row: any, idx: number) => (
                <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                  {cols.map((col: string) => (
                    <td key={col} style={{ padding: '6px 12px', borderBottom: '1px solid #f1f3f5', maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {String(row[col] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      ) : chartType === 'bar' ? (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} />
            <RTooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : chartType === 'line' ? (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RTooltip />
            <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : chartType === 'area' ? (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <RTooltip />
            <Area type="monotone" dataKey="value" stroke="#667eea" fill="#667eea" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      ) : (chartType === 'pie' || chartType === 'donut') ? (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={chartType === 'donut' ? 60 : 0}
              outerRadius={140}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {chartData.map((_: any, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <RTooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : null}
      <Text size="xs" c="dimmed" ta="right" mt="sm">{data?.total ?? 0} total records</Text>
    </Modal>
  );
}

export function ReportList() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canEdit = user?.roles?.includes('admin') || user?.roles?.includes('itil');

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [layout, setLayout] = useState('grid');
  const [viewReport, setViewReport] = useState<Report | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports', page, search],
    queryFn: () => reportsApi.list({ page, pageSize: 20, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => reportsApi.delete(id),
    onSuccess: () => {
      notifications.show({ title: 'Deleted', message: 'Report removed', color: 'orange' });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Delete failed', color: 'red' }),
  });

  const duplicateMutation = useMutation({
    mutationFn: async (report: Report) => {
      const full = await reportsApi.get(report.id);
      return reportsApi.create({
        name: `${full.name} (Copy)`,
        description: full.description,
        table_name: full.table_name,
        columns: full.columns,
        filters: full.filters,
        chart_type: full.chart_type,
        config: full.config,
        is_public: full.is_public,
      });
    },
    onSuccess: () => {
      notifications.show({ title: 'Success', message: 'Report duplicated', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
    },
  });

  const handleExport = async (id: string, name: string) => {
    try {
      const response = await reportsApi.exportCsv(id);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      notifications.show({ title: 'Exported', message: 'CSV file downloaded', color: 'green' });
    } catch {
      notifications.show({ title: 'Error', message: 'Export failed', color: 'red' });
    }
  };

  const reports = data?.data || [];

  return (
    <Container size="xl">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Title order={2}>Reports</Title>
          <Group>
            <SegmentedControl
              size="xs"
              value={layout}
              onChange={setLayout}
              data={[
                { value: 'grid', label: <IconLayoutGrid size={16} /> },
                { value: 'list', label: <IconLayoutList size={16} /> },
              ]}
            />
            {canEdit && (
              <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/reports/new')}>
                New Report
              </Button>
            )}
          </Group>
        </Group>

        {/* Search */}
        <TextInput
          placeholder="Search reports..."
          leftSection={<IconSearch size={16} />}
          value={search}
          onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
        />

        {/* Content */}
        {isLoading ? (
          <Center h={300}><Loader /></Center>
        ) : reports.length === 0 ? (
          <Paper p="xl" withBorder>
            <Center h={200}>
              <Stack align="center" gap="sm">
                <ThemeIcon size={60} variant="light" radius="xl">
                  <IconChartBar size={30} />
                </ThemeIcon>
                <Text fw={500} size="lg">No reports yet</Text>
                <Text c="dimmed" size="sm">Create your first report to start visualizing data</Text>
                {canEdit && (
                  <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/reports/new')} mt="sm">
                    Create Report
                  </Button>
                )}
              </Stack>
            </Center>
          </Paper>
        ) : layout === 'grid' ? (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
            {reports.map((r: Report) => {
              const ChartIcon = CHART_ICONS[r.chart_type] || IconTable;
              return (
                <Card key={r.id} withBorder padding={0} style={{
                  overflow: 'hidden',
                  transition: 'all 200ms ease',
                }}>
                  {/* Mini chart preview */}
                  <Box p="xs" style={{ borderBottom: '1px solid #f1f3f5' }}>
                    <MiniChart reportId={r.id} chartType={r.chart_type || 'table'} />
                  </Box>

                  {/* Card body */}
                  <Box p="sm">
                    <Group justify="space-between" mb={4}>
                      <Group gap="xs">
                        <ThemeIcon size="sm" variant="light">
                          <ChartIcon size={14} />
                        </ThemeIcon>
                        <Text fw={600} size="sm" truncate style={{ maxWidth: 180 }}>{r.name}</Text>
                      </Group>
                      <Menu position="bottom-end" withinPortal>
                        <Menu.Target>
                          <ActionIcon variant="subtle" size="sm"><IconDotsVertical size={14} /></ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />} onClick={() => setViewReport(r)}>
                            View Full
                          </Menu.Item>
                          {canEdit && (
                            <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => navigate(`/reports/${r.id}/edit`)}>
                              Edit
                            </Menu.Item>
                          )}
                          <Menu.Item leftSection={<IconDownload size={14} />} onClick={() => handleExport(r.id, r.name)}>
                            Export CSV
                          </Menu.Item>
                          {canEdit && (
                            <Menu.Item leftSection={<IconCopy size={14} />} onClick={() => duplicateMutation.mutate(r)}>
                              Duplicate
                            </Menu.Item>
                          )}
                          {canEdit && (
                            <>
                              <Menu.Divider />
                              <Menu.Item color="red" leftSection={<IconTrash size={14} />}
                                onClick={() => { if (confirm('Delete this report?')) deleteMutation.mutate(r.id); }}>
                                Delete
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Group>
                    <Group gap="xs">
                      <Badge size="xs" variant="light">{r.table_name}</Badge>
                      <Badge size="xs" variant="light" color={r.is_public ? 'blue' : 'gray'}>
                        {r.is_public ? 'Public' : 'Private'}
                      </Badge>
                    </Group>
                    {r.description && <Text size="xs" c="dimmed" mt={4} lineClamp={2}>{r.description}</Text>}
                  </Box>
                </Card>
              );
            })}
          </SimpleGrid>
        ) : (
          /* List view */
          <Paper withBorder>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9ecef' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Name</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Data Source</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Chart Type</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Visibility</th>
                  <th style={{ padding: '10px 16px', textAlign: 'left' }}>Created By</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r: Report) => {
                  const ChartIcon = CHART_ICONS[r.chart_type] || IconTable;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                      <td style={{ padding: '10px 16px' }}>
                        <Group gap="xs">
                          <ThemeIcon size="sm" variant="light"><ChartIcon size={14} /></ThemeIcon>
                          <Text fw={500} size="sm">{r.name}</Text>
                        </Group>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <Badge variant="light" size="sm">{r.table_name}</Badge>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <Badge variant="light" size="sm">{r.chart_type || 'table'}</Badge>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <Badge size="sm" color={r.is_public ? 'blue' : 'gray'}>{r.is_public ? 'Public' : 'Private'}</Badge>
                      </td>
                      <td style={{ padding: '10px 16px' }}>
                        <Text size="sm">{r.created_by_name || '-'}</Text>
                      </td>
                      <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                        <Group gap="xs" justify="flex-end" wrap="nowrap">
                          <Tooltip label="View"><ActionIcon variant="light" onClick={() => setViewReport(r)}><IconEye size={16} /></ActionIcon></Tooltip>
                          {canEdit && <Tooltip label="Edit"><ActionIcon variant="light" onClick={() => navigate(`/reports/${r.id}/edit`)}><IconEdit size={16} /></ActionIcon></Tooltip>}
                          <Tooltip label="Export CSV"><ActionIcon variant="light" color="violet" onClick={() => handleExport(r.id, r.name)}><IconDownload size={16} /></ActionIcon></Tooltip>
                          {canEdit && (
                            <Tooltip label="Delete">
                              <ActionIcon variant="light" color="red" onClick={() => { if (confirm('Delete?')) deleteMutation.mutate(r.id); }}>
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Tooltip>
                          )}
                        </Group>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Paper>
        )}

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <Group justify="center">
            <Button size="xs" variant="light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Text size="sm">Page {data.page} of {data.totalPages}</Text>
            <Button size="xs" variant="light" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </Group>
        )}
      </Stack>

      {/* Full View Modal */}
      <ReportViewModal report={viewReport} opened={!!viewReport} onClose={() => setViewReport(null)} />
    </Container>
  );
}
