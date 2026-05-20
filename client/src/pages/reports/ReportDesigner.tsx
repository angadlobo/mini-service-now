import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Container, Paper, Title, Text, TextInput, Textarea, Select, Switch,
  Button, Group, Stack, Grid, Badge, ActionIcon, Box,
  ScrollArea, Card, ThemeIcon, Loader, NumberInput, Tabs,
  SimpleGrid, Center,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft, IconDeviceFloppy, IconPlayerPlay, IconGripVertical,
  IconPlus, IconTrash, IconChartBar, IconChartPie, IconChartLine,
  IconChartDonut, IconTable, IconColumns, IconFilter, IconSortAscending,
  IconDownload, IconArrowsMove, IconChartArea,
  IconMathFunction, IconEye,
} from '@tabler/icons-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, PieChart, Pie, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { reportsApi } from '../../api/common.api';
import type { Report, ReportConfig } from '@shared/interfaces';

// ── Constants ──────────────────────────────────────────

const TABLE_OPTIONS = [
  { value: 'incidents', label: 'Incidents' },
  { value: 'changes', label: 'Changes' },
  { value: 'problems', label: 'Problems' },
  { value: 'cis', label: 'Configuration Items' },
  { value: 'users', label: 'Users' },
  { value: 'approvals', label: 'Approvals' },
  { value: 'sc_requests', label: 'Catalog Requests' },
  { value: 'sc_catalog_items', label: 'Catalog Items' },
  { value: 'knowledge_articles', label: 'Knowledge Articles' },
];

const CHART_TYPES = [
  { value: 'table', label: 'Table', icon: IconTable },
  { value: 'bar', label: 'Bar Chart', icon: IconChartBar },
  { value: 'line', label: 'Line Chart', icon: IconChartLine },
  { value: 'area', label: 'Area Chart', icon: IconChartArea },
  { value: 'pie', label: 'Pie Chart', icon: IconChartPie },
  { value: 'donut', label: 'Donut Chart', icon: IconChartDonut },
];

const FILTER_OPERATORS = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not Equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less or Equal' },
  { value: 'is_null', label: 'Is Empty' },
  { value: 'is_not_null', label: 'Is Not Empty' },
];

const AGGREGATE_FUNCTIONS = [
  { value: 'count', label: 'Count' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

const CHART_COLORS = [
  '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
  '#00f2fe', '#43e97b', '#fa709a', '#fee140', '#a18cd1',
  '#fbc2eb', '#8fd3f4', '#a1c4fd', '#c2e9fb', '#d4fc79',
];

interface FilterRow {
  id: string;
  column: string;
  operator: string;
  value: string;
}

interface ColumnMeta {
  name: string;
  type: string;
  nullable: boolean;
}

function formatType(t: string) {
  return t.replace('character varying', 'varchar')
    .replace('timestamp with time zone', 'timestamp')
    .replace('timestamp without time zone', 'timestamp')
    .replace('double precision', 'double');
}

// ── Draggable Column Chip (source) ─────────────────────

function DraggableSourceColumn({ col }: { col: ColumnMeta }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `source-${col.name}`,
    data: { column: col, type: 'source' },
  });

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
        padding: '6px 10px',
        borderRadius: 8,
        border: '1px solid #dee2e6',
        backgroundColor: '#fff',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 13,
      }}
      {...listeners}
      {...attributes}
    >
      <IconGripVertical size={14} style={{ color: '#adb5bd', flexShrink: 0 }} />
      <Text size="sm" fw={500} truncate style={{ flex: 1 }}>{col.name}</Text>
      <Badge size="xs" variant="light" color="gray">{formatType(col.type)}</Badge>
    </Box>
  );
}

// ── Sortable Selected Column ───────────────────────────

function SortableColumn({ id, onRemove }: { id: string; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <Box
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        padding: '6px 10px',
        borderRadius: 8,
        border: '1px solid var(--mantine-primary-color-3, #a5b4fc)',
        backgroundColor: 'var(--mantine-primary-color-0, #eef2ff)',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Box {...listeners} {...attributes} style={{ cursor: 'grab', display: 'flex' }}>
        <IconArrowsMove size={14} style={{ color: '#868e96' }} />
      </Box>
      <Text size="sm" fw={500} style={{ flex: 1 }}>{id}</Text>
      <ActionIcon size="xs" variant="subtle" color="red" onClick={onRemove}>
        <IconTrash size={12} />
      </ActionIcon>
    </Box>
  );
}

// ── Drop Zone ──────────────────────────────────────────

function DropZone({ children, id, label }: { children: React.ReactNode; id: string; label: string }) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <Box
      ref={setNodeRef}
      style={{
        minHeight: 80,
        padding: 10,
        borderRadius: 8,
        border: `2px dashed ${isOver ? 'var(--mantine-primary-color-4, #818cf8)' : '#dee2e6'}`,
        backgroundColor: isOver ? 'var(--mantine-primary-color-0, #eef2ff)' : '#f8f9fa',
        transition: 'all 150ms ease',
      }}
    >
      {React.Children.count(children) === 0 ? (
        <Center h={60}>
          <Text size="sm" c="dimmed">{label}</Text>
        </Center>
      ) : (
        <Stack gap={4}>{children}</Stack>
      )}
    </Box>
  );
}

// ── Chart Preview ──────────────────────────────────────

function ChartPreview({
  chartType,
  data,
  columns,
  config,
}: {
  chartType: string;
  data: Record<string, unknown>[];
  columns: string[];
  config: ReportConfig;
}) {
  if (!data || data.length === 0) {
    return (
      <Center h={300}>
        <Stack align="center" gap="xs">
          <IconChartBar size={48} style={{ color: '#dee2e6' }} />
          <Text c="dimmed" size="sm">Run the report to see chart preview</Text>
        </Stack>
      </Center>
    );
  }

  const isGrouped = config.group_by && config.aggregate_function;
  const labelKey = isGrouped ? config.group_by! : columns[0];
  const valueKey = isGrouped ? 'value' : columns[1] || columns[0];

  const chartData = data.slice(0, 100).map((row) => ({
    ...row,
    name: String(row[labelKey] ?? 'N/A'),
    value: Number(row[valueKey]) || 0,
  }));

  if (chartType === 'table') {
    return (
      <ScrollArea h={400}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #e9ecef', fontWeight: 600 }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 50).map((row, idx) => (
              <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? '#fff' : '#f8f9fa' }}>
                {columns.map((col) => (
                  <td key={col} style={{ padding: '6px 12px', borderBottom: '1px solid #f1f3f5', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {String(row[col] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 50 && <Text size="xs" c="dimmed" ta="center" py="xs">Showing 50 of {data.length} rows</Text>}
      </ScrollArea>
    );
  }

  if (chartType === 'bar') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <RTooltip />
          <Legend />
          <Bar dataKey="value" fill="#667eea" radius={[4, 4, 0, 0]} name={valueKey}>
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'line') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <RTooltip />
          <Legend />
          <Line type="monotone" dataKey="value" stroke="#667eea" strokeWidth={2} dot={{ r: 4 }} name={valueKey} />
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'area') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f5" />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-30} textAnchor="end" height={60} />
          <YAxis tick={{ fontSize: 12 }} />
          <RTooltip />
          <Legend />
          <Area type="monotone" dataKey="value" stroke="#667eea" fill="#667eea" fillOpacity={0.15} strokeWidth={2} name={valueKey} />
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === 'pie' || chartType === 'donut') {
    return (
      <ResponsiveContainer width="100%" height={350}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={chartType === 'donut' ? 60 : 0}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }: any) => `${name} (${(percent * 100).toFixed(0)}%)`}
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <RTooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// ── Main Component ─────────────────────────────────────

export function ReportDesigner() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tableName, setTableName] = useState('');
  const [chartType, setChartType] = useState('table');
  const [isPublic, setIsPublic] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [config, setConfig] = useState<ReportConfig>({});
  const [activeTab, setActiveTab] = useState<string | null>('columns');

  // Preview state
  const [previewData, setPreviewData] = useState<{ data: Record<string, unknown>[]; columns: string[]; total: number } | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  // Load existing report
  const { data: existingReport, isLoading: loadingReport } = useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.get(id!),
    enabled: isEdit,
  });

  // Load table columns
  const { data: availableColumns = [], isLoading: loadingColumns } = useQuery({
    queryKey: ['report-columns', tableName],
    queryFn: () => reportsApi.getTableColumns(tableName),
    enabled: !!tableName,
  });

  // Populate form when editing
  useEffect(() => {
    if (existingReport) {
      setName(existingReport.name);
      setDescription(existingReport.description || '');
      setTableName(existingReport.table_name);
      setChartType(existingReport.chart_type || 'table');
      setIsPublic(existingReport.is_public);
      setSelectedColumns(existingReport.columns || []);
      setConfig(existingReport.config || {});
      const f = existingReport.filters || {};
      const filterRows: FilterRow[] = Object.entries(f).map(([column, val]) => {
        if (typeof val === 'object' && val !== null && 'operator' in (val as any)) {
          const obj = val as any;
          return { id: crypto.randomUUID(), column, operator: obj.operator, value: String(obj.value ?? '') };
        }
        return { id: crypto.randomUUID(), column, operator: 'eq', value: String(val ?? '') };
      });
      setFilters(filterRows);
    }
  }, [existingReport]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (payload: Partial<Report>) =>
      isEdit ? reportsApi.update(id!, payload) : reportsApi.create(payload),
    onSuccess: () => {
      notifications.show({ title: 'Success', message: isEdit ? 'Report updated' : 'Report created', color: 'green' });
      navigate('/reports');
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Save failed', color: 'red' }),
  });

  // Run mutation (for preview)
  const runMutation = useMutation({
    mutationFn: async () => {
      const filtersPayload = buildFiltersPayload();
      const payload: Partial<Report> = {
        name: name || 'Untitled Report',
        description,
        table_name: tableName,
        columns: selectedColumns.length > 0 ? selectedColumns : ['*'],
        filters: filtersPayload,
        chart_type: chartType,
        config,
        is_public: isPublic,
      };
      const saved = isEdit
        ? await reportsApi.update(id!, payload)
        : await reportsApi.create(payload);
      if (!isEdit) {
        window.history.replaceState(null, '', `/reports/${saved.id}/edit`);
      }
      return reportsApi.run(saved.id);
    },
    onSuccess: (result: any) => {
      setPreviewData(result);
    },
    onError: (err: any) =>
      notifications.show({ title: 'Error', message: err.response?.data?.error || 'Run failed', color: 'red' }),
  });

  const buildFiltersPayload = useCallback((): Record<string, unknown> => {
    const result: Record<string, unknown> = {};
    for (const f of filters) {
      if (!f.column) continue;
      if (f.operator === 'is_null' || f.operator === 'is_not_null') {
        result[f.column] = { operator: f.operator, value: true };
      } else if (f.value !== '') {
        result[f.column] = { operator: f.operator, value: f.value };
      }
    }
    return result;
  }, [filters]);

  const handleSave = () => {
    if (!name.trim()) {
      notifications.show({ title: 'Validation', message: 'Report name is required', color: 'orange' });
      return;
    }
    if (!tableName) {
      notifications.show({ title: 'Validation', message: 'Data source table is required', color: 'orange' });
      return;
    }
    const payload: Partial<Report> = {
      name,
      description,
      table_name: tableName,
      columns: selectedColumns.length > 0 ? selectedColumns : ['*'],
      filters: buildFiltersPayload(),
      chart_type: chartType,
      config,
      is_public: isPublic,
    };
    saveMutation.mutate(payload);
  };

  const handleExport = async () => {
    if (!id) return;
    try {
      const response = await reportsApi.exportCsv(id);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name || 'report'}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      notifications.show({ title: 'Error', message: 'Export failed', color: 'red' });
    }
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);

    if (activeId.startsWith('source-') && over.id === 'selected-columns') {
      const colName = activeId.replace('source-', '');
      if (!selectedColumns.includes(colName)) {
        setSelectedColumns([...selectedColumns, colName]);
      }
      return;
    }

    if (!activeId.startsWith('source-') && !String(over.id).startsWith('source-')) {
      const oldIndex = selectedColumns.indexOf(activeId);
      const newIndex = selectedColumns.indexOf(String(over.id));
      if (oldIndex !== -1 && newIndex !== -1) {
        setSelectedColumns(arrayMove(selectedColumns, oldIndex, newIndex));
      }
    }
  };

  const addColumn = (colName: string) => {
    if (!selectedColumns.includes(colName)) {
      setSelectedColumns([...selectedColumns, colName]);
    }
  };

  const removeColumn = (colName: string) => {
    setSelectedColumns(selectedColumns.filter((c) => c !== colName));
  };

  const addFilter = () => {
    setFilters([...filters, { id: crypto.randomUUID(), column: '', operator: 'eq', value: '' }]);
  };

  const updateFilter = (filterId: string, field: keyof FilterRow, value: string) => {
    setFilters(filters.map((f) => f.id === filterId ? { ...f, [field]: value } : f));
  };

  const removeFilter = (filterId: string) => {
    setFilters(filters.filter((f) => f.id !== filterId));
  };

  const columnOptions = availableColumns.map((c: ColumnMeta) => ({ value: c.name, label: c.name }));
  const unselectedColumns = availableColumns.filter((c: ColumnMeta) => !selectedColumns.includes(c.name));

  if (loadingReport) {
    return <Center h={400}><Loader /></Center>;
  }

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => navigate('/reports')}>
              <IconArrowLeft size={20} />
            </ActionIcon>
            <Title order={2}>{isEdit ? 'Edit Report' : 'New Report'}</Title>
          </Group>
          <Group>
            {isEdit && (
              <Button variant="light" leftSection={<IconDownload size={16} />} onClick={handleExport}>
                Export CSV
              </Button>
            )}
            <Button
              variant="light"
              color="teal"
              leftSection={<IconPlayerPlay size={16} />}
              onClick={() => runMutation.mutate()}
              loading={runMutation.isPending}
              disabled={!tableName}
            >
              Run Preview
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={16} />}
              onClick={handleSave}
              loading={saveMutation.isPending}
            >
              Save Report
            </Button>
          </Group>
        </Group>

        <Grid gutter="md">
          {/* Left Panel */}
          <Grid.Col span={{ base: 12, md: 4 }}>
            <Stack gap="md">
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Text fw={600} size="sm">Report Details</Text>
                  <TextInput label="Name" placeholder="My Report" required value={name} onChange={(e) => setName(e.currentTarget.value)} />
                  <Textarea label="Description" placeholder="What does this report show?" autosize minRows={2} value={description} onChange={(e) => setDescription(e.currentTarget.value)} />
                  <Select
                    label="Data Source"
                    placeholder="Select a table"
                    required
                    data={TABLE_OPTIONS}
                    value={tableName}
                    onChange={(v) => {
                      setTableName(v || '');
                      setSelectedColumns([]);
                      setFilters([]);
                      setConfig({});
                      setPreviewData(null);
                    }}
                    searchable
                  />
                  <Switch label="Public report (visible to all users)" checked={isPublic} onChange={(e) => setIsPublic(e.currentTarget.checked)} />
                </Stack>
              </Paper>

              {/* Chart Type Selector */}
              <Paper p="md" withBorder>
                <Text fw={600} size="sm" mb="sm">Visualization Type</Text>
                <SimpleGrid cols={3} spacing="xs">
                  {CHART_TYPES.map((ct) => {
                    const Icon = ct.icon;
                    const isActive = chartType === ct.value;
                    return (
                      <Card
                        key={ct.value}
                        padding="xs"
                        withBorder
                        onClick={() => setChartType(ct.value)}
                        style={{
                          cursor: 'pointer',
                          borderColor: isActive ? 'var(--mantine-primary-color-5, #667eea)' : '#dee2e6',
                          backgroundColor: isActive ? 'var(--mantine-primary-color-0, #eef2ff)' : '#fff',
                          textAlign: 'center' as const,
                          transition: 'all 150ms ease',
                        }}
                      >
                        <Center>
                          <Stack gap={4} align="center">
                            <Icon size={22} color={isActive ? 'var(--color-primary-6)' : '#868e96'} />
                            <Text size="xs" fw={isActive ? 600 : 400}>{ct.label}</Text>
                          </Stack>
                        </Center>
                      </Card>
                    );
                  })}
                </SimpleGrid>
              </Paper>

              {/* Aggregation */}
              {chartType !== 'table' && tableName && (
                <Paper p="md" withBorder>
                  <Stack gap="sm">
                    <Group gap="xs">
                      <ThemeIcon size="sm" variant="light"><IconMathFunction size={14} /></ThemeIcon>
                      <Text fw={600} size="sm">Aggregation</Text>
                    </Group>
                    <Select label="Group By" placeholder="Select column" data={columnOptions} value={config.group_by || null} onChange={(v) => setConfig({ ...config, group_by: v || undefined })} clearable searchable />
                    <Select label="Function" data={AGGREGATE_FUNCTIONS} value={config.aggregate_function || null} onChange={(v) => setConfig({ ...config, aggregate_function: (v as any) || undefined })} clearable />
                    {config.aggregate_function && config.aggregate_function !== 'count' && (
                      <Select label="Aggregate Column" placeholder="Select column" data={columnOptions} value={config.aggregate_column || null} onChange={(v) => setConfig({ ...config, aggregate_column: v || undefined })} clearable searchable />
                    )}
                  </Stack>
                </Paper>
              )}

              {/* Sorting & Limits */}
              <Paper p="md" withBorder>
                <Stack gap="sm">
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light"><IconSortAscending size={14} /></ThemeIcon>
                    <Text fw={600} size="sm">Sorting & Limit</Text>
                  </Group>
                  <Select label="Sort By" placeholder="Select column" data={[...columnOptions, { value: 'value', label: 'Aggregate Value' }]} value={config.sort_by || null} onChange={(v) => setConfig({ ...config, sort_by: v || undefined })} clearable searchable />
                  <Select
                    label="Direction"
                    data={[{ value: 'asc', label: 'Ascending' }, { value: 'desc', label: 'Descending' }]}
                    value={config.sort_direction || 'asc'}
                    onChange={(v) => setConfig({ ...config, sort_direction: (v as 'asc' | 'desc') || 'asc' })}
                  />
                  <NumberInput label="Row Limit" min={1} max={5000} value={config.row_limit || 1000} onChange={(v) => setConfig({ ...config, row_limit: Number(v) || 1000 })} />
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>

          {/* Right Panel */}
          <Grid.Col span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                  <Tabs.Tab value="columns" leftSection={<IconColumns size={16} />}>
                    Columns {selectedColumns.length > 0 && <Badge size="xs" ml={4}>{selectedColumns.length}</Badge>}
                  </Tabs.Tab>
                  <Tabs.Tab value="filters" leftSection={<IconFilter size={16} />}>
                    Filters {filters.length > 0 && <Badge size="xs" ml={4}>{filters.length}</Badge>}
                  </Tabs.Tab>
                  <Tabs.Tab value="preview" leftSection={<IconEye size={16} />}>
                    Preview
                  </Tabs.Tab>
                </Tabs.List>

                {/* Columns Tab */}
                <Tabs.Panel value="columns" pt="md">
                  {!tableName ? (
                    <Paper p="xl" withBorder>
                      <Center h={200}>
                        <Text c="dimmed">Select a data source to see available columns</Text>
                      </Center>
                    </Paper>
                  ) : loadingColumns ? (
                    <Center h={200}><Loader /></Center>
                  ) : (
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                      <Grid gutter="md">
                        <Grid.Col span={6}>
                          <Paper p="sm" withBorder>
                            <Text fw={600} size="sm" mb="xs">Available Columns</Text>
                            <Text size="xs" c="dimmed" mb="sm">Click or drag columns to add them</Text>
                            <ScrollArea h={350}>
                              <Stack gap={4}>
                                {unselectedColumns.map((col: ColumnMeta) => (
                                  <Box key={col.name} onClick={() => addColumn(col.name)} style={{ cursor: 'pointer' }}>
                                    <DraggableSourceColumn col={col} />
                                  </Box>
                                ))}
                                {unselectedColumns.length === 0 && (
                                  <Text size="sm" c="dimmed" ta="center" py="lg">All columns selected</Text>
                                )}
                              </Stack>
                            </ScrollArea>
                          </Paper>
                        </Grid.Col>
                        <Grid.Col span={6}>
                          <Paper p="sm" withBorder>
                            <Group justify="space-between" mb="xs">
                              <Text fw={600} size="sm">Selected Columns</Text>
                              {selectedColumns.length > 0 && (
                                <Button size="xs" variant="subtle" color="red" onClick={() => setSelectedColumns([])}>Clear All</Button>
                              )}
                            </Group>
                            <Text size="xs" c="dimmed" mb="sm">Drag to reorder, empty = all columns</Text>
                            <DropZone id="selected-columns" label="Drop columns here or click from the left panel">
                              <SortableContext items={selectedColumns} strategy={verticalListSortingStrategy}>
                                {selectedColumns.map((col) => (
                                  <SortableColumn key={col} id={col} onRemove={() => removeColumn(col)} />
                                ))}
                              </SortableContext>
                            </DropZone>
                          </Paper>
                        </Grid.Col>
                      </Grid>
                      <DragOverlay>
                        {activeDragId && (
                          <Box style={{
                            padding: '6px 10px',
                            borderRadius: 8,
                            border: '1px solid var(--mantine-primary-color-4, #818cf8)',
                            backgroundColor: '#fff',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                            fontSize: 13,
                            fontWeight: 500,
                          }}>
                            {activeDragId.replace('source-', '')}
                          </Box>
                        )}
                      </DragOverlay>
                    </DndContext>
                  )}
                </Tabs.Panel>

                {/* Filters Tab */}
                <Tabs.Panel value="filters" pt="md">
                  <Paper p="md" withBorder>
                    <Group justify="space-between" mb="md">
                      <Text fw={600} size="sm">Filter Conditions</Text>
                      <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addFilter} disabled={!tableName}>
                        Add Filter
                      </Button>
                    </Group>
                    {filters.length === 0 ? (
                      <Center h={150}>
                        <Stack align="center" gap="xs">
                          <IconFilter size={32} style={{ color: '#dee2e6' }} />
                          <Text c="dimmed" size="sm">No filters applied - showing all records</Text>
                          <Button size="xs" variant="subtle" leftSection={<IconPlus size={14} />} onClick={addFilter} disabled={!tableName}>Add a filter</Button>
                        </Stack>
                      </Center>
                    ) : (
                      <Stack gap="xs">
                        {filters.map((f, idx) => (
                          <Box key={f.id}>
                            {idx > 0 && <Text size="xs" fw={600} c="dimmed" ta="center" py={4}>AND</Text>}
                            <Grid gutter="xs" align="flex-end">
                              <Grid.Col span={4}>
                                <Select size="sm" placeholder="Column" data={columnOptions} value={f.column || null} onChange={(v) => updateFilter(f.id, 'column', v || '')} searchable />
                              </Grid.Col>
                              <Grid.Col span={3}>
                                <Select size="sm" placeholder="Operator" data={FILTER_OPERATORS} value={f.operator} onChange={(v) => updateFilter(f.id, 'operator', v || 'eq')} />
                              </Grid.Col>
                              <Grid.Col span={4}>
                                {f.operator !== 'is_null' && f.operator !== 'is_not_null' ? (
                                  <TextInput size="sm" placeholder="Value" value={f.value} onChange={(e) => updateFilter(f.id, 'value', e.currentTarget.value)} />
                                ) : (
                                  <TextInput size="sm" disabled placeholder="(no value needed)" />
                                )}
                              </Grid.Col>
                              <Grid.Col span={1}>
                                <ActionIcon color="red" variant="subtle" onClick={() => removeFilter(f.id)}>
                                  <IconTrash size={16} />
                                </ActionIcon>
                              </Grid.Col>
                            </Grid>
                          </Box>
                        ))}
                      </Stack>
                    )}
                  </Paper>
                </Tabs.Panel>

                {/* Preview Tab */}
                <Tabs.Panel value="preview" pt="md">
                  <Paper p="md" withBorder>
                    <Group justify="space-between" mb="md">
                      <Text fw={600} size="sm">
                        Report Preview
                        {previewData && <Badge ml="xs" variant="light" size="sm">{previewData.total} records</Badge>}
                      </Text>
                      <Button size="xs" variant="light" color="teal" leftSection={<IconPlayerPlay size={14} />} onClick={() => runMutation.mutate()} loading={runMutation.isPending} disabled={!tableName}>
                        Refresh
                      </Button>
                    </Group>
                    {runMutation.isPending ? (
                      <Center h={300}><Loader /></Center>
                    ) : (
                      <ChartPreview chartType={chartType} data={previewData?.data || []} columns={previewData?.columns || []} config={config} />
                    )}
                  </Paper>
                </Tabs.Panel>
              </Tabs>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
}
