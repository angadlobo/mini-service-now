import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Stack, Title, TextInput, Select, Button, Group, Paper, Loader, MultiSelect, Text,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { appEngineApi } from '../../../api/app-engine.api';

const PAGE_TYPES = [
  { value: 'list', label: 'List' },
  { value: 'form', label: 'Form' },
  { value: 'dashboard', label: 'Dashboard' },
];

const SORT_ORDERS = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' },
];

interface TableDef {
  id: string;
  name: string;
  label: string;
  columns?: { name: string; label: string }[];
}

export function PageDesigner() {
  const { pageId } = useParams<{ pageId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [title, setTitle] = useState('');
  const [type, setType] = useState('list');
  const [tableId, setTableId] = useState('');

  // List config
  const [listColumns, setListColumns] = useState<string[]>([]);
  const [defaultSort, setDefaultSort] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');

  // Form config
  const [formColumns, setFormColumns] = useState<string[]>([]);
  const [readonlyColumns, setReadonlyColumns] = useState<string[]>([]);

  const { data: page, isLoading } = useQuery({
    queryKey: ['app-engine-page', pageId],
    queryFn: () => appEngineApi.getPage(pageId!),
    enabled: !!pageId,
  });

  // Fetch all tables so user can pick one
  const { data: tables = [] } = useQuery<TableDef[]>({
    queryKey: ['app-engine-all-tables'],
    queryFn: () => appEngineApi.listTables(),
  });

  const selectedTable = tables.find((t) => t.id === tableId);
  const columnOptions = (selectedTable?.columns || []).map((c) => ({
    value: c.name,
    label: c.label || c.name,
  }));

  useEffect(() => {
    if (page) {
      setTitle(page.title || '');
      setType(page.type || 'list');
      setTableId(page.table_id || '');
      const cfg = page.config || {};
      if (page.type === 'list') {
        setListColumns(cfg.columns || []);
        setDefaultSort(cfg.default_sort || '');
        setSortOrder(cfg.sort_order || 'asc');
      } else if (page.type === 'form') {
        setFormColumns(cfg.columns || []);
        setReadonlyColumns(cfg.readonly_columns || []);
      }
    }
  }, [page]);

  const saveMutation = useMutation({
    mutationFn: () => {
      let config: Record<string, unknown> = {};
      if (type === 'list') {
        config = { columns: listColumns, default_sort: defaultSort, sort_order: sortOrder };
      } else if (type === 'form') {
        config = { columns: formColumns, readonly_columns: readonlyColumns };
      }
      return appEngineApi.updatePage(pageId!, { title, type, table_id: tableId || undefined, config });
    },
    onSuccess: () => {
      notifications.show({ title: 'Saved', message: 'Page updated', color: 'green' });
      qc.invalidateQueries({ queryKey: ['app-engine-page', pageId] });
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  if (isLoading) return <Loader />;

  const tableSelectData = tables.map((t) => ({ value: t.id, label: t.label || t.name }));

  return (
    <Stack>
      <Group justify="space-between">
        <Title order={2} className="page-title">Page Designer</Title>
        <Button variant="subtle" onClick={() => navigate(-1)}>Back</Button>
      </Group>

      <Paper p="md" withBorder className="glass-panel">
        <Stack gap="sm">
          <TextInput label="Title" required value={title} onChange={(e) => setTitle(e.currentTarget.value)} />
          <Select label="Type" required data={PAGE_TYPES} value={type} onChange={(v) => setType(v || 'list')} />
          <Select
            label="Table"
            data={tableSelectData}
            value={tableId}
            onChange={(v) => setTableId(v || '')}
            clearable
            searchable
          />
        </Stack>
      </Paper>

      {/* Config editor - varies by type */}
      {type === 'list' && (
        <Paper p="md" withBorder className="glass-panel">
          <Stack gap="sm">
            <Title order={4}>List Configuration</Title>
            <MultiSelect
              label="Columns"
              data={columnOptions}
              value={listColumns}
              onChange={setListColumns}
              placeholder={columnOptions.length === 0 ? 'Select a table first' : 'Select columns'}
            />
            <Select
              label="Default Sort Column"
              data={columnOptions}
              value={defaultSort}
              onChange={(v) => setDefaultSort(v || '')}
              clearable
            />
            <Select
              label="Sort Order"
              data={SORT_ORDERS}
              value={sortOrder}
              onChange={(v) => setSortOrder(v || 'asc')}
            />
          </Stack>
        </Paper>
      )}

      {type === 'form' && (
        <Paper p="md" withBorder className="glass-panel">
          <Stack gap="sm">
            <Title order={4}>Form Configuration</Title>
            <MultiSelect
              label="Columns to Show"
              data={columnOptions}
              value={formColumns}
              onChange={setFormColumns}
              placeholder={columnOptions.length === 0 ? 'Select a table first' : 'Select columns'}
            />
            <MultiSelect
              label="Read-only Columns"
              data={columnOptions}
              value={readonlyColumns}
              onChange={setReadonlyColumns}
              placeholder="Select columns that should be read-only"
            />
          </Stack>
        </Paper>
      )}

      {type === 'dashboard' && (
        <Paper p="md" withBorder className="glass-panel">
          <Stack gap="sm">
            <Title order={4}>Dashboard Configuration</Title>
            <Text c="dimmed" size="sm">Dashboard pages reference a dashboard by ID. Configure the dashboard in the Dashboards section.</Text>
          </Stack>
        </Paper>
      )}

      <Group justify="flex-end">
        <Button variant="subtle" onClick={() => navigate(-1)}>Cancel</Button>
        <Button className="gradient-btn" onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} disabled={!title}>
          Save
        </Button>
      </Group>
    </Stack>
  );
}
