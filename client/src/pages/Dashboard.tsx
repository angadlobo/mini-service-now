import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Title, Text, Paper, Stack, Group, SimpleGrid, Box, Button, Skeleton,
  ActionIcon, Modal, Select, TextInput, NumberInput, JsonInput, Tooltip,
} from '@mantine/core';
import {
  IconEdit, IconCheck, IconPlus, IconTrash, IconGripVertical,
  IconChartBar, IconChartPie, IconChartLine, IconTable, IconHash, IconReportAnalytics,
  IconLayoutDashboard,
} from '@tabler/icons-react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { dashboardApi, reportsApi } from '../api/common.api';
import type { WidgetConfig } from '@shared/interfaces';

const CHART_COLORS = ['#667eea', '#43e97b', '#f7971e', '#ff6b6b', '#a18cd1', '#4facfe', '#718096', '#e64980'];

const GRADIENT_MAP: Record<string, string> = {
  red: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
  blue: 'linear-gradient(135deg, #4facfe, #00f2fe)',
  green: 'linear-gradient(135deg, #43e97b, #38f9d7)',
  violet: 'linear-gradient(135deg, #a18cd1, #fbc2eb)',
  orange: 'linear-gradient(135deg, #f7971e, #ffd200)',
  teal: 'linear-gradient(135deg, #11998e, #38ef7d)',
  cyan: 'linear-gradient(135deg, #667eea, #764ba2)',
  indigo: 'linear-gradient(135deg, #667eea, #764ba2)',
};

const glassStyle = {
  background: 'var(--glass-bg)',
  backdropFilter: 'var(--glass-blur)',
  WebkitBackdropFilter: 'var(--glass-blur)',
  border: '1px solid var(--glass-border)',
  boxShadow: 'var(--shadow-md)',
};

const tooltipStyle = { borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' };

// ── Widget Data Hook ──────────────────────────────────
function useWidgetData(widget: WidgetConfig) {
  return useQuery({
    queryKey: ['widget-data', widget.id, widget.type, widget.table_name, widget.report_id, widget.group_by, widget.aggregate, JSON.stringify(widget.filters)],
    queryFn: () => dashboardApi.getWidgetData(widget),
    staleTime: 60_000,
  });
}

// ── Widget Loading Skeleton ───────────────────────────
function WidgetSkeleton({ type }: { type: string }) {
  if (type === 'stat_card') {
    return (
      <Paper p="xl" radius={16} style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(118,75,162,0.2))', overflow: 'hidden' }}>
        <Skeleton height={12} width="40%" mb="md" radius="sm" />
        <Skeleton height={36} width="50%" radius="sm" />
      </Paper>
    );
  }
  return (
    <Paper p="lg" radius="lg" style={glassStyle}>
      <Skeleton height={16} width="35%" mb="md" radius="sm" />
      <Skeleton height={200} radius="md" />
    </Paper>
  );
}

// ── Widget Renderer ───────────────────────────────────
function WidgetRenderer({ widget }: { widget: WidgetConfig }) {
  const { data, isLoading } = useWidgetData(widget);

  if (isLoading) {
    return <WidgetSkeleton type={widget.type} />;
  }

  if (widget.type === 'stat_card') {
    const gradient = GRADIENT_MAP[widget.color || 'blue'] || GRADIENT_MAP.blue;
    return (
      <Paper
        p="xl" radius={16}
        className="hover-lift"
        style={{
          background: gradient,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0,0,0,0.08), 0 12px 28px rgba(0,0,0,0.1)',
        }}
      >
        <Box style={{ position: 'absolute', right: -10, bottom: -10, opacity: 0.12 }}>
          <IconHash size={96} color="white" />
        </Box>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Text size="xs" c="rgba(255,255,255,0.85)" tt="uppercase" fw={700} style={{ letterSpacing: '0.06em', fontSize: '0.7rem' }}>
            {widget.title}
          </Text>
          <Text fw={800} c="white" mt={6} style={{ lineHeight: 1.1, fontSize: '2.1rem' }}>
            {data?.value ?? 0}
          </Text>
        </div>
      </Paper>
    );
  }

  if (widget.type === 'bar_chart' || (widget.type === 'report_chart' && !widget.report_id)) {
    const chartData = (data?.data || []).map((d: any, i: number) => ({
      name: String(d[widget.group_by || Object.keys(d)[0]] ?? `Item ${i}`),
      count: Number(d.count ?? d.value ?? 0),
    }));
    return (
      <Paper p="lg" radius="lg" className="hover-glow" style={glassStyle}>
        <Text fw={600} mb="md" className="gradient-text">{widget.title}</Text>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} />
            <RTooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" fill={widget.color || '#667eea'} radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (widget.type === 'pie_chart') {
    const chartData = (data?.data || []).map((d: any, i: number) => ({
      name: String(d[widget.group_by || Object.keys(d)[0]] ?? `Item ${i}`).replace(/_/g, ' '),
      value: Number(d.count ?? d.value ?? 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    return (
      <Paper p="lg" radius="lg" className="hover-glow" style={glassStyle}>
        <Text fw={600} mb="md" className="gradient-text">{widget.title}</Text>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {chartData.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <RTooltip contentStyle={tooltipStyle} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (widget.type === 'line_chart') {
    const chartData = (data?.data || []).map((d: any, i: number) => ({
      name: String(d[widget.group_by || Object.keys(d)[0]] ?? `Item ${i}`),
      count: Number(d.count ?? d.value ?? 0),
    }));
    return (
      <Paper p="lg" radius="lg" className="hover-glow" style={glassStyle}>
        <Text fw={600} mb="md" className="gradient-text">{widget.title}</Text>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} />
            <RTooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="count" stroke={widget.color || '#667eea'} strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (widget.type === 'report_chart' && widget.report_id) {
    const rows = data?.data || [];
    const cols = data?.columns || (rows[0] ? Object.keys(rows[0]) : []);
    const groupCol = cols[0];
    const valueCol = cols.find((c: string) => c === 'value' || c === 'count') || cols[1];
    const chartData = rows.map((d: any, i: number) => ({
      name: String(d[groupCol] ?? `Item ${i}`),
      value: Number(d[valueCol] ?? 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
    }));
    return (
      <Paper p="lg" radius="lg" className="hover-glow" style={glassStyle}>
        <Text fw={600} mb="md" className="gradient-text">{widget.title}</Text>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData}>
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} />
            <RTooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" fill="#667eea" radius={[6, 6, 0, 0]}>
              {chartData.map((entry: any, index: number) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    );
  }

  if (widget.type === 'table' || widget.type === 'list') {
    const rows = data?.data || [];
    const cols = widget.columns?.length ? widget.columns : (rows[0] ? Object.keys(rows[0]).slice(0, 5) : []);
    return (
      <Paper p="lg" radius="lg" className="hover-glow" style={glassStyle}>
        <Text fw={600} mb="md" className="gradient-text">{widget.title}</Text>
        <Box style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, rgba(102,126,234,0.06), rgba(118,75,162,0.06))' }}>
                {cols.map((c: string) => (
                  <th key={c} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 20).map((row: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--msn-border-subtle)' }}>
                  {cols.map((c: string) => (
                    <td key={c} style={{ padding: '6px 12px', fontSize: 13 }}>{String(row[c] ?? '')}</td>
                  ))}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={cols.length} style={{ textAlign: 'center', padding: 16, color: '#888' }}>No data</td></tr>
              )}
            </tbody>
          </table>
        </Box>
      </Paper>
    );
  }

  return null;
}

// ── Sortable Widget Wrapper ───────────────────────────
function SortableWidget({
  widget, editing, onRemove, children,
}: {
  widget: WidgetConfig; editing: boolean; onRemove: (id: string) => void; children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    gridColumn: `span ${Math.min(widget.col_span || 1, 4)}`,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative',
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      {editing && (
        <Group
          gap={4}
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            background: 'var(--glass-bg)', borderRadius: 8, padding: '2px 4px',
          }}
        >
          <Tooltip label="Drag to reorder">
            <ActionIcon variant="subtle" size="sm" style={{ cursor: 'grab' }} {...listeners}>
              <IconGripVertical size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Remove widget">
            <ActionIcon variant="subtle" color="red" size="sm" onClick={() => onRemove(widget.id)}>
              <IconTrash size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
      {children}
    </div>
  );
}

// ── Add Widget Modal ──────────────────────────────────
const WIDGET_TYPES = [
  { value: 'stat_card', label: 'Stat Card', icon: IconHash },
  { value: 'bar_chart', label: 'Bar Chart', icon: IconChartBar },
  { value: 'pie_chart', label: 'Pie Chart', icon: IconChartPie },
  { value: 'line_chart', label: 'Line Chart', icon: IconChartLine },
  { value: 'table', label: 'Table', icon: IconTable },
  { value: 'report_chart', label: 'Report Chart', icon: IconReportAnalytics },
];

function AddWidgetModal({ opened, onClose, onAdd }: {
  opened: boolean;
  onClose: () => void;
  onAdd: (widget: WidgetConfig) => void;
}) {
  const [widgetType, setWidgetType] = useState<string>('stat_card');
  const [title, setTitle] = useState('');
  const [tableName, setTableName] = useState('incidents');
  const [aggregate, setAggregate] = useState<string>('count');
  const [aggregateField, setAggregateField] = useState('');
  const [groupBy, setGroupBy] = useState('');
  const [colSpan, setColSpan] = useState<number>(1);
  const [color, setColor] = useState('blue');
  const [filtersJson, setFiltersJson] = useState('{}');
  const [columns, setColumns] = useState('');
  const [reportId, setReportId] = useState<string | null>(null);

  const { data: reportsData } = useQuery({
    queryKey: ['reports-for-widget'],
    queryFn: () => reportsApi.list({ pageSize: 100 }),
    enabled: widgetType === 'report_chart',
  });

  const reports = reportsData?.data || [];

  const handleAdd = () => {
    let filters: Record<string, unknown> = {};
    try { filters = JSON.parse(filtersJson); } catch { /* ignore */ }

    const widget: WidgetConfig = {
      id: crypto.randomUUID(),
      type: widgetType as WidgetConfig['type'],
      title: title || 'New Widget',
      table_name: widgetType === 'report_chart' ? '' : tableName,
      col_span: colSpan,
      row_order: 999,
      color,
      aggregate: ['stat_card'].includes(widgetType) ? aggregate as any : undefined,
      aggregate_field: aggregateField || undefined,
      group_by: ['bar_chart', 'pie_chart', 'line_chart'].includes(widgetType) ? groupBy : undefined,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      columns: columns ? columns.split(',').map(c => c.trim()) : undefined,
      report_id: widgetType === 'report_chart' ? (reportId || undefined) : undefined,
    };

    onAdd(widget);
    // reset
    setTitle('');
    setTableName('incidents');
    setAggregate('count');
    setAggregateField('');
    setGroupBy('');
    setColSpan(1);
    setColor('blue');
    setFiltersJson('{}');
    setColumns('');
    setReportId(null);
    onClose();
  };

  const isChart = ['bar_chart', 'pie_chart', 'line_chart'].includes(widgetType);
  const isTable = ['table', 'list'].includes(widgetType);
  const isReport = widgetType === 'report_chart';

  return (
    <Modal opened={opened} onClose={onClose} title="Add Widget" size="md">
      <Stack gap="sm">
        <Select
          label="Widget Type"
          data={WIDGET_TYPES.map(t => ({ value: t.value, label: t.label }))}
          value={widgetType}
          onChange={(v) => v && setWidgetType(v)}
        />
        <TextInput label="Title" value={title} onChange={(e) => setTitle(e.currentTarget.value)} placeholder="Widget title" />

        {!isReport && (
          <Select
            label="Table"
            data={['incidents', 'changes', 'problems', 'cis', 'users', 'sc_requests', 'sc_catalog_items', 'kb_articles', 'approvals']}
            value={tableName}
            onChange={(v) => v && setTableName(v)}
            searchable
          />
        )}

        {widgetType === 'stat_card' && (
          <>
            <Select
              label="Aggregate"
              data={[{ value: 'count', label: 'Count' }, { value: 'sum', label: 'Sum' }, { value: 'avg', label: 'Average' }]}
              value={aggregate}
              onChange={(v) => v && setAggregate(v)}
            />
            {aggregate !== 'count' && (
              <TextInput label="Aggregate Field" value={aggregateField} onChange={(e) => setAggregateField(e.currentTarget.value)} placeholder="e.g. priority" />
            )}
          </>
        )}

        {isChart && (
          <TextInput label="Group By" value={groupBy} onChange={(e) => setGroupBy(e.currentTarget.value)} placeholder="e.g. state, priority" required />
        )}

        {isTable && (
          <TextInput label="Columns (comma-separated)" value={columns} onChange={(e) => setColumns(e.currentTarget.value)} placeholder="e.g. number, short_description, state" />
        )}

        {isReport && (
          <Select
            label="Saved Report"
            data={reports.map((r: any) => ({ value: r.id, label: r.name }))}
            value={reportId}
            onChange={setReportId}
            searchable
            placeholder="Select a report"
          />
        )}

        <NumberInput label="Column Span" value={colSpan} onChange={(v) => setColSpan(Number(v) || 1)} min={1} max={4} />

        <Select
          label="Color"
          data={['blue', 'red', 'green', 'violet', 'orange', 'teal', 'cyan', 'indigo']}
          value={color}
          onChange={(v) => v && setColor(v)}
        />

        {!isReport && (
          <JsonInput label="Filters (JSON)" value={filtersJson} onChange={setFiltersJson} minRows={2} formatOnBlur autosize />
        )}

        <Button onClick={handleAdd} fullWidth mt="sm">Add Widget</Button>
      </Stack>
    </Modal>
  );
}

// ── Main Dashboard ────────────────────────────────────
export function Dashboard() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  const { data: layout, isLoading } = useQuery<WidgetConfig[]>({
    queryKey: ['dashboard-layout'],
    queryFn: dashboardApi.getLayout,
  });

  const saveMutation = useMutation({
    mutationFn: dashboardApi.saveLayout,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard-layout'] }),
  });

  const widgets = layout || [];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = widgets.findIndex(w => w.id === active.id);
    const newIndex = widgets.findIndex(w => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const newWidgets = arrayMove(widgets, oldIndex, newIndex).map((w, i) => ({ ...w, row_order: i }));
    saveMutation.mutate(newWidgets);
  }, [widgets, saveMutation]);

  const handleRemove = useCallback((id: string) => {
    const newWidgets = widgets.filter(w => w.id !== id).map((w, i) => ({ ...w, row_order: i }));
    saveMutation.mutate(newWidgets);
  }, [widgets, saveMutation]);

  const handleAdd = useCallback((widget: WidgetConfig) => {
    const newWidgets = [...widgets, { ...widget, row_order: widgets.length }];
    saveMutation.mutate(newWidgets);
  }, [widgets, saveMutation]);

  return (
    <Stack className="fade-in">
      <Group justify="space-between">
        <Title order={2} className="page-title">Dashboard</Title>
        <Group gap="sm">
          {editing && (
            <Button
              variant="light"
              leftSection={<IconPlus size={16} />}
              onClick={() => setAddModalOpen(true)}
            >
              Add Widget
            </Button>
          )}
          <Button
            variant={editing ? 'filled' : 'light'}
            leftSection={editing ? <IconCheck size={16} /> : <IconEdit size={16} />}
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Done' : 'Edit Dashboard'}
          </Button>
        </Group>
      </Group>

      <Box pos="relative">
        {isLoading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {[...Array(4)].map((_, i) => (
              <WidgetSkeleton key={i} type="stat_card" />
            ))}
            {[...Array(2)].map((_, i) => (
              <Box key={`c-${i}`} style={{ gridColumn: 'span 2' }}>
                <WidgetSkeleton type="bar_chart" />
              </Box>
            ))}
          </div>
        )}
        {!isLoading && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={widgets.map(w => w.id)} strategy={rectSortingStrategy}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 16,
              }}>
                {widgets.map(widget => (
                  <SortableWidget key={widget.id} widget={widget} editing={editing} onRemove={handleRemove}>
                    <WidgetRenderer widget={widget} />
                  </SortableWidget>
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {widgets.length === 0 && !isLoading && (
          <Paper p="xl" radius="lg" style={{ ...glassStyle, textAlign: 'center' }}>
            <Stack align="center" gap="md" py="xl">
              <IconLayoutDashboard size={56} style={{ opacity: 0.15 }} />
              <Text fw={500} size="lg">No widgets yet</Text>
              <Text c="dimmed" size="sm">Click "Edit Dashboard" to customize your view</Text>
              <Button
                variant="light"
                leftSection={<IconEdit size={16} />}
                onClick={() => setEditing(true)}
              >
                Start Customizing
              </Button>
            </Stack>
          </Paper>
        )}
      </Box>

      <AddWidgetModal opened={addModalOpen} onClose={() => setAddModalOpen(false)} onAdd={handleAdd} />
    </Stack>
  );
}
