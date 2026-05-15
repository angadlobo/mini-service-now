import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container, Title, Table, Button, Modal, TextInput, Select, Textarea,
  Switch, Badge, Group, Stack, Paper, Text, ScrollArea,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPlus, IconEdit, IconTrash, IconPlayerPlay, IconDownload } from '@tabler/icons-react';
import { reportsApi } from '../../api/common.api';
import { useAuthStore } from '../../store/auth';
import type { Report } from '@shared/interfaces';

const TABLE_OPTIONS = [
  { value: 'incidents', label: 'Incidents' },
  { value: 'changes', label: 'Changes' },
  { value: 'problems', label: 'Problems' },
  { value: 'cis', label: 'Configuration Items' },
  { value: 'users', label: 'Users' },
];

const CHART_TYPE_OPTIONS = [
  { value: 'table', label: 'Table' },
  { value: 'bar', label: 'Bar Chart' },
  { value: 'pie', label: 'Pie Chart' },
  { value: 'line', label: 'Line Chart' },
  { value: 'donut', label: 'Donut Chart' },
];

const emptyForm = {
  name: '',
  description: '',
  table_name: '',
  columns: '',
  filters: '{}',
  chart_type: 'table',
  is_public: false,
};

export function ReportList() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.roles?.includes('admin');

  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [runResult, setRunResult] = useState<{ columns: string[]; rows: Record<string, unknown>[] } | null>(null);
  const [runReportName, setRunReportName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['reports', page],
    queryFn: () => reportsApi.list({ page, pageSize: 20 }),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Report>) =>
      editId ? reportsApi.update(editId, payload) : reportsApi.create(payload),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: editId ? 'Report updated' : 'Report created', color: 'green' });
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      closeModal();
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
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

  const runMutation = useMutation({
    mutationFn: (id: string) => reportsApi.run(id),
    onSuccess: (result: any, id) => {
      const report = data?.data?.find((r) => r.id === id);
      setRunReportName(report?.name || 'Report');
      setRunResult(result);
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Run failed', color: 'red' }),
  });

  const handleExport = async (id: string) => {
    try {
      const response = await reportsApi.exportCsv(id);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${id}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      notifications.show({ title: 'Exported', message: 'CSV file downloaded', color: 'green' });
    } catch (err: any) {
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Export failed', color: 'red' });
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setEditId(null);
    setModalOpen(true);
  };

  const openEdit = async (report: Report) => {
    const full = await reportsApi.get(report.id);
    setForm({
      name: full.name,
      description: full.description || '',
      table_name: full.table_name,
      columns: (full.columns || []).join(', '),
      filters: JSON.stringify(full.filters || {}, null, 2),
      chart_type: full.chart_type || 'table',
      is_public: full.is_public,
    });
    setEditId(report.id);
    setModalOpen(true);
  };

  const handleSave = () => {
    try {
      const cols = form.columns.split(',').map((c) => c.trim()).filter(Boolean);
      const payload: Partial<Report> = {
        name: form.name,
        description: form.description,
        table_name: form.table_name,
        columns: cols,
        filters: JSON.parse(form.filters),
        chart_type: form.chart_type,
        is_public: form.is_public,
      };
      saveMutation.mutate(payload);
    } catch {
      notifications.show({ title: 'Validation Error', message: 'Filters must be valid JSON', color: 'red' });
    }
  };

  const rows = (data?.data || []).map((r) => (
    <Table.Tr key={r.id}>
      <Table.Td><Text fw={500} size="sm">{r.name}</Text></Table.Td>
      <Table.Td>{r.table_name}</Table.Td>
      <Table.Td><Badge variant="light">{r.chart_type || 'table'}</Badge></Table.Td>
      <Table.Td><Badge color={r.is_public ? 'blue' : 'gray'}>{r.is_public ? 'Public' : 'Private'}</Badge></Table.Td>
      <Table.Td>
        <Group gap="xs" wrap="nowrap">
          <Button size="xs" variant="light" color="teal" leftSection={<IconPlayerPlay size={14} />}
            onClick={() => runMutation.mutate(r.id)} loading={runMutation.isPending}>
            Run
          </Button>
          <Button size="xs" variant="light" color="violet" leftSection={<IconDownload size={14} />}
            onClick={() => handleExport(r.id)}>
            CSV
          </Button>
          {isAdmin && (
            <>
              <Button size="xs" variant="light" leftSection={<IconEdit size={14} />} onClick={() => openEdit(r)}>Edit</Button>
              <Button size="xs" variant="light" color="red" leftSection={<IconTrash size={14} />}
                onClick={() => { if (confirm('Delete this report?')) deleteMutation.mutate(r.id); }}>
                Delete
              </Button>
            </>
          )}
        </Group>
      </Table.Td>
    </Table.Tr>
  ));

  const resultCols = runResult?.columns || (runResult?.rows?.length ? Object.keys(runResult.rows[0]) : []);

  return (
    <Container size="xl">
      <Stack>
        <Group justify="space-between">
          <Title order={2}>Reports</Title>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>New Report</Button>
        </Group>

        <Paper withBorder>
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>Table</Table.Th>
                <Table.Th>Chart Type</Table.Th>
                <Table.Th>Visibility</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {isLoading ? (
                <Table.Tr><Table.Td colSpan={5}><Text ta="center" py="md">Loading...</Text></Table.Td></Table.Tr>
              ) : rows.length === 0 ? (
                <Table.Tr><Table.Td colSpan={5}><Text ta="center" py="md">No reports found</Text></Table.Td></Table.Tr>
              ) : rows}
            </Table.Tbody>
          </Table>
        </Paper>

        {data && data.totalPages > 1 && (
          <Group justify="center">
            <Button size="xs" variant="light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Text size="sm">Page {data.page} of {data.totalPages}</Text>
            <Button size="xs" variant="light" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </Group>
        )}

        {/* Create / Edit Modal */}
        <Modal opened={modalOpen} onClose={closeModal} title={editId ? 'Edit Report' : 'New Report'} size="lg">
          <Stack>
            <TextInput label="Name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
            <TextInput label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.currentTarget.value })} />
            <Select label="Table" required data={TABLE_OPTIONS} value={form.table_name} onChange={(v) => setForm({ ...form, table_name: v || '' })} />
            <TextInput label="Columns (comma-separated)" value={form.columns} onChange={(e) => setForm({ ...form, columns: e.currentTarget.value })} placeholder="id, number, state, priority" />
            <Textarea label="Filters (JSON)" minRows={3} value={form.filters} onChange={(e) => setForm({ ...form, filters: e.currentTarget.value })} />
            <Select label="Chart Type" data={CHART_TYPE_OPTIONS} value={form.chart_type} onChange={(v) => setForm({ ...form, chart_type: v || 'table' })} />
            <Switch label="Public" checked={form.is_public} onChange={(e) => setForm({ ...form, is_public: e.currentTarget.checked })} />
            <Group justify="flex-end">
              <Button variant="subtle" onClick={closeModal}>Cancel</Button>
              <Button onClick={handleSave} loading={saveMutation.isPending}>Save</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Run Results Modal */}
        <Modal opened={!!runResult} onClose={() => setRunResult(null)} title={`Results: ${runReportName}`} size="xl">
          {runResult && (
            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    {resultCols.map((col) => (
                      <Table.Th key={col}>{col}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {(runResult.rows || []).length === 0 ? (
                    <Table.Tr><Table.Td colSpan={resultCols.length || 1}><Text ta="center" py="md">No data</Text></Table.Td></Table.Tr>
                  ) : (
                    (runResult.rows || []).map((row, idx) => (
                      <Table.Tr key={idx}>
                        {resultCols.map((col) => (
                          <Table.Td key={col}><Text size="sm" truncate maw={200}>{String(row[col] ?? '-')}</Text></Table.Td>
                        ))}
                      </Table.Tr>
                    ))
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Modal>
      </Stack>
    </Container>
  );
}
